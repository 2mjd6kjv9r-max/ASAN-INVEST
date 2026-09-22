import { describe, expect, it } from "vitest";
import { evaluateRoute } from "./route";

const rules = {
  residenceInvestmentAzn: "500000.00",
  residencePropertyAzn: "100000.00",
  hagueMembers: ["DE"],
  sanctioned: ["XX"],
  fx: { USD: "1.70", EUR: "1.85" },
  consulates: { IR: "Embassy" },
};

describe("route calculator FR-ROUTE", () => {
  it("marks results as estimates and keeps fees on separate lines", () => {
    const result = evaluateRoute(
      {
        country: "DE",
        sector: "chemicals",
        volumeAmount: "4500000.00",
        volumeCurrency: "USD",
        territory: "sumgayit",
        nationalityType: "non_resident",
      },
      rules,
    );
    expect(result.estimated).toBe(true);
    expect(result.registrationRoute).toBe("D");
    expect(result.legalization).toBe("apostille");
    expect(result.residenceBasis).toBe(true);
    expect(result.stateFees.length).toBeGreaterThan(0);
    expect(result.partnerFees).toEqual([]);
  });

  it("stops politely for sanctioned countries FR-ROUTE-04 / FR-EVAL-05", () => {
    const result = evaluateRoute(
      {
        country: "XX",
        sector: "chemicals",
        volumeAmount: "1.00",
        volumeCurrency: "AZN",
        territory: "baku",
      },
      rules,
    );
    expect(result.politeStop?.code).toBe("SANCTIONS_REVIEW");
    expect(result.politeStop?.message.toLowerCase()).not.toContain("guilty");
  });
});
