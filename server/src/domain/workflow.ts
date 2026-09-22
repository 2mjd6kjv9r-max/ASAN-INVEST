import type { CaseInternalStatus, UserRole } from "@prisma/client";

export const STANDARD_TRANSITIONS: Array<{
  from: CaseInternalStatus;
  to: CaseInternalStatus;
  roles: UserRole[];
}> = [
  { from: "draft", to: "submitted", roles: ["investor"] },
  { from: "submitted", to: "registered", roles: ["sysadmin", "case_manager", "supervisor"] },
  { from: "registered", to: "in_evaluation", roles: ["sysadmin", "case_manager", "supervisor", "evaluator"] },
  { from: "registered", to: "assigned", roles: ["sysadmin", "case_manager", "supervisor"] },
  { from: "in_evaluation", to: "assigned", roles: ["sysadmin", "case_manager", "supervisor", "evaluator"] },
  { from: "in_evaluation", to: "awaiting_info", roles: ["evaluator", "case_manager", "supervisor"] },
  { from: "assigned", to: "in_review", roles: ["case_manager", "supervisor"] },
  { from: "in_review", to: "interagency", roles: ["case_manager", "supervisor"] },
  { from: "in_review", to: "awaiting_info", roles: ["case_manager", "supervisor", "institution_rep"] },
  { from: "interagency", to: "awaiting_info", roles: ["institution_rep", "case_manager", "supervisor"] },
  { from: "interagency", to: "preparing_result", roles: ["case_manager", "supervisor"] },
  { from: "in_review", to: "preparing_result", roles: ["case_manager", "supervisor"] },
  { from: "awaiting_info", to: "in_review", roles: ["investor", "case_manager", "supervisor"] },
  { from: "awaiting_info", to: "interagency", roles: ["investor", "case_manager", "supervisor"] },
  { from: "preparing_result", to: "completed", roles: ["case_manager", "supervisor"] },
  { from: "preparing_result", to: "rejected", roles: ["case_manager", "supervisor"] },
  { from: "submitted", to: "withdrawn", roles: ["investor"] },
  { from: "registered", to: "withdrawn", roles: ["investor"] },
  { from: "in_evaluation", to: "withdrawn", roles: ["investor"] },
  { from: "assigned", to: "withdrawn", roles: ["investor"] },
  { from: "completed", to: "archived", roles: ["sysadmin", "supervisor"] },
  { from: "rejected", to: "archived", roles: ["sysadmin", "supervisor"] },
  { from: "withdrawn", to: "archived", roles: ["sysadmin", "supervisor"] },
  { from: "rejected", to: "assigned", roles: ["supervisor"] }, // FR-CASE-07 reopen
  { from: "completed", to: "assigned", roles: ["supervisor"] },
];

export function canTransition(
  from: CaseInternalStatus,
  to: CaseInternalStatus,
  roles: UserRole[],
): boolean {
  return STANDARD_TRANSITIONS.some(
    (row) => row.from === from && row.to === to && row.roles.some((role) => roles.includes(role)),
  );
}

export function addWorkingDays(from: Date, days: number, holidays: string[] = []): Date {
  const holiday = new Set(holidays);
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  let added = 0;
  while (added < days) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const iso = cursor.toISOString().slice(0, 10);
    const weekday = cursor.getUTCDay();
    if (weekday === 0 || weekday === 6 || holiday.has(iso)) {
      continue;
    }
    added += 1;
  }
  return cursor;
}

export function slaState(dueAt: Date | null, now = new Date()): "ok" | "warn" | "overdue" {
  if (!dueAt) return "ok";
  const ms = dueAt.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= 2 * 24 * 60 * 60 * 1000) return "warn";
  return "ok";
}
