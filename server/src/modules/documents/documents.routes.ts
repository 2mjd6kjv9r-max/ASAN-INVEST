import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { z } from "zod";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { AppError } from "../../lib/errors";
import { writeAudit } from "../../lib/audit";
import { validate } from "../../middleware/validate";

fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, env.UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: env.MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      cb(AppError.badRequest("FILE_TYPE", "Upload PDF, JPEG or PNG files only"));
      return;
    }
    cb(null, true);
  },
});

export const documentsRouter = Router();

documentsRouter.get(
  "/documents",
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await prisma.document.findMany({
      where: { uploadedById: req.user!.id },
      include: { links: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      data: rows.map((row) => ({
        id: row.id,
        typeCode: row.typeCode,
        version: row.version,
        validUntil: row.validUntil,
        source: row.source,
        originalName: row.originalName,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        createdAt: row.createdAt,
      })),
    });
  }),
);

documentsRouter.post(
  "/documents",
  authenticate,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw AppError.badRequest("FILE_REQUIRED", "A file is required");
    const typeCode = typeof req.body.typeCode === "string" ? req.body.typeCode : "other";
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    const doc = await prisma.document.create({
      data: {
        typeCode,
        source: "uploaded",
        storageKey: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        uploadedById: req.user!.id,
        links: profile ? { create: { profileId: profile.id } } : undefined,
      },
    });
    await writeAudit({
      actorId: req.user!.id,
      action: "document.upload",
      objectType: "document",
      objectId: doc.id,
    });
    res.status(201).json({
      data: { id: doc.id, typeCode: doc.typeCode, originalName: doc.originalName, sizeBytes: doc.sizeBytes },
    });
  }),
);

documentsRouter.get(
  "/applications/:id/messages",
  authenticate,
  asyncHandler(async (req, res) => {
    const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } });
    const application = await prisma.application.findUnique({ where: { id: req.params.id } });
    if (!application) throw AppError.notFound();
    const staff = req.user!.roles.some((role) => ["case_manager", "supervisor", "sysadmin"].includes(role));
    if (!staff && application.profileId !== profile?.id) throw AppError.forbidden();
    const messages = await prisma.message.findMany({
      where: { applicationId: application.id, ...(staff ? {} : { internal: false }) },
      orderBy: { createdAt: "asc" },
    });
    res.json({ data: messages.map(({ ...row }) => row) });
  }),
);

documentsRouter.post(
  "/applications/:id/messages",
  authenticate,
  validate(z.object({ body: z.string().min(1).max(5000), internal: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const staff = req.user!.roles.some((role) => ["case_manager", "supervisor", "sysadmin"].includes(role));
    const internal = Boolean(req.body.internal && staff);
    const message = await prisma.message.create({
      data: {
        applicationId: req.params.id,
        senderUserId: req.user!.id,
        body: req.body.body,
        internal,
      },
    });
    res.status(201).json({ data: message });
  }),
);

export const notificationsRouter = Router();

notificationsRouter.get(
  "/notifications",
  authenticate,
  asyncHandler(async (req, res) => {
    const rows = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ data: rows });
  }),
);

notificationsRouter.post(
  "/notifications/:id/read",
  authenticate,
  asyncHandler(async (req, res) => {
    const existing = await prisma.notification.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== req.user!.id) throw AppError.notFound();
    const row = await prisma.notification.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
    });
    res.json({ data: row });
  }),
);
