import { z } from "zod";

export const createInvestmentSchema = z.object({
  amount: z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/),
});

export const rejectInvestmentSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});
