import {
  CaseInternalStatus,
  InvestorVisibleStatus,
} from "@prisma/client";
import {
  STAGE_STATUS,
  investorVisibleStatus,
  type StageStatus,
} from "../db/status-mapping";

export { STAGE_STATUS, investorVisibleStatus };
export type { StageStatus };

/** Investor-visible status is a mapping of case.internal_status (Z-03). */
export function toInvestorStatus(internal: CaseInternalStatus): InvestorVisibleStatus {
  return investorVisibleStatus(internal);
}

export function toStageStatus(input: {
  notApplicable?: boolean;
  locked?: boolean;
  hasApplication: boolean;
  caseStatus?: CaseInternalStatus | null;
}): StageStatus {
  if (input.notApplicable) return STAGE_STATUS.NOT_APPLICABLE;
  if (input.locked) return STAGE_STATUS.LOCKED;
  if (!input.hasApplication || !input.caseStatus || input.caseStatus === CaseInternalStatus.DRAFT) {
    return STAGE_STATUS.OPEN;
  }
  if (input.caseStatus === CaseInternalStatus.WAITING_ADDITIONAL_INFO) {
    return STAGE_STATUS.WAITING_YOUR_RESPONSE;
  }
  if (input.caseStatus === CaseInternalStatus.COMPLETED) return STAGE_STATUS.COMPLETED;
  if (input.caseStatus === CaseInternalStatus.REJECTED) return STAGE_STATUS.PROBLEMATIC;
  return STAGE_STATUS.IN_PROGRESS;
}

export function isWithdrawAllowed(status: CaseInternalStatus): boolean {
  return (
    status === CaseInternalStatus.SUBMITTED ||
    status === CaseInternalStatus.REGISTERED ||
    status === CaseInternalStatus.IN_EVALUATION ||
    status === CaseInternalStatus.UNDER_REVIEW
  );
}
