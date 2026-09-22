import { Prisma } from "@prisma/client";

export type IncentiveInput = {
  sector: string;
  activity?: string;
  volumeAmount: string;
  volumeCurrency: "AZN" | "USD" | "EUR";
  territory: string;
  inAgropark?: boolean;
  inIndustrialPark?: boolean;
};

export type IncentiveRules = {
  legalCitation: string;
  minAmountAzn: string;
  strategicSectors: string[];
  processingActivities: string[];
  fx: { USD: string; EUR: string };
};

export type IncentiveOutput = {
  outcome: "eligible" | "conditionally_eligible" | "not_eligible";
  explanationAz: string;
  explanationEn: string;
  legalCitation: string;
  estimatedSavingNote: string | null;
  alternatives: string[];
};

function toAzn(amount: string, currency: IncentiveInput["volumeCurrency"], fx: IncentiveRules["fx"]): Prisma.Decimal {
  const value = new Prisma.Decimal(amount);
  if (currency === "AZN") return value;
  return value.mul(new Prisma.Decimal(fx[currency]));
}

export function evaluateIncentive(input: IncentiveInput, rules: IncentiveRules): IncentiveOutput {
  const azn = toAzn(input.volumeAmount, input.volumeCurrency, rules.fx);
  const strategic = rules.strategicSectors.includes(input.sector);
  const processing = Boolean(input.activity && rules.processingActivities.includes(input.activity));
  const enough = azn.gte(rules.minAmountAzn);
  const inZone = Boolean(input.inAgropark || input.inIndustrialPark);

  if (strategic && enough && (inZone || !processing)) {
    return {
      outcome: "eligible",
      explanationAz: "Layihə qüvvədə olan meyarlara uyğundur.",
      explanationEn: "The project meets the current incentive criteria.",
      legalCitation: rules.legalCitation,
      estimatedSavingNote: "Approximate 7-year saving is informational, not a guaranteed yield.",
      alternatives: input.inIndustrialPark ? ["industrial_park_residency"] : [],
    };
  }

  if (processing && !input.inAgropark) {
    return {
      outcome: "conditionally_eligible",
      explanationAz: "Emal layihəsi aqroparkda həyata keçirildikdə strateji istiqamətə düşür.",
      explanationEn: "A processing project becomes strategic when carried out in an agropark.",
      legalCitation: rules.legalCitation,
      estimatedSavingNote: null,
      alternatives: ["Move the site to an agropark", `Raise volume to ${rules.minAmountAzn} AZN`],
    };
  }

  if (!enough) {
    return {
      outcome: "conditionally_eligible",
      explanationAz: `Məbləği ${rules.minAmountAzn} AZN-ə çatdırdıqda uyğun ola bilərsiniz.`,
      explanationEn: `You may become eligible if the volume reaches ${rules.minAmountAzn} AZN.`,
      legalCitation: rules.legalCitation,
      estimatedSavingNote: null,
      alternatives: [`Increase volume to ${rules.minAmountAzn} AZN`],
    };
  }

  return {
    outcome: "not_eligible",
    explanationAz: "Bu parametrlərlə investisiya təşviqi sənədinə uyğun deyil. Alternativ rejimlərə baxın.",
    explanationEn: "These parameters are not eligible for the investment promotion certificate. Review alternative regimes.",
    legalCitation: rules.legalCitation,
    estimatedSavingNote: null,
    alternatives: ["industrial_park_residency", "other_relief_regimes"],
  };
}
