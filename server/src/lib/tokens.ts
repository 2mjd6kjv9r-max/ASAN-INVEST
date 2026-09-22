import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "@prisma/client";

const ACCESS_TTL_SECONDS = 15 * 60;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type AccessPayload = {
  sub: string;
  role: UserRole;
};

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TTL_SECONDS });
}

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
}

export function createRefreshToken(): { raw: string; expiresAt: Date } {
  return {
    raw: crypto.randomBytes(48).toString("hex"),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  };
}

export function createOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const REFRESH_COOKIE = "refreshToken";
export const REFRESH_TTL_MS_EXPORT = REFRESH_TTL_MS;
