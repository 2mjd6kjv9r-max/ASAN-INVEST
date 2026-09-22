import { prisma } from "./prisma";

type AuditInput = {
  actorId?: string | null;
  action: string;
  objectType: string;
  objectId: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  await prisma.auditRecord.create({
    data: {
      actorUserId: input.actorId ?? null,
      action: input.action,
      objectType: input.objectType,
      objectId: input.objectId,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
      ipAddress: input.ipAddress ?? null,
    },
  });
}
