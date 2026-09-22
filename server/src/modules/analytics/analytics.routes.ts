import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";

export const analyticsRouter = Router();

analyticsRouter.get(
  "/analytics/overview",
  authenticate,
  authorize("analyst", "sysadmin", "supervisor"),
  asyncHandler(async (_req, res) => {
    const [applications, byStatus, kyaCount, cases] = await Promise.all([
      prisma.application.count(),
      prisma.case.groupBy({ by: ["internalStatus"], _count: true }),
      prisma.kyaResult.count(),
      prisma.case.findMany({ select: { slaDueAt: true, escalatedAt: true, internalStatus: true } }),
    ]);
    const overdue = cases.filter((row) => row.slaDueAt && row.slaDueAt < new Date() && !["completed", "rejected", "withdrawn", "archived"].includes(row.internalStatus)).length;
    res.json({
      data: {
        applications: { total: applications, byStatus },
        kyaCalculations: kyaCount,
        cases: {
          total: cases.length,
          overdue,
          escalated: cases.filter((row) => row.escalatedAt).length,
        },
        publicKpisApproved: false,
      },
    });
  }),
);
