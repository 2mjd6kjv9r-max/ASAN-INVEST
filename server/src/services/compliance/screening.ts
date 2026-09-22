import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAudit } from "../../lib/audit";

/** FR-EVAL-01 / FR-EVAL-05. Adapter is stubbed when no list provider is configured. */
export const complianceService = {
  async screenUser(userId: string, actorId?: string) {
    const outcome = "not_configured";
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        pepSanctionsStatus: outcome,
        pepSanctionsListVersion: "unconfigured",
        pepSanctionsCheckedAt: new Date(),
      },
    });
    await writeAudit({
      actorId: actorId ?? userId,
      action: "compliance.screen",
      objectType: "user",
      objectId: userId,
      after: { outcome },
    });
    return {
      outcome,
      message:
        "Sanctions/PEP list provider is not configured. Screening is recorded as not_configured and a reviewer can continue.",
      politeStop: false as const,
      userId: user.id,
    };
  },

  politeMismatch() {
    throw new AppError(
      409,
      "COMPLIANCE_REVIEW",
      "This profile needs a human review before a legally significant step. This is not an accusation. Please contact ASAN Invest.",
    );
  },
};
