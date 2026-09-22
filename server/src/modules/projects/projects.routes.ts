import { Router } from "express";
import { z } from "zod";
import {
  ClassificationKind,
  ProjectStatus,
  UserRole,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { AppError } from "../../lib/errors";
import { resolveClassificationId } from "../../lib/classifications";
import { ruleEngine } from "../../services/rules/engine";
import { writeAudit } from "../../lib/audit";
import { toStageStatus } from "../../domain/status";
import { hasRole } from "../../lib/roles";

export const projectsRouter = Router();

const createSchema = z.object({
  name: z.string().min(2).max(200),
  sector: z.string().min(1),
  territory: z.string().min(1),
  volumeAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  volumeCurrency: z.enum(["AZN", "USD", "EUR"]),
  companyRef: z.string().optional(),
  kyaResultId: z.string().uuid().optional(),
});

async function investorProfile(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw AppError.notFound("Profile not found");
  return profile;
}

function serializeProjectStages(
  stages: Array<{
    id: string;
    flag: string;
    sortOrder: number;
    expectedDurationDays: number | null;
    isNotApplicable: boolean;
    applicationId: string | null;
    procedure: { names: unknown; code: string; flag: string };
    application?: { case: { internalStatus: import("@prisma/client").CaseInternalStatus } | null } | null;
  }>,
  lockedCodes: Set<string>,
) {
  return stages.map((stage) => ({
    id: stage.id,
    flag: stage.flag,
    sortOrder: stage.sortOrder,
    expectedDurationDays: stage.expectedDurationDays,
    procedure: stage.procedure,
    displayStatus: toStageStatus({
      notApplicable: stage.isNotApplicable,
      locked: lockedCodes.has(stage.procedure.code),
      hasApplication: Boolean(stage.applicationId),
      caseStatus: stage.application?.case?.internalStatus,
    }),
  }));
}

projectsRouter.get(
  "/projects",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await investorProfile(req.user!.id);
    const isStaff = hasRole(
      req.user!.roles,
      UserRole.CASE_MANAGER,
      UserRole.SUPERVISOR,
      UserRole.SYSADMIN,
      UserRole.ANALYST,
    );
    const rows = await prisma.project.findMany({
      where: isStaff ? undefined : { profileId: profile.id },
      include: {
        stages: {
          include: { procedure: true, application: { include: { case: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      data: rows.map((project) => ({
        ...project,
        volumeAmount: project.volumeAmount.toFixed(2),
        stages: serializeProjectStages(project.stages, new Set()),
      })),
    });
  }),
);

projectsRouter.post(
  "/projects",
  authenticate,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const profile = await investorProfile(req.user!.id);
    if (!req.body.kyaResultId) {
      throw AppError.badRequest("KYA_REQUIRED", "Select a KYA result or run KYA before creating a project");
    }
    const kya = await prisma.kyaResult.findUnique({ where: { id: req.body.kyaResultId } });
    if (!kya || kya.profileId !== profile.id) throw AppError.notFound("KYA result not found");
    const sizeCategory = await ruleEngine.sizeCategory(req.body.volumeAmount, req.body.volumeCurrency);
    const sectorId = await resolveClassificationId(ClassificationKind.SECTOR, req.body.sector);
    const territoryId = await resolveClassificationId(ClassificationKind.REGION, req.body.territory);

    const procedurePayload = Array.isArray(kya.procedures)
      ? (kya.procedures as Array<{ code?: string }>)
      : [];
    const codes = procedurePayload.map((row) => row.code).filter((code): code is string => Boolean(code));
    const catalog = await prisma.procedure.findMany({
      where: { code: { in: codes } },
      include: { dependencies: true },
    });

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          profileId: profile.id,
          name: req.body.name,
          sectorId,
          territoryId,
          volumeAmount: req.body.volumeAmount,
          volumeCurrency: req.body.volumeCurrency,
          sizeCategory,
          companyRef: req.body.companyRef,
          createdById: req.user!.id,
        },
      });
      await tx.stage.createMany({
        data: catalog.map((procedure, index) => ({
          projectId: created.id,
          procedureId: procedure.id,
          flag: procedure.flag,
          sortOrder: index + 1,
          expectedDurationDays: procedure.expectedDurationDays,
        })),
      });
      await tx.kyaResult.update({
        where: { id: kya.id },
        data: { projectId: created.id },
      });
      return created;
    });

    await writeAudit({
      actorId: req.user!.id,
      action: "project.create",
      objectType: "project",
      objectId: project.id,
    });
    res.status(201).json({ data: { ...project, volumeAmount: project.volumeAmount.toFixed(2) } });
  }),
);

projectsRouter.get(
  "/projects/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await investorProfile(req.user!.id);
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        stages: {
          include: { procedure: { include: { dependencies: true } }, application: { include: { case: true } } },
          orderBy: { sortOrder: "asc" },
        },
        permanentCaseManager: { select: { id: true, email: true } },
      },
    });
    if (!project) throw AppError.notFound("Project not found");
    const staff = hasRole(req.user!.roles, UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.SYSADMIN);
    if (!staff && project.profileId !== profile.id) throw AppError.forbidden();

    const completedCodes = new Set(
      project.stages
        .filter((stage) => stage.application?.case?.internalStatus === "COMPLETED")
        .map((stage) => stage.procedureId),
    );
    const lockedCodes = new Set(
      project.stages
        .filter((stage) =>
          stage.procedure.dependencies.some((dep) => !completedCodes.has(dep.dependsOnProcedureId)),
        )
        .map((stage) => stage.procedure.code),
    );

    res.json({
      data: {
        ...project,
        volumeAmount: project.volumeAmount.toFixed(2),
        stages: serializeProjectStages(project.stages, lockedCodes),
      },
    });
  }),
);

projectsRouter.post(
  "/projects/:id/suspend",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await investorProfile(req.user!.id);
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project || project.profileId !== profile.id) throw AppError.forbidden();
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status: ProjectStatus.SUSPENDED },
    });
    res.json({ data: updated });
  }),
);
