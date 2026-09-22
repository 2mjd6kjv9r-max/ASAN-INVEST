import { Router } from "express";
import { z } from "zod";
import {
  ClassificationKind,
  RepresentationAuthority,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../lib/async-handler";
import { authenticate } from "../../middleware/authenticate";
import { validate } from "../../middleware/validate";
import { writeAudit } from "../../lib/audit";
import { serializeProfile, serializeUser } from "../../serializers/user";
import { AppError } from "../../lib/errors";
import { resolveClassificationId } from "../../lib/classifications";
import { jsonValue } from "../../lib/json";

export const profileRouter = Router();

const updateSchema = z.object({
  countryId: z.string().optional(),
  sectorId: z.string().optional(),
  activityAreaId: z.string().optional(),
  contacts: z.record(z.unknown()).optional(),
  companyName: z.string().optional(),
  companyCountryId: z.string().optional(),
  companyRegId: z.string().optional(),
  taxId: z.string().optional(),
  companyActivity: z.string().optional(),
  uboStructure: z.unknown().optional(),
  locale: z.enum(["az", "en", "ru", "tr", "ar"]).optional(),
});

const representationSchema = z.object({
  representativeEmail: z.string().email(),
  authority: z.nativeEnum(RepresentationAuthority),
  validTo: z.string().datetime().optional(),
  powerOfAttorneyDocumentId: z.string().uuid().optional(),
});

async function loadUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roleAssignments: true,
      profile: { include: { versions: { orderBy: { version: "desc" }, take: 20 } } },
    },
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
    const { locale, countryId, sectorId, activityAreaId, companyCountryId, ...rest } = req.body as z.infer<
      typeof updateSchema
    >;
    const data: Prisma.ProfileUncheckedUpdateInput = {
      version: nextVersion,
    };
    if (countryId) data.countryId = await resolveClassificationId(ClassificationKind.COUNTRY, countryId);
    if (sectorId) data.sectorId = await resolveClassificationId(ClassificationKind.SECTOR, sectorId);
    if (activityAreaId) {
      data.activityAreaId = await resolveClassificationId(ClassificationKind.ACTIVITY, activityAreaId);
    }
    if (companyCountryId) {
      data.companyCountryId = await resolveClassificationId(ClassificationKind.COUNTRY, companyCountryId);
    }
    if (rest.contacts) data.contacts = jsonValue(rest.contacts);
    if (rest.companyName !== undefined) data.companyName = rest.companyName;
    if (rest.companyRegId !== undefined) data.companyRegId = rest.companyRegId;
    if (rest.taxId !== undefined) data.taxId = rest.taxId;
    if (rest.companyActivity !== undefined) data.companyActivity = rest.companyActivity;
    if (rest.uboStructure !== undefined) data.uboStructure = jsonValue(rest.uboStructure);
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
        data,
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
      include: { representativeUser: { select: { id: true, email: true } } },
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
    const representative = await prisma.user.findUnique({
      where: { email: req.body.representativeEmail.toLowerCase() },
    });
    if (!representative) throw AppError.notFound("Representative account not found");
    const row = await prisma.representation.create({
      data: {
        profileId: owner.profile!.id,
        representativeUserId: representative.id,
        authority: req.body.authority,
        powerOfAttorneyDocumentId: req.body.powerOfAttorneyDocumentId,
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
