import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

type AuditInput = {
  actorId?: string | null;
  action: string;
  objectType: string;
  objectId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
};

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

export async function writeAudit(input: AuditInput): Promise<void> {
  const after =
    input.ipAddress && input.after && typeof input.after === "object" && input.after !== null
      ? { ...(input.after as Record<string, unknown>), ipAddress: input.ipAddress }
      : input.ipAddress
        ? { ipAddress: input.ipAddress }
        : input.after;

  await prisma.auditRecord.create({
    data: {
      actorUserId: input.actorId ?? null,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      before: asJson(input.before),
      after: asJson(after),
    },
  });
}
