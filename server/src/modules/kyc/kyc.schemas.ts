import { z } from "zod";

const emptyToNull = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null));

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  patronymic: emptyToNull,
  dateOfBirth: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value)),
  countryOfCitizenship: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.toUpperCase() : null))
    .refine((value) => value === null || value.length === 2),
  fin: emptyToNull,
  passportNumber: emptyToNull,
  phone: emptyToNull,
  addressLine: emptyToNull,
  city: emptyToNull,
  country: emptyToNull,
  preferredLocale: z.enum(["az", "en"]).optional(),
});

export const kycTypeSchema = z.enum(["id_card", "passport", "residence_permit", "other"]);
export const kycDecisionSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
});
