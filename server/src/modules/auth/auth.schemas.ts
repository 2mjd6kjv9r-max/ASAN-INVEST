import { z } from "zod";

export const nationalityType = z.enum(["azerbaijani_citizen", "foreign_citizen"]);
export const locale = z.enum(["az", "en"]);

export const registerSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(10).max(100),
  nationalityType,
  preferredLocale: locale.optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
});

export const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(10).max(100),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(10),
});
