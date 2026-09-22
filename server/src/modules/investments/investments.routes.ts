import { Router } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { param } from "../../lib/params";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { uuidParam } from "../projects/projects.schemas";
import { createInvestmentSchema, rejectInvestmentSchema } from "./investments.schemas";
import * as investments from "./investments.service";

export const investorInvestmentRouter = Router();
investorInvestmentRouter.use(requireAuth);

investorInvestmentRouter.get(
  "/me/investments",
  asyncHandler(async (req, res) => {
    res.json(await investments.listMine(req.user!.id, req.query as Record<string, unknown>));
  }),
);

investorInvestmentRouter.get(
  "/me/investments/:id",
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await investments.getMine(req.user!.id, param(req.params.id)) });
  }),
);

investorInvestmentRouter.post(
  "/projects/:id/investments",
  validate({ params: uuidParam, body: createInvestmentSchema }),
  asyncHandler(async (req, res) => {
    const data = await investments.createInvestment({
      userId: req.user!.id,
      userStatus: req.user!.status,
      projectId: param(req.params.id),
      amountRaw: req.body.amount,
      idempotencyKey: req.header("Idempotency-Key") ?? undefined,
    });
    res.status(201).json({ data });
  }),
);

investorInvestmentRouter.post(
  "/investments/:id/cancel",
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await investments.cancel(req.user!.id, param(req.params.id)) });
  }),
);

investorInvestmentRouter.post(
  "/investments/:id/pay-stub",
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    const succeed = req.body?.succeed !== false;
    res.json({ data: await investments.payStub(req.user!.id, param(req.params.id), succeed) });
  }),
);

export const adminInvestmentRouter = Router();
adminInvestmentRouter.use(requireAuth, requireRoles("operator", "admin"));

adminInvestmentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await investments.listAdmin(req.query as Record<string, unknown>));
  }),
);

adminInvestmentRouter.post(
  "/:id/confirm",
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await investments.confirm(req.user!.id, param(req.params.id)) });
  }),
);

adminInvestmentRouter.post(
  "/:id/reject",
  validate({ params: uuidParam, body: rejectInvestmentSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await investments.reject(req.user!.id, param(req.params.id), req.body.reason) });
  }),
);
