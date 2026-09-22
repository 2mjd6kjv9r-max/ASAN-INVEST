import { Router } from "express";
import { z } from "zod";
import { CaseInternalStatus, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { AppError } from "../../lib/errors";
import { hasRole } from "../../lib/roles";

export const evaluationsRouter = Router();

evaluationsRouter.get(
  "/evaluations",
  authenticate,
  authorize(UserRole.EVALUATOR, UserRole.SUPERVISOR, UserRole.SYSADMIN),
  asyncHandler(async (req, res) => {
    const rows = await prisma.evaluation.findMany({
      where: hasRole(req.user!.roles, UserRole.EVALUATOR)
        ? { OR: [{ evaluatorId: req.user!.id }, { evaluatorId: null }] }
        : undefined,
      include: {
        case: { include: { application: true } },
        subject: {
          select: {
            id: true,
            email: true,
            pepSanctionsStatus: true,
            pepSanctionsCheckedAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json({ data: rows });
  }),
);

evaluationsRouter.post(
  "/evaluations/:id/opinion",
  authenticate,
  authorize(UserRole.EVALUATOR, UserRole.SUPERVISOR),
  validate(z.object({ opinion: z.string().min(3), continueCase: z.boolean().default(true) })),
  asyncHandler(async (req, res) => {
    const row = await prisma.evaluation.findUnique({ where: { id: req.params.id } });
    if (!row) throw AppError.notFound("Evaluation not found");
    const updated = await prisma.$transaction(async (tx) => {
      const evaluation = await tx.evaluation.update({
        where: { id: row.id },
        data: {
          opinion: req.body.opinion,
          evaluatorId: req.user!.id,
          status: "completed",
          startedAt: row.startedAt ?? new Date(),
        },
      });
      await tx.case.update({
        where: { id: row.caseId },
        data: {
          internalStatus: req.body.continueCase
            ? CaseInternalStatus.ASSIGNED_FOR_EXECUTION
            : CaseInternalStatus.WAITING_ADDITIONAL_INFO,
        },
      });
      return evaluation;
    });
    res.json({ data: updated });
  }),
);

evaluationsRouter.post(
  "/compliance/screen/:userId",
  authenticate,
  authorize(UserRole.EVALUATOR, UserRole.SUPERVISOR, UserRole.SYSADMIN),
  asyncHandler(async (req, res) => {
    const { complianceService } = await import("../../services/compliance/screening");
    const result = await complianceService.screenUser(req.params.userId, req.user!.id);
    res.json({ data: result });
  }),
);
