import type { Response } from "express";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { AppError, conflict, unauthorized } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import {
  REFRESH_COOKIE,
  REFRESH_TTL_MS_EXPORT,
  createOpaqueToken,
  createRefreshToken,
  sha256,
  signAccessToken,
} from "../../lib/tokens";
import { sendEmail } from "../../integrations/email/stub";
import { serializeUser } from "../../serializers";
import type { UserRole } from "@prisma/client";

const REFRESH_PATH = "/api/v1/auth";

export async function register(input: {
  email: string;
  password: string;
  nationalityType: "azerbaijani_citizen" | "foreign_citizen";
  preferredLocale?: "az" | "en";
  firstName: string;
  lastName: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("EMAIL_TAKEN", "An account with this email already exists");

  const passwordHash = await hashPassword(input.password);
  const requireVerify = env.REQUIRE_EMAIL_VERIFICATION;

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: "investor",
      status: requireVerify ? "pending_verification" : "active",
      nationalityType: input.nationalityType,
      preferredLocale: input.preferredLocale ?? "az",
      emailVerifiedAt: requireVerify ? null : new Date(),
      profile: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
          countryOfCitizenship: input.nationalityType === "azerbaijani_citizen" ? "AZ" : null,
        },
      },
    },
    include: { profile: true },
  });

  if (requireVerify) {
    const raw = createOpaqueToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    sendEmail(user.email, "Verify your ASAN INVEST email", `Verification token: ${raw}`);
  }

  return issueSession(user.id, user.role, serializeUser(user, user.profile));
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });
  if (!user?.passwordHash) throw unauthorized("Invalid email or password");
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid email or password");
  if (user.status === "suspended") {
    throw new AppError(403, "SUSPENDED", "This account is suspended");
  }
  if (user.status === "pending_verification") {
    throw new AppError(403, "EMAIL_UNVERIFIED", "Verify your email before signing in");
  }
  return issueSession(user.id, user.role, serializeUser(user, user.profile));
}

export async function refresh(rawToken: string | undefined) {
  if (!rawToken) throw unauthorized("Refresh token missing");
  const tokenHash = sha256(rawToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: { include: { profile: true } } },
  });
  if (!stored) throw unauthorized("Refresh token invalid");

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  if (stored.user.status === "suspended") {
    throw new AppError(403, "SUSPENDED", "This account is suspended");
  }

  return issueSession(stored.user.id, stored.user.role, serializeUser(stored.user, stored.user.profile));
}

export async function logout(rawToken: string | undefined) {
  if (!rawToken) return;
  await prisma.refreshToken.updateMany({
    where: { tokenHash: sha256(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, kycDocuments: { orderBy: { createdAt: "desc" } } },
  });
  if (!user) throw unauthorized();
  return serializeUser(user, user.profile, { kycDocuments: user.kycDocuments });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  const raw = createOpaqueToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  sendEmail(user.email, "Reset your ASAN INVEST password", `Reset token: ${raw}`);
}

export async function resetPassword(token: string, password: string) {
  const stored = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!stored) throw new AppError(400, "INVALID_TOKEN", "Reset token is invalid or expired");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: stored.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}

export function setRefreshCookie(res: Response, raw: string) {
  res.cookie(REFRESH_COOKIE, raw, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: REFRESH_PATH,
    maxAge: REFRESH_TTL_MS_EXPORT,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: REFRESH_PATH });
}

async function issueSession(userId: string, role: UserRole, user: unknown) {
  const accessToken = signAccessToken({ sub: userId, role });
  const refresh = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: sha256(refresh.raw),
      expiresAt: refresh.expiresAt,
    },
  });
  return { user, accessToken, refreshToken: refresh.raw };
}
