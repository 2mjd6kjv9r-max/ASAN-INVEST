import type { RuleSetKind } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { evaluateRoute, type RouteInput, type RouteRules } from "../../domain/route";
import { evaluateIncentive, type IncentiveInput, type IncentiveRules } from "../../domain/incentive";
import { evaluateKya, type KyaInput, type KyaCatalogProcedure } from "../../domain/kya";
import { Prisma } from "@prisma/client";

export async function latestRuleSet(kind: RuleSetKind) {
  const now = new Date();
  const rule = await prisma.ruleSet.findFirst({
    where: { kind, effectiveAt: { lte: now } },
    orderBy: { version: "desc" },
  });
  if (!rule) throw AppError.badRequest("RULESET_MISSING", `No effective ${kind} rule set is configured`);
  return rule;
}

export const ruleEngine = {
  async route(input: RouteInput) {
    const rule = await latestRuleSet("route");
    const output = evaluateRoute(input, rule.body as RouteRules);
    return { output, ruleSetId: rule.id, ruleVersion: rule.version };
  },

  async incentive(input: IncentiveInput) {
    const rule = await latestRuleSet("incentive");
    const output = evaluateIncentive(input, rule.body as IncentiveRules);
    return { output, ruleSetId: rule.id, ruleVersion: rule.version };
  },

  async kya(input: KyaInput) {
    if (!input.confirmedParameters) {
      throw AppError.badRequest("KYA_UNCONFIRMED", "Confirm or edit extracted parameters before rules run");
    }
    const rule = await latestRuleSet("kya");
    const procedures = await prisma.procedure.findMany();
    const catalog: KyaCatalogProcedure[] = procedures.map((procedure) => {
      const tags = ((rule.body as { sectorMap?: Record<string, string[]> }).sectorMap ?? {})[procedure.code] ?? [];
      return {
        code: procedure.code,
        sectorTags: tags,
        always: (rule.body as { always?: string[] }).always?.includes(procedure.code),
        minForeignWorkers: (rule.body as { foreignWorkers?: Record<string, number> }).foreignWorkers?.[procedure.code],
      };
    });
    const matches = evaluateKya(input, catalog, rule.version);
    const detailed = matches.map((match) => {
      const procedure = procedures.find((row) => row.code === match.code);
      return {
        ...match,
        nameAz: procedure?.nameAz,
        nameEn: procedure?.nameEn,
        institutionId: procedure?.institutionId,
        flag: procedure?.flag,
        expectedDuration: procedure?.expectedDuration,
        feeNote: procedure?.feeNote,
        legalBasis: procedure?.legalBasis,
        eServiceUrl: procedure?.eServiceUrl,
        dependsOnCodes: procedure?.dependsOnCodes,
      };
    });
    return { procedures: detailed, ruleSetId: rule.id, ruleVersion: rule.version };
  },

  async sizeCategory(volumeAmount: string, volumeCurrency: string) {
    const rule = await latestRuleSet("size_threshold");
    const body = rule.body as { largeFromAzn: string; fx: { USD: string; EUR: string } };
    let azn = new Prisma.Decimal(volumeAmount);
    if (volumeCurrency !== "AZN") {
      azn = azn.mul(new Prisma.Decimal(body.fx[volumeCurrency as "USD" | "EUR"] ?? "1"));
    }
    return azn.gte(body.largeFromAzn) ? ("large" as const) : ("small" as const);
  },
};
