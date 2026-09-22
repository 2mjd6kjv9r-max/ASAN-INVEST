import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { writeAudit } from "../../lib/audit";

/** FR-EVAL-01 / FR-EVAL-05. Adapter is stubbed when no list provider is configured. */
export const complianceService = {
  async screenUser(userId: string, actorId?: string) {
    const setting = await prisma.systemSetting.findUnique({ where: { key: "sanctions_provider" } });
    const configured = Boolean(setting && (setting.value as { configured?: boolean }).configured);
    const outcome = configured ? "clear" : "not_configured";
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        screeningOutcome: outcome,
        screeningListVersion: configured ? "stub-list-1" : "unconfigured",
        screenedAt: new Date(),
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
        outcome === "not_configured"
          ? "Sanctions/PEP list provider is not configured. Screening is recorded as not_configured and a reviewer can continue."
          : "No match was returned by the configured list provider.",
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
