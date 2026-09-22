export type KyaInput = {
  sector: string;
  territory: string;
  volumeAmount: string;
  volumeCurrency: string;
  foreignWorkers?: number;
  description?: string;
  confirmedParameters: boolean;
};

export type ProcedureMatch = {
  code: string;
  reason: string;
  ruleVersion: number;
};

export type KyaCatalogProcedure = {
  code: string;
  sectorTags: string[];
  always?: boolean;
  minForeignWorkers?: number;
};

export function evaluateKya(
  input: KyaInput,
  catalog: KyaCatalogProcedure[],
  ruleVersion: number,
): ProcedureMatch[] {
  if (!input.confirmedParameters) {
    throw Object.assign(new Error("Unconfirmed parameters must not reach the rule engine"), {
      code: "KYA_UNCONFIRMED",
    });
  }

  return catalog
    .filter((procedure) => {
      if (procedure.always) return true;
      if (procedure.minForeignWorkers && (input.foreignWorkers ?? 0) >= procedure.minForeignWorkers) return true;
      return procedure.sectorTags.includes(input.sector);
    })
    .map((procedure) => ({
      code: procedure.code,
      reason: procedure.always
        ? "Required for every project in this rule version"
        : procedure.minForeignWorkers
          ? `Foreign workers ≥ ${procedure.minForeignWorkers}`
          : `Sector ${input.sector}`,
      ruleVersion,
    }));
}
