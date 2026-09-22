import { describe, expect, it } from "vitest";
import { evaluateKya } from "./kya";

describe("KYA FR-KYA-02", () => {
  it("rejects unconfirmed SI parameters", () => {
    expect(() =>
      evaluateKya(
        {
          sector: "chemicals",
          territory: "sumgayit",
          volumeAmount: "1",
          volumeCurrency: "USD",
          confirmedParameters: false,
        },
        [],
        "1",
      ),
    ).toThrow(/Unconfirmed/);
  });

  it("binds matches to the rule version Z-05", () => {
    const matches = evaluateKya(
      {
        sector: "chemicals",
        territory: "sumgayit",
        volumeAmount: "1",
        volumeCurrency: "USD",
        confirmedParameters: true,
      },
      [{ code: "company_registration", sectorTags: [], always: true }],
      "3",
    );
    expect(matches[0]).toMatchObject({ code: "company_registration", ruleVersion: "3" });
  });
});
