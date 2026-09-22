import type { User, UserRoleAssignment, Profile } from "@prisma/client";
import {
  AuthProvider,
  IdentificationLevel,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { env } from "../../config/env";
import { writeAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/passwords";
import { prisma } from "../../lib/prisma";
import { asJsonMap } from "../../lib/json";
import { activeRoles, requiresTwoFactor, userWithRolesInclude } from "../../lib/roles";
import {
  generateNumericCode,
  hashToken,
  signAccessToken,
  signPurposeToken,
  signRefreshToken,
  verifyPurposeToken,
  verifyRefreshToken,
} from "../../lib/tokens";
import { emailService } from "../../integrations/email/email.service";
import { asanLoginStub } from "../../integrations/asan-imza/asan-imza.stub";

type AuthUser = User & { profile: Profile | null; roleAssignments: UserRoleAssignment[] };

function issueAccess(user: AuthUser) {
  return signAccessToken({
    sub: user.id,
    roles: activeRoles(user.roleAssignments),
    email: user.email,
    identificationLevel: user.identificationLevel,
  });
}

function issueRefresh(userId: string) {
  return signRefreshToken(userId);
}

async function copyGuestSession(userId: string, profileId: string, guestSessionToken?: string) {
  if (!guestSessionToken) return;
  const session = await prisma.guestSession.findUnique({ where: { id: guestSessionToken } });
  if (!session || session.expiresAt < new Date()) return;
  const answers = asJsonMap(session.answers);
  const existing = await prisma.profile.findUnique({ where: { id: profileId } });
  const contacts = { ...asJsonMap(existing?.contacts), guestAnswers: session.answers };
  await prisma.profile.update({
    where: { id: profileId },
    data: { contacts },
  });
  await prisma.guestSession.update({
    where: { id: session.id },
    data: { convertedUserId: userId, email: answers.email as string | undefined },
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
        locale: input.locale ?? "az",
        status: UserStatus.ACTIVE,
        authProvider: AuthProvider.EMAIL,
        emailVerifiedAt: autoVerify ? new Date() : null,
        identificationLevel: IdentificationLevel.BASIC,
        consents: input.consents ?? {},
        consentVersion: input.consents?.version ?? null,
        consentedAt: input.consents ? new Date() : null,
        profile: { create: {} },
        roleAssignments: { create: { role: UserRole.INVESTOR } },
      },
      include: userWithRolesInclude,
    });

    if (!autoVerify) {
      const token = signPurposeToken({ sub: user.id, typ: "email_verify" }, "24h");
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
    const refresh = issueRefresh(user.id);
    return { user, accessToken, refresh };
  },

  async login(input: { email: string; password: string; userAgent?: string; ipAddress?: string }) {
    const user = await prisma.user.findUnique({ where: { email: input.email }, include: userWithRolesInclude });
    if (!user || !user.passwordHash) {
      throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }
    const matches = await verifyPassword(input.password, user.passwordHash);
    if (!matches) throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    if (user.status === UserStatus.DISABLED) throw AppError.forbidden("Account is disabled", "ACCOUNT_DISABLED");
    if (!user.emailVerifiedAt && env.REQUIRE_EMAIL_VERIFICATION) {
      throw AppError.forbidden("Email verification required", "EMAIL_NOT_VERIFIED");
    }

    const roles = activeRoles(user.roleAssignments);
    if (requiresTwoFactor(roles)) {
      const code = env.NODE_ENV === "test" ? "123456" : generateNumericCode();
      const challengeId = signPurposeToken(
        { sub: user.id, typ: "two_factor", codeHash: hashToken(code) },
        "10m",
      );
      await emailService.send(user.email, "ASAN Invest sign-in code", `Sign-in code (logged only): ${code}`);
      return { twoFactorRequired: true as const, challengeId };
    }

    const accessToken = issueAccess(user);
    const refresh = issueRefresh(user.id);
    await writeAudit({
      actorId: user.id,
      action: "auth.login",
      objectType: "user",
      objectId: user.id,
      ipAddress: input.ipAddress,
    });
    return { twoFactorRequired: false as const, user, accessToken, refresh };
  },

  async verifyTwoFactor(challengeId: string, code: string) {
    let payload;
    try {
      payload = verifyPurposeToken(challengeId, "two_factor");
    } catch {
      throw AppError.unauthorized("Two-factor challenge is invalid", "TWO_FACTOR_INVALID");
    }
    if (!payload.codeHash || hashToken(code) !== payload.codeHash) {
      throw AppError.unauthorized("Two-factor code is invalid", "TWO_FACTOR_INVALID");
    }
    const updated = await prisma.user.update({
      where: { id: payload.sub },
      data: { twoFactorEnabled: true },
      include: userWithRolesInclude,
    });
    const accessToken = issueAccess(updated);
    const refresh = issueRefresh(updated.id);
    await writeAudit({
      actorId: updated.id,
      action: "auth.2fa",
      objectType: "user",
      objectId: updated.id,
    });
    return { user: updated, accessToken, refresh };
  },

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw AppError.unauthorized("Refresh token missing", "REFRESH_MISSING");
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw AppError.unauthorized("Refresh token is invalid", "REFRESH_INVALID");
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: userWithRolesInclude,
    });
    if (!user || user.status === UserStatus.DISABLED) {
      throw AppError.unauthorized("Refresh token is invalid", "REFRESH_INVALID");
    }
    const accessToken = issueAccess(user);
    const refresh = issueRefresh(user.id);
    return { user, accessToken, refresh };
  },

  async logout(_refreshToken: string | undefined) {
    return;
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: userWithRolesInclude });
    if (!user) throw AppError.unauthorized();
    return user;
  },

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const token = signPurposeToken({ sub: user.id, typ: "password_reset" }, "1h");
    await emailService.send(user.email, "Reset your ASAN Invest password", `Reset token (logged only): ${token}`);
  },

  async resetPassword(token: string, password: string) {
    let payload;
    try {
      payload = verifyPurposeToken(token, "password_reset");
    } catch {
      throw AppError.badRequest("RESET_INVALID", "Reset token is invalid or expired");
    }
    await prisma.user.update({
      where: { id: payload.sub },
      data: { passwordHash: await hashPassword(password) },
    });
  },

  async verifyEmail(token: string) {
    let payload;
    try {
      payload = verifyPurposeToken(token, "email_verify");
    } catch {
      throw AppError.badRequest("VERIFY_INVALID", "Verification token is invalid or expired");
    }
    await prisma.user.update({
      where: { id: payload.sub },
      data: { emailVerifiedAt: new Date(), identificationLevel: IdentificationLevel.BASIC },
    });
  },

  asanLogin() {
    return asanLoginStub.start();
  },
};
