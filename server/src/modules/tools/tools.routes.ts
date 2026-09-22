import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { validate } from "../../middleware/validate";
import { authenticate } from "../../middleware/authenticate";
import { AppError } from "../../lib/errors";
import { asJsonMap, jsonValue } from "../../lib/json";
import { ruleEngine } from "../../services/rules/engine";

export const toolsRouter = Router();

const routeSchema = z.object({
  country: z.string().min(1),
  sector: z.string().min(1),
  volumeAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  volumeCurrency: z.enum(["AZN", "USD", "EUR"]),
  territory: z.string().min(1),
  hasESignature: z.boolean().optional(),
  nationalityType: z.enum(["resident", "non_resident"]).optional(),
  guestSessionToken: z.string().optional(),
});

const incentiveSchema = z.object({
  sector: z.string().min(1),
  activity: z.string().optional(),
  volumeAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  volumeCurrency: z.enum(["AZN", "USD", "EUR"]),
  territory: z.string().min(1),
  inAgropark: z.boolean().optional(),
  inIndustrialPark: z.boolean().optional(),
  guestSessionToken: z.string().optional(),
});

const kyaSchema = z.object({
  sector: z.string().min(1),
  territory: z.string().min(1),
  volumeAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  volumeCurrency: z.enum(["AZN", "USD", "EUR"]),
  foreignWorkers: z.number().int().nonnegative().optional(),
  description: z.string().max(4000).optional(),
  confirmedParameters: z.boolean(),
  siParameters: z.record(z.unknown()).optional(),
});

async function appendProfileTool(
  userId: string,
  key: "savedRoute" | "savedIncentive",
  entry: Record<string, unknown>,
) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Profile not found");
  const contacts = asJsonMap(profile.contacts);
  const list = Array.isArray(contacts[key]) ? (contacts[key] as unknown[]) : [];
  contacts[key] = [...list, entry];
  await prisma.profile.update({ where: { id: profile.id }, data: { contacts: jsonValue(contacts) } });
  return profile;
}

toolsRouter.post(
  "/route/calculate",
  validate(routeSchema),
  asyncHandler(async (req, res) => {
    const result = await ruleEngine.route(req.body);
    res.json({ data: { ...result.output, ruleVersion: result.ruleVersion } });
  }),
);

toolsRouter.post(
  "/route/save",
  authenticate,
  validate(routeSchema),
  asyncHandler(async (req, res) => {
    const result = await ruleEngine.route(req.body);
    const id = randomUUID();
    await appendProfileTool(req.user!.id, "savedRoute", {
      id,
      input: req.body,
      output: result.output,
      ruleSetId: result.ruleSetId,
      ruleVersion: result.ruleVersion,
      savedAt: new Date().toISOString(),
    });
    res.status(201).json({ data: { id, ...result.output, ruleVersion: result.ruleVersion } });
  }),
);

toolsRouter.post(
  "/incentives/evaluate",
  validate(incentiveSchema),
  asyncHandler(async (req, res) => {
    const result = await ruleEngine.incentive(req.body);
    res.json({ data: { ...result.output, ruleVersion: result.ruleVersion } });
  }),
);

toolsRouter.post(
  "/incentives/save",
  authenticate,
  validate(incentiveSchema),
  asyncHandler(async (req, res) => {
    const result = await ruleEngine.incentive(req.body);
    const id = randomUUID();
    await appendProfileTool(req.user!.id, "savedIncentive", {
      id,
      input: req.body,
      output: result.output,
      ruleSetId: result.ruleSetId,
      ruleVersion: result.ruleVersion,
      savedAt: new Date().toISOString(),
    });
    res.status(201).json({ data: { id, ...result.output, ruleVersion: result.ruleVersion } });
  }),
);

toolsRouter.post(
  "/kya/evaluate",
  validate(kyaSchema),
  asyncHandler(async (req, res) => {
    if (req.body.siParameters && !req.body.confirmedParameters) {
      res.json({
        data: {
          needsConfirmation: true,
          extracted: req.body.siParameters,
          message: "Review and confirm extracted parameters before rules run.",
        },
      });
      return;
    }
    const result = await ruleEngine.kya(req.body);
    res.json({ data: result });
  }),
);

toolsRouter.post(
  "/kya/save",
  authenticate,
  validate(kyaSchema),
  asyncHandler(async (req, res) => {
    const result = await ruleEngine.kya(req.body);
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) throw AppError.notFound("Profile not found");
    const saved = await prisma.kyaResult.create({
      data: {
        profileId: profile.id,
        inputParameters: req.body,
        procedures: result.procedures,
        ruleSetId: result.ruleSetId,
        ruleVersion: result.ruleVersion,
      },
    });
    res.status(201).json({ data: { id: saved.id, ...result } });
  }),
);

toolsRouter.get(
  "/kya/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const row = await prisma.kyaResult.findUnique({ where: { id: req.params.id } });
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!row || row.profileId !== profile?.id) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "KYA result not found" } });
      return;
    }
    res.json({ data: row });
  }),
);
