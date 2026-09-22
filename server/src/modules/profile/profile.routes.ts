import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { writeAudit } from "../../lib/audit";
import { serializeProfile, serializeUser } from "../../serializers/user";
import { AppError } from "../../lib/errors";

export const profileRouter = Router();

const updateSchema = z.object({
  country: z.string().length(2).optional(),
  sector: z.string().optional(),
  activityArea: z.string().optional(),
  contacts: z.record(z.unknown()).optional(),
  companyName: z.string().optional(),
  companyCountry: z.string().length(2).optional(),
  companyRegId: z.string().optional(),
  taxId: z.string().optional(),
  companyActivity: z.string().optional(),
  uboStructure: z.unknown().optional(),
  locale: z.enum(["az", "en", "ru", "tr", "ar"]).optional(),
});

const representationSchema = z.object({
  representativeEmail: z.string().email(),
  authority: z.enum(["view", "prepare", "sign"]),
  validTo: z.string().datetime().optional(),
});

async function loadUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: { include: { versions: { orderBy: { version: "desc" }, take: 20 } } } },
  });
  if (!user?.profile) throw AppError.notFound("Profile not found");
  return user;
}

profileRouter.get(
  "/me/profile",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await loadUser(req.user!.id);
    res.json({
      data: {
        ...serializeUser(user),
        versions: user.profile!.versions.map((row) => ({
          version: row.version,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    });
  }),
);

profileRouter.put(
  "/me/profile",
  authenticate,
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const user = await loadUser(req.user!.id);
    const nextVersion = user.profile!.version + 1;
    const { locale, ...profileFields } = req.body;
    const updated = await prisma.$transaction(async (tx) => {
      await tx.profileVersion.create({
        data: {
          profileId: user.profile!.id,
          version: user.profile!.version,
          snapshot: serializeProfile(user.profile!),
        },
      });
      const profile = await tx.profile.update({
        where: { id: user.profile!.id },
        data: { ...profileFields, version: nextVersion },
      });
      if (locale) {
        await tx.user.update({ where: { id: user.id }, data: { locale } });
      }
      return profile;
    });
    await writeAudit({
      actorId: user.id,
      action: "profile.update",
      objectType: "profile",
      objectId: updated.id,
      before: serializeProfile(user.profile!),
      after: serializeProfile(updated),
      ipAddress: req.ip,
    });
    res.json({ data: serializeProfile(updated) });
  }),
);

profileRouter.post(
  "/me/consents",
  authenticate,
  validate(z.object({ version: z.string(), personalData: z.literal(true) })),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { consents: req.body, consentVersion: req.body.version, consentedAt: new Date() },
    });
    await writeAudit({
      actorId: user.id,
      action: "profile.consent",
      objectType: "user",
      objectId: user.id,
      after: { version: req.body.version },
    });
    res.json({ data: { consentVersion: user.consentVersion, consentedAt: user.consentedAt } });
  }),
);

profileRouter.get(
  "/me/representations",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await loadUser(req.user!.id);
    const rows = await prisma.representation.findMany({
      where: { profileId: user.profile!.id },
      include: { representative: { select: { id: true, email: true } } },
    });
    res.json({ data: rows });
  }),
);

profileRouter.post(
  "/me/representations",
  authenticate,
  validate(representationSchema),
  asyncHandler(async (req, res) => {
    const owner = await loadUser(req.user!.id);
    const representative = await prisma.user.findUnique({ where: { email: req.body.representativeEmail.toLowerCase() } });
    if (!representative) throw AppError.notFound("Representative account not found");
    const row = await prisma.representation.create({
      data: {
        profileId: owner.profile!.id,
        representativeUserId: representative.id,
        authority: req.body.authority,
        validFrom: new Date(),
        validTo: req.body.validTo ? new Date(req.body.validTo) : null,
      },
    });
    await writeAudit({
      actorId: owner.id,
      action: "profile.representation.create",
      objectType: "representation",
      objectId: row.id,
      after: { authority: row.authority, representativeUserId: representative.id },
    });
    res.status(201).json({ data: row });
  }),
);

profileRouter.post(
  "/me/representations/:id/revoke",
  authenticate,
  asyncHandler(async (req, res) => {
    const owner = await loadUser(req.user!.id);
    const existing = await prisma.representation.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.profileId !== owner.profile!.id) throw AppError.notFound();
    const row = await prisma.representation.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    await writeAudit({
      actorId: owner.id,
      action: "profile.representation.revoke",
      objectType: "representation",
      objectId: row.id,
    });
    res.json({ data: row });
  }),
);
