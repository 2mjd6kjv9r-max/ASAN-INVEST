import { RuleSetKind, ProjectSizeCategory } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../lib/errors";
import { asJsonMap } from "../../lib/json";
import { evaluateRoute, type RouteInput, type RouteRules } from "../../domain/route";
import { evaluateIncentive, type IncentiveInput, type IncentiveRules } from "../../domain/incentive";
import { evaluateKya, type KyaInput, type KyaCatalogProcedure } from "../../domain/kya";
import { Prisma } from "@prisma/client";

const DEFAULT_ROUTE_RULES: RouteRules = {
  residenceInvestmentAzn: "500000.00",
  residencePropertyAzn: "100000.00",
  hagueMembers: ["DE", "TR", "FR", "IT", "NL", "GB"],
  sanctioned: [],
  fx: { USD: "1.70", EUR: "1.85" },
  consulates: {},
};

const DEFAULT_INCENTIVE_RULES: IncentiveRules = {
  legalCitation: "Presidential Decree No. 689 of 19.06.2026 (criteria stored as rules, FR-INC-02)",
  minAmountAzn: "500000.00",
  strategicSectors: ["chemicals", "energy", "agri-processing"],
  processingActivities: ["food-packaging", "processing"],
  fx: { USD: "1.70", EUR: "1.85" },
};

export async function latestRuleSet(kind: RuleSetKind) {
  const now = new Date();
  const rule = await prisma.ruleSet.findFirst({
    where: { kind, effectiveAt: { lte: now } },
    orderBy: { effectiveAt: "desc" },
  });
  if (!rule) throw AppError.badRequest("RULESET_MISSING", `No effective ${kind} rule set is configured`);
  return rule;
}

async function optionalRuleSet(kind: RuleSetKind) {
  const now = new Date();
  return prisma.ruleSet.findFirst({
    where: { kind, effectiveAt: { lte: now } },
    orderBy: { effectiveAt: "desc" },
  });
}

export const ruleEngine = {
  async route(input: RouteInput) {
    const rule = await latestRuleSet(RuleSetKind.ROUTE);
    const body = asJsonMap(rule.body);
    const output = evaluateRoute(input, { ...DEFAULT_ROUTE_RULES, ...body } as RouteRules);
    return { output, ruleSetId: rule.id, ruleVersion: rule.version };
  },

  async incentive(input: IncentiveInput) {
    const rule = await latestRuleSet(RuleSetKind.INCENTIVE);
    const body = asJsonMap(rule.body);
    const merged: IncentiveRules = {
      ...DEFAULT_INCENTIVE_RULES,
      legalCitation: (body.legalAct as string | undefined) ?? DEFAULT_INCENTIVE_RULES.legalCitation,
      ...body,
    };
    const output = evaluateIncentive(input, merged);
    return { output, ruleSetId: rule.id, ruleVersion: rule.version };
  },

  async kya(input: KyaInput) {
    if (!input.confirmedParameters) {
      throw AppError.badRequest("KYA_UNCONFIRMED", "Confirm or edit extracted parameters before rules run");
    }
    const rule = await latestRuleSet(RuleSetKind.KYA);
    const body = asJsonMap(rule.body);
    const procedures = await prisma.procedure.findMany({
      where: { isActive: true },
      include: { institution: true, dependencies: true },
    });
    const always = new Set(
      Array.isArray(body.procedures) ? (body.procedures as string[]) : [],
    );
    const catalog: KyaCatalogProcedure[] = procedures.map((procedure) => {
      const tags = ((body.sectorMap as Record<string, string[]> | undefined) ?? {})[procedure.code] ?? [];
      return {
        code: procedure.code,
        sectorTags: tags,
        always: always.has(procedure.code) || (body.always as string[] | undefined)?.includes(procedure.code),
        minForeignWorkers: (body.foreignWorkers as Record<string, number> | undefined)?.[procedure.code],
      };
    });
    const matches = evaluateKya(input, catalog, rule.version);
    const detailed = matches.map((match) => {
      const procedure = procedures.find((row) => row.code === match.code);
      return {
        ...match,
        names: procedure?.names,
        institutionId: procedure?.institutionId,
        flag: procedure?.flag,
        expectedDurationDays: procedure?.expectedDurationDays,
        feeAmount: procedure?.feeAmount?.toFixed(2) ?? null,
        feeCurrency: procedure?.feeCurrency,
        legalBasis: procedure?.legalBasis,
        eServiceUrl: procedure?.eServiceUrl,
        dependsOnCodes: procedure?.dependencies.map((d) => d.dependsOnProcedureId) ?? [],
      };
    });
    return { procedures: detailed, ruleSetId: rule.id, ruleVersion: rule.version };
  },

  async sizeCategory(volumeAmount: string, volumeCurrency: string) {
    const rule = await optionalRuleSet(RuleSetKind.SIZE_THRESHOLD);
    const body = asJsonMap(rule?.body);
    const largeFromAzn = (body.largeFromAzn as string | undefined) ?? "5000000.00";
    const fx = (body.fx as { USD?: string; EUR?: string } | undefined) ?? { USD: "1.70", EUR: "1.85" };
    let azn = new Prisma.Decimal(volumeAmount);
    if (volumeCurrency !== "AZN") {
      azn = azn.mul(new Prisma.Decimal(fx[volumeCurrency as "USD" | "EUR"] ?? "1"));
    }
    return azn.gte(largeFromAzn) ? ProjectSizeCategory.LARGE : ProjectSizeCategory.SMALL;
  },
};
