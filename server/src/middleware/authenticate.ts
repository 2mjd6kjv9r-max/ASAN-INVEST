import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../lib/errors";
import { verifyAccessToken } from "../lib/tokens";
import { prisma } from "../lib/prisma";
import { requiresTwoFactor } from "../domain/identification";

function readBearer(req: Request): string | null {
  const header = req.header("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readBearer(req);
    if (!token) throw AppError.unauthorized();
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        roles: true,
        status: true,
        identificationLevel: true,
        institutionId: true,
        twoFactorEnabled: true,
      },
    });
    if (!user) throw AppError.unauthorized("Account no longer exists");
    if (user.status === "disabled") throw AppError.forbidden("Account is disabled", "ACCOUNT_DISABLED");
    if (requiresTwoFactor(user.roles) && !user.twoFactorEnabled && env.NODE_ENV === "production") {
      throw AppError.forbidden("Two-factor authentication is required for internal roles", "TWO_FACTOR_REQUIRED");
    }
    req.user = {
      id: user.id,
      email: user.email,
      roles: user.roles,
      identificationLevel: user.identificationLevel,
      institutionId: user.institutionId,
    };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(AppError.unauthorized("Invalid or expired access token", "TOKEN_INVALID"));
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/v1/auth",
};
