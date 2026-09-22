import type { CaseInternalStatus } from "@prisma/client";

/** Investor-visible status mapping from TZ §14.1. Never stored separately (Z-03). */
export type InvestorVisibleStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "awaiting_you"
  | "at_institution"
  | "preparing_result"
  | "completed"
  | "rejected"
  | "withdrawn"
  | "archived";

export function toInvestorStatus(internal: CaseInternalStatus | "draft_unsubmitted"): InvestorVisibleStatus {
  switch (internal) {
    case "draft_unsubmitted":
    case "draft":
      return "draft";
    case "submitted":
      return "submitted";
    case "registered":
    case "in_evaluation":
    case "assigned":
    case "in_review":
      return "in_review";
    case "awaiting_info":
      return "awaiting_you";
    case "interagency":
      return "at_institution";
    case "preparing_result":
      return "preparing_result";
    case "completed":
      return "completed";
    case "rejected":
      return "rejected";
    case "withdrawn":
      return "withdrawn";
    case "archived":
      return "archived";
    default:
      return "in_review";
  }
}

/** TZ §10.2 stage status derived from linked case. */
export type StageDisplayStatus =
  | "locked"
  | "open"
  | "in_progress"
  | "awaiting_you"
  | "completed"
  | "problem"
  | "not_applicable";

export function toStageStatus(input: {
  notApplicable?: boolean;
  locked?: boolean;
  hasApplication: boolean;
  caseStatus?: CaseInternalStatus | null;
}): StageDisplayStatus {
  if (input.notApplicable) return "not_applicable";
  if (input.locked) return "locked";
  if (!input.hasApplication || !input.caseStatus || input.caseStatus === "draft") return "open";
  if (input.caseStatus === "awaiting_info") return "awaiting_you";
  if (input.caseStatus === "completed") return "completed";
  if (input.caseStatus === "rejected") return "problem";
  return "in_progress";
}

export function isWithdrawAllowed(status: CaseInternalStatus): boolean {
  return status === "submitted" || status === "registered" || status === "in_evaluation" || status === "assigned";
}
