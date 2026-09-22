import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(320).transform((value) => value.trim().toLowerCase()),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/\d/, "Password must include a number"),
  locale: z.enum(["az", "en", "ru", "tr", "ar"]).optional(),
  guestSessionToken: z.string().min(8).optional(),
  consents: z
    .object({
      version: z.string().min(1),
      personalData: z.literal(true),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1).max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/\d/),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(6),
});

export const twoFactorSchema = z.object({
  challengeId: z.string().uuid(),
  code: z.string().length(6),
});
