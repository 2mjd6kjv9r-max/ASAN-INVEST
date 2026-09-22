import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { forbidden, unauthorized } from "../lib/errors";
import { verifyAccessToken } from "../lib/tokens";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  nationalityType: string;
  preferredLocale: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.user = await loadUserFromHeader(req);
  } catch {
    req.user = undefined;
  }
  next();
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const user = await loadUserFromHeader(req);
    if (!user) throw unauthorized();
    if (user.status === "suspended") throw forbidden("Account is suspended");
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

async function loadUserFromHeader(req: Request): Promise<AuthUser | undefined> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return undefined;
  const payload = verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) throw unauthorized("Account no longer exists");
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    nationalityType: user.nationalityType,
    preferredLocale: user.preferredLocale,
  };
}
