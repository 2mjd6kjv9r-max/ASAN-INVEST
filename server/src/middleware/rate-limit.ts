import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { AppError } from "../lib/errors";

/** NFR-02 bot hook: silent drop when a honeypot field is filled. */
export function honeypot(req: Request, _res: Response, next: NextFunction) {
  const body = req.body as { website?: unknown } | undefined;
  if (body && typeof body.website === "string" && body.website.length > 0) {
    next(AppError.tooMany("Too many requests"));
    return;
  }
  next();
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many authentication attempts. Try again later.",
    },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: env.NODE_ENV === "test" ? 1000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Try again later.",
    },
  },
});
