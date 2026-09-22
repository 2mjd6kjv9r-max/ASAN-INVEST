import { Router } from "express";
import { CaseInternalStatus, UserRole } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";

export const analyticsRouter = Router();

const reporters: UserRole[] = [UserRole.ANALYST, UserRole.SYSADMIN, UserRole.SUPERVISOR];

analyticsRouter.get(
  "/analytics/overview",
  authenticate,
  authorize(...reporters),
  asyncHandler(async (_req, res) => {
    const terminal: CaseInternalStatus[] = [
      CaseInternalStatus.COMPLETED,
      CaseInternalStatus.REJECTED,
      CaseInternalStatus.WITHDRAWN,
      CaseInternalStatus.ARCHIVED,
    ];
    const [applications, byStatus, kyaCount, cases, submitted, completed] = await Promise.all([
      prisma.application.count(),
      prisma.case.groupBy({ by: ["internalStatus"], _count: true }),
      prisma.kyaResult.count(),
      prisma.case.findMany({ select: { slaDueAt: true, escalatedAt: true, internalStatus: true, pausedAt: true } }),
      prisma.application.count({ where: { submittedAt: { not: null } } }),
      prisma.case.count({ where: { internalStatus: CaseInternalStatus.COMPLETED } }),
    ]);
    const overdue = cases.filter(
      (row) =>
        row.slaDueAt &&
        row.slaDueAt < new Date() &&
        !row.pausedAt &&
        !terminal.includes(row.internalStatus),
    ).length;
    res.json({
      data: {
        applications: { total: applications, submitted, byStatus },
        kyaCalculations: kyaCount,
        cases: {
          total: cases.length,
          completed,
          overdue,
          escalated: cases.filter((row) => row.escalatedAt).length,
        },
        publicKpisApproved: false,
      },
    });
  }),
);

analyticsRouter.get(
  "/analytics/sla",
  authenticate,
  authorize(...reporters),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.case.findMany({
      where: { slaDueAt: { not: null } },
      select: { id: true, internalStatus: true, slaDueAt: true, pausedAt: true, escalatedAt: true },
    });
    res.json({ data: rows });
  }),
);

analyticsRouter.get(
  "/analytics/kya",
  authenticate,
  authorize(...reporters),
  asyncHandler(async (_req, res) => {
    const [total, byRule] = await Promise.all([
      prisma.kyaResult.count(),
      prisma.kyaResult.groupBy({ by: ["ruleVersion"], _count: true }),
    ]);
    res.json({ data: { total, byRule } });
  }),
);
