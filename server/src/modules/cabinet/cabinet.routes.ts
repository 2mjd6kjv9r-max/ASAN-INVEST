import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { AppError } from "../../lib/errors";
import { toInvestorStatus, toStageStatus } from "../../domain/status";
import { namesFor } from "../../lib/json";
import { InvestorVisibleStatus } from "@prisma/client";

export const cabinetRouter = Router();

cabinetRouter.get(
  "/cabinet/dashboard",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) throw AppError.notFound("Profile not found");
    const applications = await prisma.application.findMany({
      where: { OR: [{ profileId: profile.id }, { project: { profileId: profile.id } }] },
      include: { type: true, case: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const projects = await prisma.project.findMany({
      where: { profileId: profile.id },
      include: {
        stages: {
          include: { procedure: true, application: { include: { case: true } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    const nextStage = projects
      .flatMap((project) =>
        project.stages.map((stage) => ({
          projectName: project.name,
          procedure: namesFor(stage.procedure.names, "az") || stage.procedure.code,
          displayStatus: toStageStatus({
            notApplicable: stage.isNotApplicable,
            hasApplication: Boolean(stage.applicationId),
            caseStatus: stage.application?.case?.internalStatus,
          }),
        })),
      )
      .find((stage) => stage.displayStatus === "OPEN");

    res.json({
      data: {
        nextStep: nextStage
          ? { title: nextStage.procedure, projectName: nextStage.projectName, action: "You can apply" }
          : { title: "Complete your profile or run KYA", action: "Start in the open portal" },
        applications: applications.map((row) => ({
          id: row.id,
          publicNumber: row.publicNumber,
          type: row.type.code,
          investorStatus: row.case ? toInvestorStatus(row.case.internalStatus) : InvestorVisibleStatus.DRAFT,
        })),
        notifications: notifications.map((row) => ({
          id: row.id,
          eventType: row.eventType,
          body: row.body,
          readAt: row.readAt,
          createdAt: row.createdAt,
        })),
      },
    });
  }),
);
