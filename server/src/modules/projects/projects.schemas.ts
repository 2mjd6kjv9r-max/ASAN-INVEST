import { z } from "zod";

export const uuidParam = z.object({ id: z.string().uuid() });
export const slugParam = z.object({ slug: z.string().min(1).max(120) });

export const listProjectsQuery = z.object({
  sector: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const amountString = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/);

export const projectWriteSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    titleAz: z.string().min(3).max(200),
    titleEn: z.string().min(3).max(200),
    summaryAz: z.string().min(10).max(500),
    summaryEn: z.string().min(10).max(500),
    descriptionAz: z.string().min(20).max(8000),
    descriptionEn: z.string().min(20).max(8000),
    agencyId: z.string().uuid(),
    sectorId: z.string().uuid(),
    region: z.string().min(2).max(80),
    targetAmount: amountString,
    minInvestment: amountString,
    maxInvestment: amountString.nullable().optional(),
    fundingStartsAt: z.string().datetime(),
    fundingEndsAt: z.string().datetime(),
    expectedReturnNote: z.string().max(500).nullable().optional(),
  })
  .partial();

export const createProjectSchema = projectWriteSchema.required({
  slug: true,
  titleAz: true,
  titleEn: true,
  summaryAz: true,
  summaryEn: true,
  descriptionAz: true,
  descriptionEn: true,
  agencyId: true,
  sectorId: true,
  region: true,
  targetAmount: true,
  minInvestment: true,
  fundingStartsAt: true,
  fundingEndsAt: true,
});
