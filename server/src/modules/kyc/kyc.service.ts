import type { Express } from "express";
import type { KycDocumentType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, notFound } from "../../lib/errors";
import { serializeKycDocument, serializeProfile, serializeUser } from "../../serializers";
import { meta, parsePagination } from "../../lib/pagination";

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true, kycDocuments: { orderBy: { createdAt: "desc" } } },
  });
  if (!user) throw notFound("User");
  return serializeUser(user, user.profile, { kycDocuments: user.kycDocuments });
}

export async function updateProfile(userId: string, body: Record<string, unknown>) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
  if (!user?.profile) throw notFound("Profile");

  const preferredLocale = body.preferredLocale as string | undefined;
  const profileData: Record<string, unknown> = {};
  for (const key of [
    "firstName",
    "lastName",
    "patronymic",
    "countryOfCitizenship",
    "fin",
    "passportNumber",
    "phone",
    "addressLine",
    "city",
    "country",
  ] as const) {
    if (body[key] !== undefined) profileData[key] = body[key];
  }
  if (body.dateOfBirth !== undefined) {
    profileData.dateOfBirth = body.dateOfBirth ? new Date(`${body.dateOfBirth}T00:00:00.000Z`) : null;
  }

  if (user.profile.kycStatus === "approved" && Object.keys(profileData).length > 0) {
    profileData.kycStatus = "pending";
  }

  const [updatedUser, profile] = await prisma.$transaction([
    preferredLocale
      ? prisma.user.update({ where: { id: userId }, data: { preferredLocale } })
      : prisma.user.update({ where: { id: userId }, data: {} }),
    prisma.investorProfile.update({ where: { userId }, data: profileData }),
  ]);

  return serializeUser(updatedUser, profile);
}

export async function uploadDocument(
  userId: string,
  type: KycDocumentType,
  file: Express.Multer.File | undefined,
) {
  if (!file) throw new AppError(400, "FILE_REQUIRED", "A document file is required");
  const profile = await prisma.investorProfile.findUnique({ where: { userId } });
  if (!profile) throw notFound("Profile");

  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.kycDocument.create({
      data: {
        userId,
        type,
        originalName: file.originalname,
        storageKey: file.filename,
        mimeType: file.mimetype,
      },
    });
    const nextStatus = profile.kycStatus === "approved" ? "pending" : "pending";
    await tx.investorProfile.update({
      where: { userId },
      data: { kycStatus: nextStatus, kycRejectReason: null },
    });
    return created;
  });
  return serializeKycDocument(document);
}

export async function listPendingKyc(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const status = typeof query.status === "string" ? query.status : "pending";
  const where = { kycStatus: status as "pending" | "approved" | "rejected" | "unsubmitted" };
  const [total, rows] = await prisma.$transaction([
    prisma.investorProfile.count({ where }),
    prisma.investorProfile.findMany({
      where,
      include: {
        user: { include: { kycDocuments: { orderBy: { createdAt: "desc" } } } },
      },
      orderBy: { userId: "asc" },
      skip,
      take: limit,
    }),
  ]);
  return {
    data: rows.map((row) => ({
      ...serializeProfile(row),
      user: {
        id: row.user.id,
        email: row.user.email,
        nationalityType: row.user.nationalityType,
        status: row.user.status,
      },
      documents: row.user.kycDocuments.map(serializeKycDocument),
    })),
    meta: meta(page, limit, total),
  };
}

export async function decideKyc(
  actorId: string,
  userId: string,
  decision: "approved" | "rejected",
  reason?: string,
) {
  if (decision === "rejected" && !reason) {
    throw new AppError(400, "REASON_REQUIRED", "A reason is required to reject KYC");
  }
  const profile = await prisma.investorProfile.findUnique({ where: { userId } });
  if (!profile) throw notFound("Profile");
  const updated = await prisma.investorProfile.update({
    where: { userId },
    data: {
      kycStatus: decision,
      kycReviewedById: actorId,
      kycReviewedAt: new Date(),
      kycRejectReason: decision === "rejected" ? reason : null,
    },
  });
  if (decision === "approved") {
    await prisma.kycDocument.updateMany({
      where: { userId, status: "uploaded" },
      data: { status: "approved" },
    });
  }
  await prisma.auditLog.create({
    data: {
      actorId,
      action: `kyc.${decision}`,
      entityType: "user",
      entityId: userId,
      metadata: reason ? { reason } : undefined,
    },
  });
  return serializeProfile(updated);
}
