import {
  CaseInternalStatus,
  InvestorVisibleStatus,
} from "@prisma/client";

/**
 * TZ §14.1 — investor-visible status is a mapping of case.internal_status.
 * Cabinet, passport, and notifications must use this map (Z-03). Do not persist a
 * second status column on applications or stages.
 */
export const INVESTOR_VISIBLE_STATUS: Record<
  CaseInternalStatus,
  InvestorVisibleStatus
> = {
  DRAFT: InvestorVisibleStatus.DRAFT,
  SUBMITTED: InvestorVisibleStatus.SUBMITTED,
  REGISTERED: InvestorVisibleStatus.UNDER_CONSIDERATION,
  IN_EVALUATION: InvestorVisibleStatus.UNDER_CONSIDERATION,
  WAITING_ADDITIONAL_INFO: InvestorVisibleStatus.WAITING_YOUR_RESPONSE,
  ASSIGNED_FOR_EXECUTION: InvestorVisibleStatus.UNDER_CONSIDERATION,
  UNDER_REVIEW: InvestorVisibleStatus.UNDER_CONSIDERATION,
  INTER_AGENCY_COORDINATION: InvestorVisibleStatus.AT_INSTITUTION,
  RESULT_BEING_PREPARED: InvestorVisibleStatus.RESULT_BEING_PREPARED,
  COMPLETED: InvestorVisibleStatus.COMPLETED,
  REJECTED: InvestorVisibleStatus.REJECTED,
  WITHDRAWN: InvestorVisibleStatus.WITHDRAWN,
  ARCHIVED: InvestorVisibleStatus.ARCHIVED,
};

/**
 * TZ §10.2 — stage status is derived, never stored on `stages`.
 * Backend computes this from the linked case (and lock / KYA flags).
 */
export const STAGE_STATUS = {
  LOCKED: "LOCKED",
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  WAITING_YOUR_RESPONSE: "WAITING_YOUR_RESPONSE",
  COMPLETED: "COMPLETED",
  PROBLEMATIC: "PROBLEMATIC",
  NOT_APPLICABLE: "NOT_APPLICABLE",
} as const;

export type StageStatus = (typeof STAGE_STATUS)[keyof typeof STAGE_STATUS];

export function investorVisibleStatus(
  internal: CaseInternalStatus,
): InvestorVisibleStatus {
  return INVESTOR_VISIBLE_STATUS[internal];
}
