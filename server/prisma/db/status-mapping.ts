import {
  CaseInternalStatus,
  InvestorVisibleStatus,
} from "@prisma/client";

/**
 * TZ §14.1 — investor-visible status is a mapping of case.internal_status.
 * The ASP.NET API implements the same map in AsanInvest.Domain.StatusMapping (Z-03).
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
