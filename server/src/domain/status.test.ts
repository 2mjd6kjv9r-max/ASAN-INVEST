import { describe, expect, it } from "vitest";
import { CaseInternalStatus } from "@prisma/client";
import { toInvestorStatus, toStageStatus, STAGE_STATUS } from "./status";
import { InvestorVisibleStatus } from "@prisma/client";

describe("status mapping Z-03 / TZ §14.1 / §10.2", () => {
  it("maps internal case status to investor-visible labels", () => {
    expect(toInvestorStatus(CaseInternalStatus.DRAFT)).toBe(InvestorVisibleStatus.DRAFT);
    expect(toInvestorStatus(CaseInternalStatus.REGISTERED)).toBe(InvestorVisibleStatus.UNDER_CONSIDERATION);
    expect(toInvestorStatus(CaseInternalStatus.WAITING_ADDITIONAL_INFO)).toBe(
      InvestorVisibleStatus.WAITING_YOUR_RESPONSE,
    );
    expect(toInvestorStatus(CaseInternalStatus.INTER_AGENCY_COORDINATION)).toBe(
      InvestorVisibleStatus.AT_INSTITUTION,
    );
    expect(toInvestorStatus(CaseInternalStatus.COMPLETED)).toBe(InvestorVisibleStatus.COMPLETED);
  });

  it("derives stage status from the linked case", () => {
    expect(toStageStatus({ hasApplication: false })).toBe(STAGE_STATUS.OPEN);
    expect(toStageStatus({ hasApplication: true, caseStatus: CaseInternalStatus.WAITING_ADDITIONAL_INFO })).toBe(
      STAGE_STATUS.WAITING_YOUR_RESPONSE,
    );
    expect(toStageStatus({ hasApplication: true, caseStatus: CaseInternalStatus.COMPLETED })).toBe(
      STAGE_STATUS.COMPLETED,
    );
    expect(toStageStatus({ hasApplication: true, caseStatus: CaseInternalStatus.REJECTED })).toBe(
      STAGE_STATUS.PROBLEMATIC,
    );
    expect(toStageStatus({ notApplicable: true, hasApplication: false })).toBe(STAGE_STATUS.NOT_APPLICABLE);
  });
});
