import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { writeAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { hashPassword } from "../../lib/passwords";

export const adminRouter = Router();
adminRouter.use(authenticate);

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  roles: z.array(z.enum([
    "investor",
    "case_manager",
    "supervisor",
    "institution_rep",
    "evaluator",
    "content_manager",
    "analyst",
    "sysadmin",
  ])).min(1),
  institutionId: z.string().uuid().optional(),
  validTo: z.string().datetime().optional(),
});

adminRouter.get(
  "/users",
  authorize("sysadmin"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, roles: true, status: true, institutionId: true, twoFactorEnabled: true },
      orderBy: { email: "asc" },
    });
    res.json({ data: users });
  }),
);

adminRouter.post(
  "/users",
  authorize("sysadmin"),
  validate(userCreateSchema),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.create({
      data: {
        email: req.body.email.toLowerCase(),
        passwordHash: await hashPassword(req.body.password),
        roles: req.body.roles,
        status: "active",
        emailVerifiedAt: new Date(),
        twoFactorEnabled: req.body.roles.some((role: string) => role !== "investor"),
        institutionId: req.body.institutionId,
        profile: { create: {} },
      },
    });
    await prisma.roleGrant.create({
      data: {
        userId: user.id,
        role: req.body.roles[0],
        issuedById: req.user!.id,
        validFrom: new Date(),
        validTo: req.body.validTo ? new Date(req.body.validTo) : null,
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "admin.user.create",
      objectType: "user",
      objectId: user.id,
      after: { roles: user.roles, institutionId: user.institutionId },
    });
    res.status(201).json({ data: { id: user.id, email: user.email, roles: user.roles } });
  }),
);

adminRouter.patch(
  "/users/:id/status",
  authorize("sysadmin"),
  validate(z.object({ status: z.enum(["active", "disabled"]) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "admin.user.status",
      objectType: "user",
      objectId: user.id,
      after: { status: user.status },
    });
    res.json({ data: { id: user.id, status: user.status } });
  }),
);

adminRouter.get(
  "/rule-sets",
  authorize("sysadmin", "analyst"),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.ruleSet.findMany({ orderBy: [{ kind: "asc" }, { version: "desc" }] });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/rule-sets",
  authorize("sysadmin"),
  validate(
    z.object({
      kind: z.enum(["kya", "incentive", "risk", "route", "flag", "case_assignment", "size_threshold", "inactivity"]),
      version: z.number().int().positive(),
      effectiveAt: z.string().datetime(),
      body: z.record(z.unknown()),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.ruleSet.create({
      data: {
        kind: req.body.kind,
        version: req.body.version,
        effectiveAt: new Date(req.body.effectiveAt),
        approvedBy: req.user!.id,
        body: req.body.body,
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "admin.ruleset.create",
      objectType: "rule_set",
      objectId: row.id,
      after: { kind: row.kind, version: row.version },
    });
    res.status(201).json({ data: row });
  }),
);

adminRouter.get(
  "/cms",
  authorize("sysadmin", "content_manager"),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.cmsContent.findMany({ orderBy: { updatedAt: "desc" } });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/cms",
  authorize("sysadmin", "content_manager"),
  validate(
    z.object({
      slug: z.string().min(1),
      locale: z.string().min(2).max(8),
      title: z.string().min(1),
      body: z.string().min(1),
    }),
  ),
  asyncHandler(async (req, res) => {
    const latest = await prisma.cmsContent.findFirst({
      where: { slug: req.body.slug, locale: req.body.locale },
      orderBy: { version: "desc" },
    });
    const row = await prisma.cmsContent.create({
      data: {
        slug: req.body.slug,
        locale: req.body.locale,
        title: req.body.title,
        body: req.body.body,
        ownerId: req.user!.id,
        version: (latest?.version ?? 0) + 1,
        status: "draft",
      },
    });
    res.status(201).json({ data: row });
  }),
);

adminRouter.post(
  "/cms/:id/transition",
  authorize("sysadmin", "content_manager"),
  validate(z.object({ to: z.enum(["in_review", "published", "archived"]) })),
  asyncHandler(async (req, res) => {
    const row = await prisma.cmsContent.findUnique({ where: { id: req.params.id } });
    if (!row) throw AppError.notFound();
    const updated = await prisma.cmsContent.update({
      where: { id: row.id },
      data: {
        status: req.body.to,
        publishedAt: req.body.to === "published" ? new Date() : row.publishedAt,
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "admin.cms.transition",
      objectType: "cms_content",
      objectId: row.id,
      after: { status: updated.status },
    });
    res.json({ data: updated });
  }),
);

adminRouter.get(
  "/audit",
  authorize("sysadmin", "supervisor", "analyst"),
  asyncHandler(async (req, res) => {
    const objectType = typeof req.query.objectType === "string" ? req.query.objectType : undefined;
    const rows = await prisma.auditRecord.findMany({
      where: objectType ? { objectType } : undefined,
      orderBy: { occurredAt: "desc" },
      take: 100,
    });
    res.json({ data: rows });
  }),
);

adminRouter.get(
  "/settings",
  authorize("sysadmin"),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.systemSetting.findMany();
    res.json({ data: rows });
  }),
);
