import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/asyncHandler";
import { notFound } from "../../lib/errors";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { meta, parsePagination } from "../../lib/pagination";
import { param } from "../../lib/params";
import { serializeUser } from "../../serializers";
import { uuidParam } from "../projects/projects.schemas";

const statusSchema = z.object({
  status: z.enum(["active", "suspended"]),
});

export const adminUserRouter = Router();
adminUserRouter.use(requireAuth, requireRoles("admin"));

adminUserRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query as Record<string, unknown>);
    const [total, rows] = await prisma.$transaction([
      prisma.user.count(),
      prisma.user.findMany({
        include: { profile: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    res.json({
      data: rows.map((row) => serializeUser(row, row.profile)),
      meta: meta(page, limit, total),
    });
  }),
);

adminUserRouter.patch(
  "/:id/status",
  validate({ params: uuidParam, body: statusSchema }),
  asyncHandler(async (req, res) => {
    const userId = param(req.params.id);
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw notFound("User");
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: req.body.status },
      include: { profile: true },
    });
    await prisma.auditLog.create({
      data: {
        actorId: req.user!.id,
        action: "user.status",
        entityType: "user",
        entityId: updated.id,
        metadata: { status: updated.status },
      },
    });
    res.json({ data: serializeUser(updated, updated.profile) });
  }),
);
