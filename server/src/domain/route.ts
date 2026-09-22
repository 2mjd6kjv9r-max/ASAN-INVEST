import { Prisma } from "@prisma/client";

export type RouteInput = {
  country: string;
  sector: string;
  volumeAmount: string;
  volumeCurrency: "AZN" | "USD" | "EUR";
  territory: string;
  hasESignature?: boolean;
  nationalityType?: "resident" | "non_resident";
};

export type RouteRules = {
  residenceInvestmentAzn: string;
  residencePropertyAzn: string;
  hagueMembers: string[];
  sanctioned: string[];
  fx: { USD: string; EUR: string };
  consulates: Record<string, string>;
};

export type RouteOutput = {
  estimated: true;
  registrationRoute: "A" | "B" | "C" | "D";
  legalForm: string;
  legalization: "apostille" | "consular" | "not_required";
  consulate?: string;
  visaNote: string;
  residenceBasis: boolean;
  estimatedWorkingDays: number;
  physicalContactsInAzerbaijan: number;
  stateFees: Array<{ label: string; amount: string; currency: string }>;
  partnerFees: Array<{ label: string; amount: string; currency: string }>;
  politeStop?: { code: string; message: string };
};

function toAzn(amount: string, currency: RouteInput["volumeCurrency"], fx: RouteRules["fx"]): Prisma.Decimal {
  const value = new Prisma.Decimal(amount);
  if (currency === "AZN") return value;
  return value.mul(new Prisma.Decimal(fx[currency]));
}

export function evaluateRoute(input: RouteInput, rules: RouteRules): RouteOutput {
  const country = input.country.toUpperCase();
  if (rules.sanctioned.includes(country)) {
    return {
      estimated: true,
      registrationRoute: "D",
      legalForm: "MMC",
      legalization: "consular",
      visaNote: "Contact an advisor before continuing.",
      residenceBasis: false,
      estimatedWorkingDays: 0,
      physicalContactsInAzerbaijan: 0,
      stateFees: [],
      partnerFees: [],
      politeStop: {
        code: "SANCTIONS_REVIEW",
        message: "This country currently needs a human review. Please contact ASAN Invest; this is not an accusation.",
      },
    };
  }

  const resident = input.nationalityType === "resident" || country === "AZ";
  let registrationRoute: RouteOutput["registrationRoute"];
  if (resident && input.hasESignature) registrationRoute = "A";
  else if (resident) registrationRoute = "B";
  else if (input.hasESignature) registrationRoute = "C";
  else registrationRoute = "D";

  const legalization: RouteOutput["legalization"] = resident
    ? "not_required"
    : rules.hagueMembers.includes(country)
      ? "apostille"
      : "consular";

  const azn = toAzn(input.volumeAmount, input.volumeCurrency, rules.fx);
  const residenceBasis =
    azn.gte(rules.residenceInvestmentAzn) || azn.gte(rules.residencePropertyAzn);

  return {
    estimated: true,
    registrationRoute,
    legalForm: "MMC",
    legalization,
    consulate: legalization === "consular" ? rules.consulates[country] ?? "Accredited embassy to be confirmed" : undefined,
    visaNote: resident ? "Not required for citizens of Azerbaijan." : "ASAN Visa or applicable visa category.",
    residenceBasis,
    estimatedWorkingDays: registrationRoute === "A" ? 3 : 10,
    physicalContactsInAzerbaijan: registrationRoute === "D" ? 1 : 0,
    stateFees:
      registrationRoute === "A"
        ? [{ label: "Electronic company registration", amount: "0.00", currency: "AZN" }]
        : [{ label: "Paper registration state fee (if used)", amount: "15.00", currency: "AZN" }],
    partnerFees: [],
  };
}
