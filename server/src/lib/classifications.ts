import { ClassificationKind } from "@prisma/client";
import { prisma } from "./prisma";
import { AppError } from "./errors";

export async function resolveClassificationId(
  kind: ClassificationKind,
  codeOrId: string,
): Promise<string> {
  const byId = await prisma.classification.findUnique({ where: { id: codeOrId } });
  if (byId) {
    if (byId.kind !== kind) {
      throw AppError.badRequest("CLASSIFICATION", `Classification ${codeOrId} is not ${kind}`);
    }
    return byId.id;
  }
  const byCode = await prisma.classification.findUnique({
    where: { kind_code: { kind, code: codeOrId } },
  });
  if (!byCode) {
    throw AppError.badRequest("CLASSIFICATION", `Unknown ${kind} '${codeOrId}'`);
  }
  return byCode.id;
}
