import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { AppError } from "../../lib/errors";
import { ruleEngine } from "../../services/rules/engine";
import { writeAudit } from "../../lib/audit";
import { toStageStatus } from "../../domain/status";

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

projectsRouter.get(
  "/projects",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await investorProfile(req.user!.id);
    const isStaff = req.user!.roles.some((role) =>
      ["case_manager", "supervisor", "sysadmin", "analyst"].includes(role),
    );
    const rows = await prisma.project.findMany({
      where: isStaff ? undefined : { ownerProfileId: profile.id },
      include: { stages: { include: { procedure: true, application: { include: { case: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      data: rows.map((project) => ({
        ...project,
        volumeAmount: project.volumeAmount.toFixed(2),
        stages: project.stages.map((stage) => ({
          ...stage,
          displayStatus: toStageStatus({
            notApplicable: stage.notApplicable,
            hasApplication: Boolean(stage.applicationId),
            caseStatus: stage.application?.case?.internalStatus,
          }),
        })),
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
    const assignmentRule = await prisma.ruleSet.findFirst({
      where: { kind: "case_assignment" },
      orderBy: { version: "desc" },
    });
    const managerEmail = (assignmentRule?.body as { permanentManagerEmail?: string } | undefined)?.permanentManagerEmail;
    const manager = sizeCategory === "large" && managerEmail
      ? await prisma.user.findUnique({ where: { email: managerEmail } })
      : null;

    const procedures = (kya.procedures as Array<{ code: string }>).map((row) => row.code);
    const catalog = await prisma.procedure.findMany({ where: { code: { in: procedures } } });

    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          ownerProfileId: profile.id,
          name: req.body.name,
          sector: req.body.sector,
          territory: req.body.territory,
          volumeAmount: req.body.volumeAmount,
          volumeCurrency: req.body.volumeCurrency,
          sizeCategory,
          companyRef: req.body.companyRef,
          permanentCaseManagerId: manager?.id,
          kyaResultId: kya.id,
        },
      });
      await tx.stage.createMany({
        data: catalog.map((procedure, index) => ({
          projectId: created.id,
          procedureId: procedure.id,
          flag: procedure.flag,
          sortOrder: index + 1,
          expectedDuration: procedure.expectedDuration,
        })),
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
        stages: { include: { procedure: true, application: { include: { case: true } } }, orderBy: { sortOrder: "asc" } },
        permanentCaseManager: { select: { id: true, email: true } },
      },
    });
    if (!project) throw AppError.notFound("Project not found");
    const staff = req.user!.roles.some((role) => ["case_manager", "supervisor", "sysadmin"].includes(role));
    if (!staff && project.ownerProfileId !== profile.id) throw AppError.forbidden();
    res.json({
      data: {
        ...project,
        volumeAmount: project.volumeAmount.toFixed(2),
        stages: project.stages.map((stage) => ({
          id: stage.id,
          flag: stage.flag,
          sortOrder: stage.sortOrder,
          expectedDuration: stage.expectedDuration,
          procedure: stage.procedure,
          displayStatus: toStageStatus({
            notApplicable: stage.notApplicable,
            hasApplication: Boolean(stage.applicationId),
            caseStatus: stage.application?.case?.internalStatus,
          }),
        })),
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
    if (!project || project.ownerProfileId !== profile.id) throw AppError.forbidden();
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status: "suspended" },
    });
    res.json({ data: updated });
  }),
);
