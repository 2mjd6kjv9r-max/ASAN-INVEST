import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError, forbidden, notFound } from "../../lib/errors";
import { parseAmount, remainingCapacity } from "../../lib/money";
import { meta, parsePagination } from "../../lib/pagination";
import { serializeInvestment } from "../../serializers";
import { createStubPaymentRef, simulateProviderEvent } from "../../integrations/payment/stub";
import { reconcileOpenProjects } from "../projects/projects.service";

const OPEN_INVESTMENT = ["pending_kyc", "pending_payment", "pending_review"] as const;

export async function createInvestment(input: {
  userId: string;
  userStatus: string;
  projectId: string;
  amountRaw: unknown;
  idempotencyKey: string | undefined;
}) {
  const idempotencyKey = input.idempotencyKey;
  if (!idempotencyKey) {
    throw new AppError(400, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key header is required");
  }

  const existing = await prisma.investment.findUnique({
    where: { idempotencyKey },
    include: { project: { include: { agency: true, sector: true } } },
  });
  if (existing) {
    if (existing.userId !== input.userId) {
      throw new AppError(409, "IDEMPOTENCY_CONFLICT", "Idempotency key already used");
    }
    return serializeInvestment(existing);
  }

  if (input.userStatus !== "active") {
    throw forbidden("Only active accounts can invest");
  }

  const amount = parseAmount(input.amountRaw);
  await reconcileOpenProjects();

  try {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      include: { profile: true },
    });
    if (!user?.profile) throw notFound("Profile");
    if (user.profile.kycStatus !== "approved") {
      throw new AppError(403, "KYC_REQUIRED", "KYC must be approved before investing");
    }

    const project = await tx.project.findUnique({
      where: { id: input.projectId },
      include: { agency: true, sector: true },
    });
    if (!project) throw notFound("Project");

    const now = new Date();
    const investable =
      (project.status === "published" || project.status === "funding") &&
      now >= project.fundingStartsAt &&
      now <= project.fundingEndsAt;
    if (!investable) {
      throw new AppError(409, "NOT_INVESTABLE", "This project is not open for investment");
    }
    if (amount.lt(project.minInvestment)) {
      throw new AppError(400, "AMOUNT_TOO_SMALL", "Amount is below the project minimum");
    }
    if (project.maxInvestment && amount.gt(project.maxInvestment)) {
      throw new AppError(400, "AMOUNT_TOO_LARGE", "Amount is above the project maximum");
    }
    const remaining = remainingCapacity(project.targetAmount, project.fundedAmount);
    if (amount.gt(remaining)) {
      throw new AppError(409, "EXCEEDS_TARGET", "Amount exceeds remaining project capacity");
    }

    const year = now.getUTCFullYear();
    const publicRef = `INV-${year}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

    const investment = await tx.investment.create({
      data: {
        publicRef,
        userId: input.userId,
        projectId: project.id,
        amount,
        currency: project.currency,
        status: "pending_payment",
        idempotencyKey,
      },
      include: { project: { include: { agency: true, sector: true } } },
    });

    await tx.payment.create({
      data: {
        investmentId: investment.id,
        provider: "stub",
        providerRef: createStubPaymentRef(),
        amount,
        currency: project.currency,
        status: "initiated",
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.userId,
        action: "investment.create",
        entityType: "investment",
        entityId: investment.id,
        metadata: { amount: amount.toFixed(2) },
      },
    });

    return serializeInvestment(investment);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const replay = await prisma.investment.findUnique({
        where: { idempotencyKey },
        include: { project: { include: { agency: true, sector: true } } },
      });
      if (replay && replay.userId === input.userId) return serializeInvestment(replay);
    }
    throw error;
  }
}

export async function listMine(userId: string, query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const where = { userId };
  const [total, rows] = await prisma.$transaction([
    prisma.investment.count({ where }),
    prisma.investment.findMany({
      where,
      include: { project: { include: { agency: true, sector: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return { data: rows.map(serializeInvestment), meta: meta(page, limit, total) };
}

export async function getMine(userId: string, id: string) {
  const investment = await prisma.investment.findUnique({
    where: { id },
    include: { project: { include: { agency: true, sector: true } } },
  });
  if (!investment || investment.userId !== userId) throw notFound("Investment");
  return serializeInvestment(investment);
}

export async function cancel(userId: string, id: string) {
  const investment = await prisma.investment.findUnique({ where: { id } });
  if (!investment || investment.userId !== userId) throw notFound("Investment");
  if (!OPEN_INVESTMENT.includes(investment.status as (typeof OPEN_INVESTMENT)[number])) {
    throw new AppError(409, "NOT_CANCELLABLE", "Only unconfirmed investments can be cancelled");
  }
  const updated = await prisma.investment.update({
    where: { id },
    data: { status: "cancelled" },
    include: { project: { include: { agency: true, sector: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "investment.cancel",
      entityType: "investment",
      entityId: id,
    },
  });
  return serializeInvestment(updated);
}

export async function payStub(userId: string, id: string, succeed = true) {
  const investment = await prisma.investment.findUnique({
    where: { id },
    include: { payments: true, project: { include: { agency: true, sector: true } } },
  });
  if (!investment || investment.userId !== userId) throw notFound("Investment");
  if (investment.status !== "pending_payment") {
    throw new AppError(409, "NOT_PAYABLE", "Investment is not awaiting payment");
  }
  const payment = investment.payments.find((item) => item.status === "initiated");
  if (!payment) throw new AppError(409, "NO_PAYMENT", "No initiated payment found");

  const nextInvestmentStatus = succeed ? "pending_review" : "rejected";
  const nextPaymentStatus = succeed ? "succeeded" : "failed";

  const [updated] = await prisma.$transaction([
    prisma.investment.update({
      where: { id },
      data: {
        status: nextInvestmentStatus,
        rejectReason: succeed ? null : "Stub payment failed",
      },
      include: { project: { include: { agency: true, sector: true } } },
    }),
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextPaymentStatus,
        rawPayload: simulateProviderEvent(succeed ? "succeeded" : "failed") as Prisma.InputJsonValue,
      },
    }),
  ]);
  return serializeInvestment(updated);
}

export async function listAdmin(query: Record<string, unknown>) {
  const { page, limit, skip } = parsePagination(query);
  const where: Prisma.InvestmentWhereInput = {};
  if (typeof query.status === "string" && query.status) {
    where.status = query.status as Prisma.InvestmentWhereInput["status"];
  }
  const [total, rows] = await prisma.$transaction([
    prisma.investment.count({ where }),
    prisma.investment.findMany({
      where,
      include: {
        project: { include: { agency: true, sector: true } },
        user: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);
  return {
    data: rows.map((row) => ({
      ...serializeInvestment(row),
      user: { id: row.user.id, email: row.user.email },
    })),
    meta: meta(page, limit, total),
  };
}

export async function confirm(actorId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const investment = await tx.investment.findUnique({
      where: { id },
      include: { project: { include: { agency: true, sector: true } } },
    });
    if (!investment) throw notFound("Investment");
    if (investment.status !== "pending_review") {
      throw new AppError(409, "NOT_CONFIRMABLE", "Investment is not awaiting review");
    }
    const project = await tx.project.findUnique({ where: { id: investment.projectId } });
    if (!project) throw notFound("Project");
    const remaining = remainingCapacity(project.targetAmount, project.fundedAmount);
    if (investment.amount.gt(remaining)) {
      throw new AppError(409, "EXCEEDS_TARGET", "Confirming this investment would exceed the target");
    }
    const fundedAmount = project.fundedAmount.plus(investment.amount);
    const nextProjectStatus = fundedAmount.gte(project.targetAmount) ? "funded" : project.status;

    await tx.project.update({
      where: { id: project.id },
      data: { fundedAmount, status: nextProjectStatus },
    });
    const updated = await tx.investment.update({
      where: { id },
      data: { status: "confirmed" },
      include: { project: { include: { agency: true, sector: true } } },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "investment.confirm",
        entityType: "investment",
        entityId: id,
        metadata: { fundedAmount: fundedAmount.toFixed(2) },
      },
    });
    return serializeInvestment(updated);
  });
}

export async function reject(actorId: string, id: string, reason: string) {
  const investment = await prisma.investment.findUnique({ where: { id } });
  if (!investment) throw notFound("Investment");
  if (investment.status !== "pending_review" && investment.status !== "pending_payment") {
    throw new AppError(409, "NOT_REJECTABLE", "Investment cannot be rejected in its current status");
  }
  const updated = await prisma.investment.update({
    where: { id },
    data: { status: "rejected", rejectReason: reason },
    include: { project: { include: { agency: true, sector: true } } },
  });
  await prisma.auditLog.create({
    data: {
      actorId,
      action: "investment.reject",
      entityType: "investment",
      entityId: id,
      metadata: { reason },
    },
  });
  return serializeInvestment(updated);
}
