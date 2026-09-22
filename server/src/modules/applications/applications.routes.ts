import { Router } from "express";
import { z } from "zod";
import {
  ApplicationSource,
  CaseInternalStatus,
  InvestorVisibleStatus,
  WorkflowKind,
} from "@prisma/client";
import type { ApplicationType, Case } from "@prisma/client";
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
import { asJsonMap, jsonValue } from "../../lib/json";
import { emitNotification } from "../../services/notifications/dispatcher";
import { complianceService } from "../../services/compliance/screening";

export const applicationsRouter = Router();

const createSchema = z.object({
  typeCode: z.string().min(1),
  projectId: z.string().uuid().optional(),
  answers: z.record(z.unknown()).default({}),
  source: z.nativeEnum(ApplicationSource).default(ApplicationSource.NEW_APPLICATION),
  stageId: z.string().uuid().optional(),
});

async function ownedProfile(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Profile not found");
  return profile;
}

async function readDraftAnswers(profileId: string, applicationId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  const contacts = asJsonMap(profile?.contacts);
  const drafts = asJsonMap(contacts.draftApplications as never);
  const answers = drafts[applicationId];
  return answers && typeof answers === "object" ? (answers as Record<string, unknown>) : {};
}

async function writeDraftAnswers(profileId: string, applicationId: string, answers: Record<string, unknown>) {
  const profile = await prisma.profile.findUnique({ where: { id: profileId } });
  if (!profile) return;
  const contacts = asJsonMap(profile.contacts);
  const drafts = asJsonMap(contacts.draftApplications as never);
  drafts[applicationId] = answers;
  contacts.draftApplications = drafts;
  await prisma.profile.update({ where: { id: profile.id }, data: { contacts: jsonValue(contacts) } });
}

function investorDto(application: {
  id: string;
  publicNumber: string | null;
  source: ApplicationSource;
  submittedAt: Date | null;
  snapshot: unknown;
  type: Pick<ApplicationType, "code" | "names">;
  case: Pick<Case, "internalStatus" | "finalResult"> | null;
  answers?: Record<string, unknown>;
}) {
  return {
    id: application.id,
    publicNumber: application.publicNumber,
    type: application.type,
    source: application.source,
    answers: application.snapshot
      ? asJsonMap(application.snapshot as never).answers ?? application.snapshot
      : application.answers ?? {},
    snapshot: application.snapshot,
    submittedAt: application.submittedAt,
    investorStatus: application.case
      ? toInvestorStatus(application.case.internalStatus)
      : InvestorVisibleStatus.DRAFT,
    nextStep:
      application.case?.internalStatus === CaseInternalStatus.WAITING_ADDITIONAL_INFO
        ? "Provide the requested information"
        : undefined,
    finalResult: application.case?.finalResult,
  };
}

applicationsRouter.get(
  "/application-types",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.applicationType.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
    });
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
    if (type.workflow !== WorkflowKind.STANDARD) {
      throw AppError.badRequest("WORKFLOW_PHASE2", "This application type is not in Phase 1");
    }

    const projectId = req.body.projectId as string | undefined;
    const profileId = projectId ? null : profile.id;
    assertLinkedApplication(projectId, profileId);

    if (projectId) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project || project.profileId !== profile.id) throw AppError.forbidden();
    }

    const formSchema = asJsonMap(type.formSchema);
    if (formSchema.requiresIncentivePreview) {
      const contacts = asJsonMap(profile.contacts);
      const incentives = contacts.savedIncentive;
      if (!Array.isArray(incentives) || incentives.length === 0) {
        throw AppError.badRequest(
          "CAPITAL_BLOCKED",
          "Complete the incentive preview before opening a capital transfer step",
        );
      }
    }

    const application = await prisma.application.create({
      data: {
        typeId: type.id,
        projectId,
        profileId,
        source: req.body.source,
      },
      include: { type: true, case: true },
    });
    if (req.body.stageId) {
      await prisma.stage.update({ where: { id: req.body.stageId }, data: { applicationId: application.id } });
    }
    if (Object.keys(req.body.answers ?? {}).length) {
      await writeDraftAnswers(profile.id, application.id, req.body.answers);
    }
    const answers = await readDraftAnswers(profile.id, application.id);
    res.status(201).json({ data: investorDto({ ...application, answers }) });
  }),
);

applicationsRouter.get(
  "/applications",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const rows = await prisma.application.findMany({
      where: { OR: [{ profileId: profile.id }, { project: { profileId: profile.id } }] },
      include: { type: true, case: true },
      orderBy: { createdAt: "desc" },
    });
    const data = [];
    for (const row of rows) {
      const answers = row.snapshot ? undefined : await readDraftAnswers(profile.id, row.id);
      data.push(investorDto({ ...row, answers }));
    }
    res.json({ data });
  }),
);

applicationsRouter.get(
  "/applications/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: {
        type: true,
        case: true,
        project: true,
        messages: { where: { isInternal: false }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!row) throw AppError.notFound("Application not found");
    const owns = row.profileId === profile.id || row.project?.profileId === profile.id;
    if (!owns) throw AppError.notFound("Application not found");
    const answers = row.snapshot ? undefined : await readDraftAnswers(profile.id, row.id);
    res.json({ data: { ...investorDto({ ...row, answers }), messages: row.messages } });
  }),
);

applicationsRouter.patch(
  "/applications/:id",
  authenticate,
  validate(z.object({ answers: z.record(z.unknown()) })),
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { type: true, case: true, project: true },
    });
    if (!row) throw AppError.notFound("Application not found");
    const owns = row.profileId === profile.id || row.project?.profileId === profile.id;
    if (!owns) throw AppError.notFound("Application not found");
    if (row.snapshot) throw AppError.conflict("Submitted snapshots cannot be changed", "SNAPSHOT_IMMUTABLE");
    await writeDraftAnswers(profile.id, row.id, req.body.answers);
    res.json({ data: investorDto({ ...row, answers: req.body.answers }) });
  }),
);

applicationsRouter.post(
  "/applications/:id/validate",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await ownedProfile(req.user!.id);
    const row = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { type: true, project: true },
    });
    if (!row) throw AppError.notFound("Application not found");
    const owns = row.profileId === profile.id || row.project?.profileId === profile.id;
    if (!owns) throw AppError.notFound("Application not found");
    const schema = asJsonMap(row.type.formSchema);
    const fields = Array.isArray(schema.fields)
      ? (schema.fields as Array<{ name: string; required?: boolean }>)
      : [];
    const answers = row.snapshot
      ? (asJsonMap(row.snapshot as never).answers as Record<string, unknown> | undefined) ?? {}
      : await readDraftAnswers(profile.id, row.id);
    const missing = fields
      .filter((field) => field.required && (answers[field.name] === undefined || answers[field.name] === ""))
      .map((field) => field.name);
    if (missing.length) {
      throw AppError.badRequest(
        "VALIDATION_ERROR",
        "Complete the required fields before submit",
        missing.map((name) => ({ path: name, message: "This field is required" })),
      );
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
    if (!row) throw AppError.notFound("Application not found");
    const owns = row.profileId === profile.id || row.project?.profileId === profile.id;
    if (!owns) throw AppError.notFound("Application not found");
    if (row.snapshot) throw AppError.conflict("Application already submitted", "ALREADY_SUBMITTED");
    assertIdentificationLevel(req.user!.identificationLevel, row.type.identificationLevel);

    const year = new Date().getUTCFullYear();
    const count = await prisma.application.count({ where: { publicNumber: { startsWith: `INV-${year}-` } } });
    const publicNumber = nextApplicationNumber(year, count + 1);
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    const country = profile.countryId
      ? await prisma.classification.findUnique({ where: { id: profile.countryId } })
      : null;
    const nonResident = country?.code && country.code !== "AZ";
    if (nonResident && !user?.pepSanctionsStatus) {
      await complianceService.screenUser(req.user!.id, req.user!.id);
    }

    const workflow = await prisma.workflowStatus.findUnique({
      where: {
        workflow_internalStatus: {
          workflow: WorkflowKind.STANDARD,
          internalStatus: row.type.requiresEvaluation
            ? CaseInternalStatus.IN_EVALUATION
            : CaseInternalStatus.REGISTERED,
        },
      },
    });
    const slaDueAt = workflow?.slaWorkingDays
      ? addWorkingDays(new Date(), workflow.slaWorkingDays)
      : addWorkingDays(new Date(), 5);

    const answers = await readDraftAnswers(profile.id, row.id);
    const needsEval = row.type.requiresEvaluation;
    const submitted = await prisma.$transaction(async (tx) => {
      const createdCase = await tx.case.create({
        data: {
          applicationId: row.id,
          internalStatus: needsEval ? CaseInternalStatus.IN_EVALUATION : CaseInternalStatus.REGISTERED,
          slaDueAt,
          sectorId: row.project?.sectorId ?? profile.sectorId,
          regionId: row.project?.territoryId ?? null,
          caseManagerId: row.project?.permanentCaseManagerId ?? null,
        },
      });
      const application = await tx.application.update({
        where: { id: row.id },
        data: {
          publicNumber,
          submittedAt: new Date(),
          snapshot: jsonValue({
            answers,
            profileVersion: profile.version,
            submittedAt: new Date().toISOString(),
          }),
        },
        include: { type: true },
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
      vars: { number: publicNumber, status: "SUBMITTED" },
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
      include: { type: true, case: true, project: true },
    });
    if (!row) throw AppError.notFound("Application not found");
    const owns = row.profileId === profile.id || row.project?.profileId === profile.id;
    if (!owns) throw AppError.notFound("Application not found");
    if (!row.case) throw AppError.badRequest("NOT_SUBMITTED", "Drafts can be deleted; submitted applications are withdrawn");
    if (!canTransition(row.case.internalStatus, CaseInternalStatus.WITHDRAWN, req.user!.roles)) {
      throw AppError.conflict("This application cannot be withdrawn in its current status", "WITHDRAW_BLOCKED");
    }
    await prisma.$transaction([
      prisma.application.update({
        where: { id: row.id },
        data: { withdrawnAt: new Date(), withdrawalReason: req.body.reason },
      }),
      prisma.case.update({
        where: { id: row.case.id },
        data: { internalStatus: CaseInternalStatus.WITHDRAWN, closedAt: new Date() },
      }),
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
