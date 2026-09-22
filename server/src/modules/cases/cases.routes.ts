import { Router } from "express";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { AppError } from "../../lib/errors";
import { canTransition, slaState } from "../../domain/workflow";
import { toInvestorStatus } from "../../domain/status";
import { writeAudit } from "../../lib/audit";
import { emitNotification } from "../../services/notifications/dispatcher";

export const casesRouter = Router();

const staff: UserRole[] = ["case_manager", "supervisor", "sysadmin"];

function scopedCaseWhere(user: { id: string; roles: UserRole[]; institutionId: string | null } | undefined) {
  if (!user) return {};
  if (user.roles.includes("sysadmin") || user.roles.includes("supervisor") || user.roles.includes("analyst")) {
    return {};
  }
  if (user.roles.includes("case_manager")) return { caseManagerId: user.id };
  if (user.roles.includes("institution_rep") && user.institutionId) {
    return { tasks: { some: { institutionId: user.institutionId } } };
  }
  return { application: { profile: { userId: user.id } } };
}

casesRouter.get(
  "/cases",
  authenticate,
  authorize("case_manager", "supervisor", "sysadmin", "institution_rep", "analyst"),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await prisma.case.findMany({
      where: {
        ...scopedCaseWhere(req.user),
        ...(status ? { internalStatus: status as never } : {}),
      },
      include: {
        application: { include: { type: true, profile: { include: { user: true } } } },
        caseManager: { select: { id: true, email: true } },
        tasks: true,
      },
      orderBy: { slaDueAt: "asc" },
    });
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        internalStatus: row.internalStatus,
        investorStatus: toInvestorStatus(row.internalStatus),
        slaDueAt: row.slaDueAt,
        slaState: slaState(row.slaDueAt),
        escalatedAt: row.escalatedAt,
        publicNumber: row.application.publicNumber,
        type: row.application.type.code,
        caseManager: row.caseManager,
        taskCount: row.tasks.length,
      })),
    });
  }),
);

casesRouter.get(
  "/cases/:id",
  authenticate,
  authorize("case_manager", "supervisor", "sysadmin", "institution_rep", "evaluator"),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: {
        application: { include: { type: true, profile: true } },
        tasks: { include: { institution: true } },
        evaluations: true,
        extraInfoRequests: { orderBy: { createdAt: "asc" } },
        caseManager: { select: { id: true, email: true } },
      },
    });
    if (!row) throw AppError.notFound("Case not found");
    if (req.user!.roles.includes("institution_rep") && req.user!.institutionId) {
      const allowed = row.tasks.some((task) => task.institutionId === req.user!.institutionId);
      if (!allowed) throw AppError.forbidden();
    }
    res.json({ data: row });
  }),
);

casesRouter.post(
  "/cases/:id/transition",
  authenticate,
  authorize(...staff),
  validate(z.object({ to: z.string(), reason: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { application: { include: { profile: true } } },
    });
    if (!row) throw AppError.notFound("Case not found");
    if (!canTransition(row.internalStatus, req.body.to, req.user!.roles)) {
      throw AppError.forbidden("This status change is not allowed for your role");
    }
    const updated = await prisma.case.update({
      where: { id: row.id },
      data: { internalStatus: req.body.to },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "case.transition",
      objectType: "case",
      objectId: row.id,
      before: { internalStatus: row.internalStatus },
      after: { internalStatus: updated.internalStatus, reason: req.body.reason },
    });
    if (row.application.profile) {
      const user = await prisma.user.findUnique({ where: { id: row.application.profile.userId } });
      if (user) {
        await emitNotification({
          userId: user.id,
          eventType: "application.status",
          vars: { number: row.application.publicNumber ?? row.id, status: toInvestorStatus(updated.internalStatus) },
        });
      }
    }
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/assign",
  authenticate,
  authorize("supervisor", "sysadmin"),
  validate(z.object({ caseManagerId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const updated = await prisma.case.update({
      where: { id: req.params.id },
      data: { caseManagerId: req.body.caseManagerId, internalStatus: "assigned" },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "case.assign",
      objectType: "case",
      objectId: updated.id,
      after: { caseManagerId: req.body.caseManagerId },
    });
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/extra-info",
  authenticate,
  authorize("case_manager", "supervisor", "institution_rep", "evaluator"),
  validate(
    z.object({
      fields: z.array(z.object({ name: z.string(), hint: z.string().optional() })).min(1),
      dueAt: z.string().datetime(),
      templateHint: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { application: { include: { profile: true } } },
    });
    if (!row) throw AppError.notFound("Case not found");
    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.extraInfoRequest.create({
        data: {
          caseId: row.id,
          requestedBy: req.user!.id,
          fields: req.body.fields,
          dueAt: new Date(req.body.dueAt),
          templateHint: req.body.templateHint,
        },
      });
      await tx.case.update({
        where: { id: row.id },
        data: { internalStatus: "awaiting_info", slaPaused: true, slaPausedAt: new Date() },
      });
      return created;
    });
    if (row.application.profile) {
      await emitNotification({
        userId: row.application.profile.userId,
        eventType: "application.extra_info",
        vars: { number: row.application.publicNumber ?? row.id, status: "awaiting_you" },
        mandatory: true,
      });
    }
    res.status(201).json({ data: request });
  }),
);

casesRouter.post(
  "/cases/:id/extra-info/:requestId/respond",
  authenticate,
  validate(z.object({ response: z.record(z.unknown()) })),
  asyncHandler(async (req, res) => {
    const request = await prisma.extraInfoRequest.findUnique({
      where: { id: req.params.requestId },
      include: { case: { include: { application: { include: { profile: true } } } } },
    });
    if (!request || request.caseId !== req.params.id) throw AppError.notFound();
    if (request.case.application.profile?.userId !== req.user!.id) throw AppError.forbidden();
    const updated = await prisma.extraInfoRequest.update({
      where: { id: request.id },
      data: { response: req.body.response, respondedAt: new Date() },
    });
    await prisma.case.update({
      where: { id: request.caseId },
      data: { internalStatus: "in_review", slaPaused: false, slaPausedAt: null },
    });
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/close",
  authenticate,
  authorize("case_manager", "supervisor"),
  validate(
    z.object({
      decision: z.enum(["approved", "rejected"]),
      reasoning: z.string().min(3),
      legalBasis: z.string().optional(),
      nextSteps: z.string().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({ where: { id: req.params.id }, include: { tasks: true } });
    if (!row) throw AppError.notFound("Case not found");
    const openTasks = row.tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled");
    if (openTasks.length) {
      throw AppError.conflict("All tasks must be completed before closing the case", "TASKS_OPEN");
    }
    if (req.body.decision === "rejected" && !req.user!.roles.includes("supervisor")) {
      throw AppError.forbidden("Rejection requires supervisor confirmation");
    }
    const updated = await prisma.case.update({
      where: { id: row.id },
      data: {
        internalStatus: req.body.decision === "approved" ? "completed" : "rejected",
        finalResult: {
          decision: req.body.decision,
          reasoning: req.body.reasoning,
          legalBasis: req.body.legalBasis,
          nextSteps: req.body.nextSteps,
          complaintHint: req.body.decision === "rejected" ? "Use Şikayət et to create a supervisor task." : undefined,
        },
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "case.close",
      objectType: "case",
      objectId: row.id,
      after: updated.finalResult as object,
    });
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/reopen",
  authenticate,
  authorize("supervisor", "sysadmin"),
  validate(z.object({ reason: z.string().min(3) })),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({ where: { id: req.params.id } });
    if (!row) throw AppError.notFound("Case not found");
    if (row.internalStatus !== "completed" && row.internalStatus !== "rejected") {
      throw AppError.badRequest("NOT_CLOSED", "Only closed cases can be reopened");
    }
    const updated = await prisma.case.update({
      where: { id: row.id },
      data: { internalStatus: "assigned", reopenReason: req.body.reason },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "case.reopen",
      objectType: "case",
      objectId: row.id,
      after: { reason: req.body.reason },
    });
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/extend",
  authenticate,
  authorize("supervisor", "sysadmin"),
  validate(z.object({ slaDueAt: z.string().datetime(), reason: z.string().min(3) })),
  asyncHandler(async (req, res) => {
    const updated = await prisma.case.update({
      where: { id: req.params.id },
      data: { slaDueAt: new Date(req.body.slaDueAt), extensionReason: req.body.reason, escalatedAt: null },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "case.extend",
      objectType: "case",
      objectId: updated.id,
      after: { slaDueAt: updated.slaDueAt, reason: req.body.reason },
    });
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/complaint",
  authenticate,
  validate(z.object({ description: z.string().min(10) })),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { application: { include: { profile: true } } },
    });
    if (!row) throw AppError.notFound("Case not found");
    if (row.application.profile?.userId !== req.user!.id) throw AppError.forbidden();
    const supervisor = await prisma.user.findFirst({ where: { roles: { has: "supervisor" } } });
    const institution = await prisma.institution.findFirst();
    if (!supervisor || !institution) throw AppError.badRequest("NOT_CONFIGURED", "Supervisor queue is not configured");
    const task = await prisma.task.create({
      data: {
        caseId: row.id,
        institutionId: institution.id,
        assigneeUserId: supervisor.id,
        title: "Phase 1 complaint (Şikayət et)",
        dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        opinion: req.body.description,
      },
    });
    res.status(201).json({
      data: {
        taskId: task.id,
        externalComplaintUrl: "https://www.economy.gov.az/",
        message: "A supervisor task was created. The Ombudsman workflow opens in Phase 2.",
      },
    });
  }),
);

casesRouter.post(
  "/cases/:id/tasks",
  authenticate,
  authorize("case_manager", "supervisor"),
  validate(
    z.object({
      institutionId: z.string().uuid(),
      title: z.string().min(3),
      dueAt: z.string().datetime(),
      assigneeUserId: z.string().uuid().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.create({
      data: {
        caseId: req.params.id,
        institutionId: req.body.institutionId,
        title: req.body.title,
        dueAt: new Date(req.body.dueAt),
        assigneeUserId: req.body.assigneeUserId,
      },
    });
    await prisma.case.update({ where: { id: req.params.id }, data: { internalStatus: "interagency" } });
    res.status(201).json({ data: task });
  }),
);

casesRouter.post(
  "/tasks/:id/complete",
  authenticate,
  authorize("institution_rep", "case_manager", "supervisor"),
  validate(z.object({ opinion: z.string().min(3) })),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw AppError.notFound("Task not found");
    if (req.user!.roles.includes("institution_rep") && task.institutionId !== req.user!.institutionId) {
      throw AppError.forbidden();
    }
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: "completed", opinion: req.body.opinion, completedAt: new Date() },
    });
    res.json({ data: updated });
  }),
);

