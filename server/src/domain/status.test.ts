import { describe, expect, it } from "vitest";
import { toInvestorStatus, toStageStatus } from "./status";

describe("status mapping Z-03 / TZ §14.1 / §10.2", () => {
  it("maps internal case status to investor-visible labels", () => {
    expect(toInvestorStatus("draft")).toBe("draft");
    expect(toInvestorStatus("registered")).toBe("in_review");
    expect(toInvestorStatus("awaiting_info")).toBe("awaiting_you");
    expect(toInvestorStatus("interagency")).toBe("at_institution");
    expect(toInvestorStatus("completed")).toBe("completed");
  });

  it("derives stage status from the linked case", () => {
    expect(toStageStatus({ hasApplication: false })).toBe("open");
    expect(toStageStatus({ hasApplication: true, caseStatus: "awaiting_info" })).toBe("awaiting_you");
    expect(toStageStatus({ hasApplication: true, caseStatus: "completed" })).toBe("completed");
    expect(toStageStatus({ hasApplication: true, caseStatus: "rejected" })).toBe("problem");
    expect(toStageStatus({ notApplicable: true, hasApplication: false })).toBe("not_applicable");
  });
});
