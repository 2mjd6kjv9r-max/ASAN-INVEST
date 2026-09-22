import path from "path";
import fs from "fs";
import multer from "multer";
import { Router } from "express";
import { env } from "../../config/env";
import { asyncHandler } from "../../lib/asyncHandler";
import { AppError } from "../../lib/errors";
import { param } from "../../lib/params";
import { requireAuth, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { uuidParam } from "../projects/projects.schemas";
import { kycDecisionSchema, kycTypeSchema, profileUpdateSchema } from "./kyc.schemas";
import * as kyc from "./kyc.service";

const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      cb(new AppError(400, "INVALID_FILE_TYPE", "Only PDF, JPEG and PNG files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get(
  "/profile",
  asyncHandler(async (req, res) => {
    res.json({ data: await kyc.getProfile(req.user!.id) });
  }),
);

meRouter.put(
  "/profile",
  validate({ body: profileUpdateSchema }),
  asyncHandler(async (req, res) => {
    res.json({ data: await kyc.updateProfile(req.user!.id, req.body) });
  }),
);

meRouter.post(
  "/kyc-documents",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const parsed = kycTypeSchema.safeParse(req.body.type);
    if (!parsed.success) {
      throw new AppError(400, "INVALID_TYPE", "Document type is invalid");
    }
    const data = await kyc.uploadDocument(req.user!.id, parsed.data, req.file);
    res.status(201).json({ data });
  }),
);

export const adminKycRouter = Router();
adminKycRouter.use(requireAuth, requireRoles("operator", "admin"));

adminKycRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await kyc.listPendingKyc(req.query as Record<string, unknown>));
  }),
);

adminKycRouter.post(
  "/:id/approve",
  validate({ params: uuidParam }),
  asyncHandler(async (req, res) => {
    res.json({ data: await kyc.decideKyc(req.user!.id, param(req.params.id), "approved") });
  }),
);

adminKycRouter.post(
  "/:id/reject",
  validate({ params: uuidParam, body: kycDecisionSchema }),
  asyncHandler(async (req, res) => {
    res.json({
      data: await kyc.decideKyc(req.user!.id, param(req.params.id), "rejected", req.body.reason),
    });
  }),
);
