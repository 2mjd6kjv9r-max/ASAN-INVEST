import { Router } from "express";
import { z } from "zod";
import {
  ClassificationKind,
  CmsStatus,
  Flag,
  IdentificationLevel,
  NotificationChannel,
  RuleSetKind,
  UserRole,
  UserStatus,
  WorkflowKind,
} from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { writeAudit } from "../../lib/audit";
import { AppError } from "../../lib/errors";
import { hashPassword } from "../../lib/passwords";
import { env } from "../../config/env";
import { activeRoles } from "../../lib/roles";

export const adminRouter = Router();
adminRouter.use(authenticate);

const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  roles: z
    .array(
      z.enum([
        UserRole.INVESTOR,
        UserRole.CASE_MANAGER,
        UserRole.SUPERVISOR,
        UserRole.INSTITUTION_REP,
        UserRole.EVALUATOR,
        UserRole.CONTENT_MANAGER,
        UserRole.ANALYST,
        UserRole.SYSADMIN,
      ]),
    )
    .min(1),
  institutionId: z.string().uuid().optional(),
  validTo: z.string().datetime().optional(),
});

adminRouter.get(
  "/users",
  authorize(UserRole.SYSADMIN),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: { roleAssignments: true },
      orderBy: { email: "asc" },
    });
    res.json({
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        roles: activeRoles(user.roleAssignments),
        status: user.status,
        institutionId: user.institutionId,
        twoFactorEnabled: user.twoFactorEnabled,
      })),
    });
  }),
);

adminRouter.post(
  "/users",
  authorize(UserRole.SYSADMIN),
  validate(userCreateSchema),
  asyncHandler(async (req, res) => {
    const roles = req.body.roles as UserRole[];
    const user = await prisma.user.create({
      data: {
        email: req.body.email.toLowerCase(),
        passwordHash: await hashPassword(req.body.password),
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        twoFactorEnabled: roles.some((role) => role !== UserRole.INVESTOR),
        institutionId: req.body.institutionId,
        profile: { create: {} },
        roleAssignments: {
          create: roles.map((role: UserRole) => ({
            role,
            grantedById: req.user!.id,
            validTo: req.body.validTo ? new Date(req.body.validTo) : null,
          })),
        },
      },
      include: { roleAssignments: true },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "admin.user.create",
      objectType: "user",
      objectId: user.id,
      after: { roles: activeRoles(user.roleAssignments), institutionId: user.institutionId },
    });
    res.status(201).json({
      data: { id: user.id, email: user.email, roles: activeRoles(user.roleAssignments) },
    });
  }),
);

adminRouter.patch(
  "/users/:id/status",
  authorize(UserRole.SYSADMIN),
  validate(z.object({ status: z.nativeEnum(UserStatus) })),
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
  "/classifications",
  authorize(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER),
  asyncHandler(async (req, res) => {
    const kind = typeof req.query.kind === "string" ? (req.query.kind as ClassificationKind) : undefined;
    const rows = await prisma.classification.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: "asc" }, { sortOrder: "asc" }],
    });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/classifications",
  authorize(UserRole.SYSADMIN),
  validate(
    z.object({
      kind: z.nativeEnum(ClassificationKind),
      code: z.string().min(1),
      names: z.record(z.string()),
      parentId: z.string().uuid().optional(),
      sortOrder: z.number().int().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.classification.create({
      data: {
        kind: req.body.kind,
        code: req.body.code,
        names: req.body.names,
        parentId: req.body.parentId,
        sortOrder: req.body.sortOrder ?? 0,
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "admin.classification.create",
      objectType: "classification",
      objectId: row.id,
    });
    res.status(201).json({ data: row });
  }),
);

adminRouter.get(
  "/application-types",
  authorize(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.applicationType.findMany({ orderBy: { code: "asc" } });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/application-types",
  authorize(UserRole.SYSADMIN),
  validate(
    z.object({
      code: z.string().min(1),
      names: z.record(z.string()),
      identificationLevel: z.nativeEnum(IdentificationLevel),
      requiresEvaluation: z.boolean().default(false),
      formSchema: z.record(z.unknown()).default({}),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.applicationType.create({
      data: {
        code: req.body.code,
        names: req.body.names,
        identificationLevel: req.body.identificationLevel,
        requiresEvaluation: req.body.requiresEvaluation,
        formSchema: req.body.formSchema,
        workflow: WorkflowKind.STANDARD,
      },
    });
    res.status(201).json({ data: row });
  }),
);

adminRouter.get(
  "/procedures",
  authorize(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.procedure.findMany({
      include: { institution: true, dependencies: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/procedures",
  authorize(UserRole.SYSADMIN),
  validate(
    z.object({
      code: z.string().min(1),
      names: z.record(z.string()),
      institutionId: z.string().uuid(),
      flag: z.nativeEnum(Flag),
      expectedDurationDays: z.number().int().optional(),
      legalBasis: z.string().optional(),
      eServiceUrl: z.string().url().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.procedure.create({ data: req.body });
    await writeAudit({
      actorId: req.user!.id,
      action: "admin.procedure.create",
      objectType: "procedure",
      objectId: row.id,
    });
    res.status(201).json({ data: row });
  }),
);

adminRouter.get(
  "/rule-sets",
  authorize(UserRole.SYSADMIN, UserRole.ANALYST),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.ruleSet.findMany({ orderBy: [{ kind: "asc" }, { effectiveAt: "desc" }] });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/rule-sets",
  authorize(UserRole.SYSADMIN),
  validate(
    z.object({
      kind: z.nativeEnum(RuleSetKind),
      version: z.string().min(1),
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
        approvedById: req.user!.id,
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
  authorize(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.cmsContent.findMany({ orderBy: { updatedAt: "desc" } });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/cms",
  authorize(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER),
  validate(
    z.object({
      pageKey: z.string().min(1),
      slug: z.string().min(1),
      title: z.record(z.string()),
      body: z.record(z.string()),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.cmsContent.create({
      data: {
        pageKey: req.body.pageKey,
        slug: req.body.slug,
        title: req.body.title,
        body: req.body.body,
        ownerUserId: req.user!.id,
        status: CmsStatus.DRAFT,
      },
    });
    await prisma.cmsContentVersion.create({
      data: {
        contentId: row.id,
        version: 1,
        title: req.body.title,
        body: req.body.body,
        status: CmsStatus.DRAFT,
      },
    });
    res.status(201).json({ data: row });
  }),
);

adminRouter.post(
  "/cms/:id/transition",
  authorize(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER),
  validate(z.object({ to: z.nativeEnum(CmsStatus) })),
  asyncHandler(async (req, res) => {
    const row = await prisma.cmsContent.findUnique({ where: { id: req.params.id } });
    if (!row) throw AppError.notFound();
    if (req.body.to === CmsStatus.PUBLISHED && !req.user!.roles.includes(UserRole.SYSADMIN)) {
      throw AppError.forbidden("Publishing CMS requires a sysadmin");
    }
    const updated = await prisma.cmsContent.update({
      where: { id: row.id },
      data: {
        status: req.body.to,
        publishedAt: req.body.to === CmsStatus.PUBLISHED ? new Date() : row.publishedAt,
        version: row.version + 1,
      },
    });
    await prisma.cmsContentVersion.create({
      data: {
        contentId: row.id,
        version: updated.version,
        title: row.title ?? {},
        body: row.body ?? {},
        status: updated.status,
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
  "/notification-templates",
  authorize(UserRole.SYSADMIN, UserRole.CONTENT_MANAGER),
  asyncHandler(async (_req, res) => {
    const rows = await prisma.notificationTemplate.findMany({
      orderBy: [{ eventType: "asc" }, { locale: "asc" }],
    });
    res.json({ data: rows });
  }),
);

adminRouter.post(
  "/notification-templates",
  authorize(UserRole.SYSADMIN),
  validate(
    z.object({
      eventType: z.string().min(1),
      role: z.nativeEnum(UserRole).nullable().optional(),
      locale: z.enum(["az", "en", "ru", "tr", "ar"]),
      channel: z.nativeEnum(NotificationChannel),
      subject: z.string().min(1),
      body: z.string().min(1),
      isMandatory: z.boolean().default(false),
    }),
  ),
  asyncHandler(async (req, res) => {
    const row = await prisma.notificationTemplate.create({ data: req.body });
    res.status(201).json({ data: row });
  }),
);

adminRouter.get(
  "/audit",
  authorize(UserRole.SYSADMIN, UserRole.SUPERVISOR, UserRole.ANALYST),
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
  authorize(UserRole.SYSADMIN),
  asyncHandler(async (_req, res) => {
    res.json({
      data: {
        phase: 1,
        dvxCompanyRegistrationUrl: env.DVX_COMPANY_REGISTRATION_URL,
        dataResidency: "Production PostgreSQL must be hosted in Azerbaijan (NFR-01).",
        sanctionsProviderConfigured: false,
        emailVerificationRequired: env.REQUIRE_EMAIL_VERIFICATION,
      },
    });
  }),
);
