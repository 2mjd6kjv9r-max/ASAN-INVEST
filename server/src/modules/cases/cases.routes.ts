import { Router } from "express";
import { z } from "zod";
import {
  CaseInternalStatus,
  ClassificationKind,
  UserRole,
} from "@prisma/client";
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
import { hasRole } from "../../lib/roles";

export const casesRouter = Router();

const staff: UserRole[] = [UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN];

function scopedCaseWhere(user: { id: string; roles: UserRole[]; institutionId: string | null } | undefined) {
  if (!user) return {};
  if (hasRole(user.roles, UserRole.SYSADMIN, UserRole.SUPERVISOR, UserRole.ANALYST)) {
    return {};
  }
  if (hasRole(user.roles, UserRole.CASE_MANAGER)) return { caseManagerId: user.id };
  if (hasRole(user.roles, UserRole.INSTITUTION_REP) && user.institutionId) {
    return { tasks: { some: { institutionId: user.institutionId } } };
  }
  return { application: { profile: { userId: user.id } } };
}

casesRouter.get(
  "/cases",
  authenticate,
  authorize(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN, UserRole.INSTITUTION_REP, UserRole.ANALYST),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const rows = await prisma.case.findMany({
      where: {
        ...scopedCaseWhere(req.user),
        ...(status ? { internalStatus: status as CaseInternalStatus } : {}),
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
        slaState: slaState(row.slaDueAt, new Date(), row.pausedAt),
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
  authorize(
    UserRole.CASE_MANAGER,
    UserRole.SUPERVISOR,
    UserRole.SYSADMIN,
    UserRole.INSTITUTION_REP,
    UserRole.EVALUATOR,
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: {
        application: { include: { type: true, profile: true, messages: true } },
        tasks: { include: { institution: true } },
        evaluations: true,
        caseManager: { select: { id: true, email: true } },
      },
    });
    if (!row) throw AppError.notFound("Case not found");
    if (hasRole(req.user!.roles, UserRole.INSTITUTION_REP) && req.user!.institutionId) {
      const allowed = row.tasks.some((task) => task.institutionId === req.user!.institutionId);
      if (!allowed) throw AppError.forbidden();
    }
    const extraInfoTasks = row.tasks.filter((task) => task.status === "extra_info");
    res.json({
      data: {
        ...row,
        extraInfoRequests: extraInfoTasks,
      },
    });
  }),
);

casesRouter.post(
  "/cases/:id/transition",
  authenticate,
  authorize(...staff),
  validate(z.object({ to: z.nativeEnum(CaseInternalStatus), reason: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { application: { include: { profile: true, project: { include: { profile: true } } } } },
    });
    if (!row) throw AppError.notFound("Case not found");
    if (!canTransition(row.internalStatus, req.body.to, req.user!.roles)) {
      throw AppError.forbidden("This status change is not allowed for your role");
    }
    const pause = await prisma.workflowStatus.findUnique({
      where: {
        workflow_internalStatus: { workflow: "STANDARD", internalStatus: req.body.to },
      },
    });
    const updated = await prisma.case.update({
      where: { id: row.id },
      data: {
        internalStatus: req.body.to,
        pausedAt: pause?.pauseSlaOnThisStatus ? new Date() : null,
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "case.transition",
      objectType: "case",
      objectId: row.id,
      before: { internalStatus: row.internalStatus },
      after: { internalStatus: updated.internalStatus, reason: req.body.reason },
    });
    const investorUserId = row.application.profile?.userId ?? row.application.project?.profile.userId;
    if (investorUserId) {
      await emitNotification({
        userId: investorUserId,
        eventType: "application.status_changed",
        vars: {
          number: row.application.publicNumber ?? row.id,
          status: toInvestorStatus(updated.internalStatus),
        },
      });
    }
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/assign",
  authenticate,
  authorize(UserRole.SUPERVISOR, UserRole.SYSADMIN),
  validate(z.object({ caseManagerId: z.string().uuid() })),
  asyncHandler(async (req, res) => {
    const updated = await prisma.case.update({
      where: { id: req.params.id },
      data: {
        caseManagerId: req.body.caseManagerId,
        internalStatus: CaseInternalStatus.ASSIGNED_FOR_EXECUTION,
      },
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
  authorize(UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.INSTITUTION_REP, UserRole.EVALUATOR),
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
      include: { application: { include: { profile: true, project: { include: { profile: true } } } } },
    });
    if (!row) throw AppError.notFound("Case not found");
    const institution =
      (row.institutionId
        ? await prisma.classification.findUnique({ where: { id: row.institutionId } })
        : null) ??
      (await prisma.classification.findFirst({
        where: { kind: ClassificationKind.INSTITUTION, isActive: true },
      }));
    if (!institution) throw AppError.badRequest("NOT_CONFIGURED", "No institution classification is seeded");
    const request = await prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          caseId: row.id,
          institutionId: institution.id,
          assigneeUserId: req.user!.id,
          dueAt: new Date(req.body.dueAt),
          status: "extra_info",
          opinion: JSON.stringify({
            fields: req.body.fields,
            templateHint: req.body.templateHint,
            requestedBy: req.user!.id,
          }),
        },
      });
      await tx.case.update({
        where: { id: row.id },
        data: {
          internalStatus: CaseInternalStatus.WAITING_ADDITIONAL_INFO,
          pausedAt: new Date(),
        },
      });
      return created;
    });
    const investorUserId = row.application.profile?.userId ?? row.application.project?.profile.userId;
    if (investorUserId) {
      await emitNotification({
        userId: investorUserId,
        eventType: "application.additional_info_requested",
        vars: { number: row.application.publicNumber ?? row.id, status: "WAITING_YOUR_RESPONSE" },
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
    const task = await prisma.task.findUnique({
      where: { id: req.params.requestId },
      include: {
        case: { include: { application: { include: { profile: true, project: { include: { profile: true } } } } } },
      },
    });
    if (!task || task.caseId !== req.params.id || task.status !== "extra_info") throw AppError.notFound();
    const ownerId =
      task.case.application.profile?.userId ?? task.case.application.project?.profile.userId;
    if (ownerId !== req.user!.id) throw AppError.forbidden();
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: "extra_info_responded",
        opinion: JSON.stringify({ previous: task.opinion, response: req.body.response }),
      },
    });
    await prisma.case.update({
      where: { id: task.caseId },
      data: { internalStatus: CaseInternalStatus.UNDER_REVIEW, pausedAt: null },
    });
    res.json({ data: updated });
  }),
);

casesRouter.post(
  "/cases/:id/close",
  authenticate,
  authorize(UserRole.CASE_MANAGER, UserRole.SUPERVISOR),
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
    const openTasks = row.tasks.filter(
      (task) => !["completed", "cancelled", "extra_info_responded"].includes(task.status),
    );
    if (openTasks.length) {
      throw AppError.conflict("All tasks must be completed before closing the case", "TASKS_OPEN");
    }
    if (req.body.decision === "rejected" && !hasRole(req.user!.roles, UserRole.SUPERVISOR, UserRole.SYSADMIN)) {
      throw AppError.forbidden("Rejection requires supervisor confirmation");
    }
    const updated = await prisma.case.update({
      where: { id: row.id },
      data: {
        internalStatus:
          req.body.decision === "approved" ? CaseInternalStatus.COMPLETED : CaseInternalStatus.REJECTED,
        closedAt: new Date(),
        finalResult: {
          decision: req.body.decision,
          reasoning: req.body.reasoning,
          legalBasis: req.body.legalBasis,
          nextSteps: req.body.nextSteps,
          complaintHint:
            req.body.decision === "rejected" ? "Use Şikayət et to create a supervisor task." : undefined,
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
  authorize(UserRole.SUPERVISOR, UserRole.SYSADMIN),
  validate(z.object({ reason: z.string().min(3) })),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({ where: { id: req.params.id } });
    if (!row) throw AppError.notFound("Case not found");
    if (row.internalStatus !== CaseInternalStatus.COMPLETED && row.internalStatus !== CaseInternalStatus.REJECTED) {
      throw AppError.badRequest("NOT_CLOSED", "Only closed cases can be reopened");
    }
    const updated = await prisma.case.update({
      where: { id: row.id },
      data: {
        internalStatus: CaseInternalStatus.UNDER_REVIEW,
        reopenedAt: new Date(),
        reopenedById: req.user!.id,
        reopenReason: req.body.reason,
        closedAt: null,
      },
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
  authorize(UserRole.SUPERVISOR, UserRole.SYSADMIN),
  validate(z.object({ slaDueAt: z.string().datetime(), reason: z.string().min(3) })),
  asyncHandler(async (req, res) => {
    const updated = await prisma.case.update({
      where: { id: req.params.id },
      data: { slaDueAt: new Date(req.body.slaDueAt), escalatedAt: null },
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
  "/cases/sla/tick",
  authenticate,
  authorize(UserRole.SUPERVISOR, UserRole.SYSADMIN),
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const due = await prisma.case.findMany({
      where: {
        slaDueAt: { lt: now },
        pausedAt: null,
        escalatedAt: null,
        internalStatus: {
          notIn: [
            CaseInternalStatus.COMPLETED,
            CaseInternalStatus.REJECTED,
            CaseInternalStatus.WITHDRAWN,
            CaseInternalStatus.ARCHIVED,
            CaseInternalStatus.DRAFT,
          ],
        },
      },
      include: { application: true, caseManager: true },
    });
    const ids: string[] = [];
    for (const row of due) {
      await prisma.case.update({ where: { id: row.id }, data: { escalatedAt: now } });
      if (row.caseManagerId) {
        await emitNotification({
          userId: row.caseManagerId,
          eventType: "sla.escalated",
          vars: { number: row.application.publicNumber ?? row.id },
        });
      }
      ids.push(row.id);
    }
    res.json({ data: { escalated: ids.length, ids } });
  }),
);

casesRouter.post(
  "/cases/:id/complaint",
  authenticate,
  validate(z.object({ description: z.string().min(10) })),
  asyncHandler(async (req, res) => {
    const row = await prisma.case.findUnique({
      where: { id: req.params.id },
      include: { application: { include: { profile: true, project: { include: { profile: true } } } } },
    });
    if (!row) throw AppError.notFound("Case not found");
    const ownerId = row.application.profile?.userId ?? row.application.project?.profile.userId;
    if (ownerId !== req.user!.id) throw AppError.forbidden();
    const supervisorGrant = await prisma.userRoleAssignment.findFirst({
      where: { role: UserRole.SUPERVISOR, validTo: null },
    });
    const institution = await prisma.classification.findFirst({
      where: { kind: ClassificationKind.INSTITUTION, isActive: true },
    });
    if (!supervisorGrant || !institution) {
      throw AppError.badRequest("NOT_CONFIGURED", "Supervisor queue is not configured");
    }
    const task = await prisma.task.create({
      data: {
        caseId: row.id,
        institutionId: institution.id,
        assigneeUserId: supervisorGrant.userId,
        dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "complaint",
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
  authorize(UserRole.CASE_MANAGER, UserRole.SUPERVISOR),
  validate(
    z.object({
      institutionId: z.string().uuid(),
      dueAt: z.string().datetime(),
      assigneeUserId: z.string().uuid().optional(),
      notes: z.string().min(3).optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.create({
      data: {
        caseId: req.params.id,
        institutionId: req.body.institutionId,
        dueAt: new Date(req.body.dueAt),
        assigneeUserId: req.body.assigneeUserId,
        status: "open",
        opinion: req.body.notes,
      },
    });
    await prisma.case.update({
      where: { id: req.params.id },
      data: { internalStatus: CaseInternalStatus.INTER_AGENCY_COORDINATION },
    });
    res.status(201).json({ data: task });
  }),
);

casesRouter.post(
  "/tasks/:id/complete",
  authenticate,
  authorize(UserRole.INSTITUTION_REP, UserRole.CASE_MANAGER, UserRole.SUPERVISOR),
  validate(z.object({ opinion: z.string().min(3) })),
  asyncHandler(async (req, res) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) throw AppError.notFound("Task not found");
    if (hasRole(req.user!.roles, UserRole.INSTITUTION_REP) && task.institutionId !== req.user!.institutionId) {
      throw AppError.forbidden();
    }
    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { status: "completed", opinion: req.body.opinion },
    });
    res.json({ data: updated });
  }),
);
