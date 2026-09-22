import { describe, expect, it } from "vitest";
import { addWorkingDays, canTransition } from "./workflow";
import { assertLinkedApplication, nextApplicationNumber } from "./application";
import { assertIdentificationLevel } from "./identification";

describe("workflow and application invariants", () => {
  it("allows supervisor-only reopen FR-CASE-07", () => {
    expect(canTransition("rejected", "assigned", ["supervisor"])).toBe(true);
    expect(canTransition("rejected", "assigned", ["case_manager"])).toBe(false);
    expect(canTransition("rejected", "assigned", ["investor"])).toBe(false);
  });

  it("counts working days WF-01", () => {
    const friday = new Date("2026-09-18T00:00:00.000Z");
    const due = addWorkingDays(friday, 1);
    expect(due.toISOString().slice(0, 10)).toBe("2026-09-21");
  });

  it("enforces Z-02 linkage", () => {
    expect(() => assertLinkedApplication(undefined, undefined)).toThrow(/linked/);
    expect(() => assertLinkedApplication(undefined, "profile-1")).not.toThrow();
  });

  it("formats application numbers FR-APP-03", () => {
    expect(nextApplicationNumber(2026, 412)).toBe("INV-2026-00412");
  });

  it("sends level-2 users to the route screen instead of a dead error TZ §7.2", () => {
    try {
      assertIdentificationLevel("basic", "legal");
      throw new Error("expected gate");
    } catch (error) {
      expect((error as { code: string }).code).toBe("IDENTIFICATION_LEVEL");
      expect((error as { details: { next: string } }).details.next).toBe("route");
    }
  });
});
