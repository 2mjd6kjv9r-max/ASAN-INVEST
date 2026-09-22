import { describe, expect, it } from "vitest";
import { evaluateIncentive } from "./incentive";

const rules = {
  legalCitation: "Presidential Decree No. 689 of 19 June 2026",
  minAmountAzn: "500000.00",
  strategicSectors: ["chemicals"],
  processingActivities: ["processing"],
  fx: { USD: "1.70", EUR: "1.85" },
};

describe("incentive engine FR-INC", () => {
  it("returns conditional eligibility with an alternative", () => {
    const result = evaluateIncentive(
      {
        sector: "chemicals",
        activity: "processing",
        volumeAmount: "1200000.00",
        volumeCurrency: "AZN",
        territory: "ganja",
        inAgropark: false,
      },
      rules,
    );
    expect(result.outcome).toBe("conditionally_eligible");
    expect(result.legalCitation).toContain("689");
    expect(result.alternatives.length).toBeGreaterThan(0);
  });
});
