import jwt, { type SignOptions } from "jsonwebtoken";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";
import type { IdentificationLevel, UserRole } from "@prisma/client";

export type AccessTokenPayload = {
  sub: string;
  roles: UserRole[];
  email: string;
  identificationLevel: IdentificationLevel;
  typ: "access";
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

export function generateNumericCode(length = 6): string {
  const digits = "0123456789";
  let out = "";
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    out += digits[bytes[i] % 10];
  }
  return out;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "typ">): string {
  return jwt.sign({ ...payload, typ: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded !== "object" || decoded === null || decoded.typ !== "access" || !decoded.sub) {
    throw new Error("Invalid access token");
  }
  return decoded as AccessTokenPayload;
}

export function parseDurationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) throw new Error(`Unsupported duration: ${duration}`);
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit as keyof typeof multipliers];
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
