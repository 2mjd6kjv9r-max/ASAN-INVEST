import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { AppError } from "../../lib/errors";
import { assertLinkedApplication, nextApplicationNumber } from "../../domain/application";
import { assertIdentificationLevel } from "../../domain/identification";
import { toInvestorStatus } from "../../domain/status";
import { addWorkingDays, canTransition } from "../../domain/workflow";
import { writeAudit } from "../../lib/audit";
import { emitNotification } from "../../services/notifications/dispatcher";
import { complianceService } from "../../services/compliance/screening";
import type { CaseInternalStatus } from "@prisma/client";

export const applicationsRouter = Router();

const createSchema = z.object({
  typeCode: z.string().min(1),
  projectId: z.string().uuid().optional(),
  answers: z.record(z.unknown()).default({}),
  source: z.enum(["passport_stage", "opportunity_card", "new_application"]).default("new_application"),
  stageId: z.string().uuid().optional(),
  opportunityId: z.string().uuid().optional(),
});

async function ownedProfile(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Profile not found");
  return profile;
}

function investorDto(application: {
  id: string;
  publicNumber: string | null;
  answers: unknown;
  snapshot: unknown;
  source: string;
  submittedAt: Date | null;
  type: { code: string; nameEn: string; nameAz: string };
  case: { internalStatus: CaseInternalStatus; finalResult: unknown; internalNotes?: string | null } | null;
}) {
  return {
    id: application.id,
    publicNumber: application.publicNumber,
    type: application.type,
    source: application.source,
    answers: application.answers,
    snapshot: application.snapshot,
    submittedAt: application.submittedAt,
    investorStatus: application.case
      ? toInvestorStatus(application.case.internalStatus)
      : toInvestorStatus("draft_unsubmitted"),
    nextStep: application.case?.internalStatus === "awaiting_info" ? "Provide the requested information" : undefined,
    finalResult: application.case?.finalResult,
  };
}

applicationsRouter.get(
  "/application-types",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.applicationType.findMany({ orderBy: { code: "asc" } });
    res.json({ data: rows });
  }),
);

applicationsRouter.post(
  "/applications",
  authenticate,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const type = await prisma.applicationType.findUnique({ where: { code: req.body.typeCode } });
    if (!type) throw AppError.notFound("Application type not found");
    if (type.workflow !== "standard") {
      throw AppError.badRequest("WORKFLOW_PHASE2", "This application type is not in Phase 1");
    }
    assertLinkedApplication(req.body.projectId, profile.id);
    if (type.isCapitalStep) {
      const preview = await prisma.incentiveResult.findFirst({ where: { profileId: profile.id } });
      if (!preview) {
        throw AppError.badRequest(
          "CAPITAL_BLOCKED",
          "Complete the incentive preview before opening a capital transfer step",
        );
      }
    }
    const application = await prisma.application.create({
      data: {
        typeId: type.id,
        answers: req.body.answers,
        projectId: req.body.projectId,
        profileId: profile.id,
        source: req.body.source,
        stageId: req.body.stageId,
        opportunityId: req.body.opportunityId,
      },
      include: { type: true, case: true },
    });
    if (req.body.stageId) {
      await prisma.stage.update({ where: { id: req.body.stageId }, data: { applicationId: application.id } });
    }
    res.status(201).json({ data: investorDto(application) });
  }),
);

applicationsRouter.get(
  "/applications",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const rows = await prisma.application.findMany({
      where: { profileId: profile.id },
      include: { type: true, case: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: rows.map(investorDto) });
  }),
);

applicationsRouter.get(
  "/applications/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { type: true, case: true, messages: { where: { internal: false }, orderBy: { createdAt: "asc" } } },
    });
    if (!row || row.profileId !== profile.id) throw AppError.notFound("Application not found");
    res.json({ data: { ...investorDto(row), messages: row.messages } });
  }),
);

applicationsRouter.patch(
  "/applications/:id",
  authenticate,
  validate(z.object({ answers: z.record(z.unknown()) })),
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({ where: { id: req.params.id }, include: { type: true, case: true } });
    if (!row || row.profileId !== profile.id) throw AppError.notFound("Application not found");
    if (row.snapshot) throw AppError.conflict("Submitted snapshots cannot be changed", "SNAPSHOT_IMMUTABLE");
    const updated = await prisma.application.update({
      where: { id: row.id },
      data: { answers: req.body.answers },
      include: { type: true, case: true },
    });
    res.json({ data: investorDto(updated) });
  }),
);

applicationsRouter.post(
  "/applications/:id/validate",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({ where: { id: req.params.id }, include: { type: true } });
    if (!row || row.profileId !== profile.id) throw AppError.notFound("Application not found");
    const fields = row.type.fields as Array<{ name: string; required?: boolean }>;
    const answers = row.answers as Record<string, unknown>;
    const missing = fields.filter((field) => field.required && (answers[field.name] === undefined || answers[field.name] === "")).map((field) => field.name);
    if (missing.length) {
      throw AppError.badRequest("VALIDATION_ERROR", "Complete the required fields before submit", missing.map((name) => ({ path: name, message: "This field is required" })));
    }
    res.json({ data: { valid: true } });
  }),
);

applicationsRouter.post(
  "/applications/:id/submit",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { type: true, project: true },
    });
    if (!row || row.profileId !== profile.id) throw AppError.notFound("Application not found");
    if (row.snapshot) throw AppError.conflict("Application already submitted", "ALREADY_SUBMITTED");
    assertIdentificationLevel(req.user!.identificationLevel, row.type.identificationLevel);

    const year = new Date().getUTCFullYear();
    const count = await prisma.application.count({ where: { publicNumber: { startsWith: `INV-${year}-` } } });
    const publicNumber = nextApplicationNumber(year, count + 1);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const nonResident = user?.locale !== undefined && profile.country && profile.country !== "AZ";
    if (nonResident && !user?.screeningOutcome) {
      await complianceService.screenUser(req.user!.id, req.user!.id);
    }

    const slaDueAt = addWorkingDays(new Date(), row.type.slaWorkingDays);
    const needsEval = row.type.requiresEvaluation;
    const submitted = await prisma.$transaction(async (tx) => {
      const application = await tx.application.update({
        where: { id: row.id },
        data: {
          publicNumber,
          submittedAt: new Date(),
          snapshot: { answers: row.answers, profileVersion: profile.version, submittedAt: new Date().toISOString() },
        },
        include: { type: true },
      });
      const createdCase = await tx.case.create({
        data: {
          applicationId: application.id,
          internalStatus: needsEval ? "in_evaluation" : "registered",
          slaDueAt,
          category: {
            type: row.type.code,
            sector: row.project?.sector ?? profile.sector,
            region: row.project?.territory ?? null,
          },
          caseManagerId: row.project?.permanentCaseManagerId ?? null,
        },
      });
      if (needsEval) {
        await tx.evaluation.create({
          data: {
            caseId: createdCase.id,
            userId: req.user!.id,
            route: "expert",
            dueAt: slaDueAt,
          },
        });
      }
      return { application, createdCase };
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "application.submit",
      objectType: "application",
      objectId: row.id,
      after: { publicNumber, status: submitted.createdCase.internalStatus },
    });
    await emitNotification({
      userId: req.user!.id,
      eventType: "application.submitted",
      vars: { number: publicNumber, status: "submitted" },
      mandatory: true,
    });
    res.status(201).json({
      data: investorDto({ ...submitted.application, case: submitted.createdCase }),
    });
  }),
);

applicationsRouter.post(
  "/applications/:id/withdraw",
  authenticate,
  validate(z.object({ reason: z.string().min(3).max(500) })),
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { type: true, case: true },
    });
    if (!row || row.profileId !== profile.id) throw AppError.notFound("Application not found");
    if (!row.case) throw AppError.badRequest("NOT_SUBMITTED", "Drafts can be deleted; submitted applications are withdrawn");
    if (!canTransition(row.case.internalStatus, "withdrawn", ["investor"])) {
      throw AppError.conflict("This application cannot be withdrawn in its current status", "WITHDRAW_BLOCKED");
    }
    await prisma.$transaction([
      prisma.application.update({
        where: { id: row.id },
        data: { withdrawnAt: new Date(), withdrawReason: req.body.reason },
      }),
      prisma.case.update({ where: { id: row.case.id }, data: { internalStatus: "withdrawn" } }),
    ]);
    await writeAudit({
      actorId: req.user!.id,
      action: "application.withdraw",
      objectType: "application",
      objectId: row.id,
      after: { reason: req.body.reason },
    });
    res.status(204).send();
  }),
);
