import type { User } from "@prisma/client";
import { env } from "../../config/env";
import { writeAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/passwords";
import { prisma } from "../../lib/prisma";
import {
  generateNumericCode,
  generateOpaqueToken,
  hashToken,
  parseDurationToMs,
  signAccessToken,
} from "../../lib/tokens";
import { emailService } from "../../integrations/email/email.service";
import { requiresTwoFactor } from "../../domain/identification";
import { asanLoginStub } from "../../integrations/asan-imza/asan-imza.stub";

const INCLUDE = { profile: true } as const;

function issueAccess(user: User) {
  return signAccessToken({
    sub: user.id,
    roles: user.roles,
    email: user.email,
    identificationLevel: user.identificationLevel,
  });
}

async function persistRefreshToken(userId: string, userAgent?: string) {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN));
  await prisma.refreshToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent ?? null },
  });
  return { token, expiresAt };
}

async function copyGuestSession(userId: string, profileId: string, guestSessionToken?: string) {
  if (!guestSessionToken) return;
  const session = await prisma.guestSession.findUnique({ where: { tokenHash: hashToken(guestSessionToken) } });
  if (!session || session.expiresAt < new Date()) return;
  const answers = session.answers as Record<string, unknown>;
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      guestAnswers: session.answers === null ? undefined : session.answers,
      country: (answers.country as string | undefined) ?? undefined,
      sector: (answers.sector as string | undefined) ?? undefined,
    },
  });
  await writeAudit({
    actorId: userId,
    action: "auth.guest_session_copied",
    objectType: "profile",
    objectId: profileId,
    after: { copied: true },
  });
}

export const authService = {
  async register(input: {
    email: string;
    password: string;
    locale?: string;
    guestSessionToken?: string;
    consents?: { version: string; personalData: true };
    ipAddress?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw AppError.conflict("An account with this email already exists", "EMAIL_TAKEN");

    const autoVerify = !env.REQUIRE_EMAIL_VERIFICATION;
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash: await hashPassword(input.password),
        roles: ["investor"],
        locale: input.locale ?? "az",
        status: autoVerify ? "active" : "pending_verification",
        emailVerifiedAt: autoVerify ? new Date() : null,
        identificationLevel: autoVerify ? "basic" : "basic",
        consents: (input.consents ?? undefined) as object | undefined,
        consentVersion: input.consents?.version ?? null,
        consentedAt: input.consents ? new Date() : null,
        profile: { create: {} },
      },
      include: INCLUDE,
    });

    if (!autoVerify) {
      const token = generateOpaqueToken();
      await prisma.emailVerificationToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      });
      await emailService.send(user.email, "Verify your ASAN Invest account", `Verification token (logged only): ${token}`);
    }

    if (user.profile) {
      await copyGuestSession(user.id, user.profile.id, input.guestSessionToken);
    }

    await writeAudit({
      actorId: user.id,
      action: "auth.register",
      objectType: "user",
      objectId: user.id,
      ipAddress: input.ipAddress,
    });

    const accessToken = issueAccess(user);
    const refresh = await persistRefreshToken(user.id);
    return { user, accessToken, refresh };
  },

  async login(input: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: INCLUDE });
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }
    const matches = await verifyPassword(input.password, user.passwordHash);
    if (!matches) throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    if (user.status === "disabled") throw AppError.forbidden("Account is disabled", "ACCOUNT_DISABLED");
    if (user.status === "pending_verification" && env.REQUIRE_EMAIL_VERIFICATION) {
      throw AppError.forbidden("Email verification required", "EMAIL_NOT_VERIFIED");
    }

    if (requiresTwoFactor(user.roles)) {
      const code = env.NODE_ENV === "test" ? "123456" : generateNumericCode();
      const challenge = await prisma.twoFactorChallenge.create({
        data: {
          userId: user.id,
          codeHash: hashToken(code),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      });
      await emailService.send(user.email, "ASAN Invest sign-in code", `Sign-in code (logged only): ${code}`);
      return { twoFactorRequired: true as const, challengeId: challenge.id };
    }

    const accessToken = issueAccess(user);
    const refresh = await persistRefreshToken(user.id, input.userAgent);
    await writeAudit({
      actorId: user.id,
      action: "auth.login",
      objectType: "user",
      objectId: user.id,
      ipAddress: input.ipAddress,
    });
    return { twoFactorRequired: false as const, user, accessToken, refresh };
  },

  async verifyTwoFactor(challengeId: string, code: string, userAgent?: string) {
    const challenge = await prisma.twoFactorChallenge.findUnique({
      where: { id: challengeId },
      include: { user: { include: INCLUDE } },
    });
    if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) {
      throw AppError.unauthorized("Two-factor challenge is invalid", "TWO_FACTOR_INVALID");
    }
    if (hashToken(code) !== challenge.codeHash) {
      throw AppError.unauthorized("Two-factor code is invalid", "TWO_FACTOR_INVALID");
    }
    await prisma.twoFactorChallenge.update({ where: { id: challenge.id }, data: { usedAt: new Date() } });
    if (!challenge.user.twoFactorEnabled) {
      await prisma.user.update({ where: { id: challenge.userId }, data: { twoFactorEnabled: true } });
    }
    const user = { ...challenge.user, twoFactorEnabled: true };
    const accessToken = issueAccess(user);
    const refresh = await persistRefreshToken(user.id, userAgent);
    return { user, accessToken, refresh };
  },

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw AppError.unauthorized("Refresh token missing", "REFRESH_MISSING");
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: { include: INCLUDE } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw AppError.unauthorized("Refresh token is invalid", "REFRESH_INVALID");
    }
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const accessToken = issueAccess(stored.user);
    const refresh = await persistRefreshToken(stored.user.id, stored.userAgent ?? undefined);
    return { user: stored.user, accessToken, refresh };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: INCLUDE });
    if (!user) throw AppError.unauthorized();
    return user;
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = generateOpaqueToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await emailService.send(user.email, "Reset your ASAN Invest password", `Reset token (logged only): ${token}`);
  },

  async resetPassword(token: string, password: string) {
    const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw AppError.badRequest("RESET_INVALID", "Reset token is invalid or expired");
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: stored.userId }, data: { passwordHash: await hashPassword(password) } }),
      prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  },

  async verifyEmail(token: string) {
    const stored = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw AppError.badRequest("VERIFY_INVALID", "Verification token is invalid or expired");
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: stored.userId },
        data: { status: "active", emailVerifiedAt: new Date(), identificationLevel: "basic" },
      }),
      prisma.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    ]);
  },

  asanLogin() {
    return asanLoginStub.start();
  },
};
