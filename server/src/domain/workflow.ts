import { CaseInternalStatus, UserRole } from "@prisma/client";

/** Fallback transitions matching the seeded Standart workflow (TZ §14.1). */
export const STANDARD_TRANSITIONS: Array<{
  from: CaseInternalStatus;
  to: CaseInternalStatus;
  roles: UserRole[];
}> = [
  { from: CaseInternalStatus.DRAFT, to: CaseInternalStatus.SUBMITTED, roles: [UserRole.INVESTOR] },
  {
    from: CaseInternalStatus.SUBMITTED,
    to: CaseInternalStatus.REGISTERED,
    roles: [UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR],
  },
  {
    from: CaseInternalStatus.REGISTERED,
    to: CaseInternalStatus.IN_EVALUATION,
    roles: [UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.EVALUATOR],
  },
  {
    from: CaseInternalStatus.REGISTERED,
    to: CaseInternalStatus.ASSIGNED_FOR_EXECUTION,
    roles: [UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR],
  },
  {
    from: CaseInternalStatus.IN_EVALUATION,
    to: CaseInternalStatus.ASSIGNED_FOR_EXECUTION,
    roles: [UserRole.EVALUATOR, UserRole.SYSADMIN, UserRole.CASE_MANAGER, UserRole.SUPERVISOR],
  },
  {
    from: CaseInternalStatus.IN_EVALUATION,
    to: CaseInternalStatus.WAITING_ADDITIONAL_INFO,
    roles: [UserRole.EVALUATOR],
  },
  {
    from: CaseInternalStatus.IN_EVALUATION,
    to: CaseInternalStatus.REJECTED,
    roles: [UserRole.SUPERVISOR],
  },
  {
    from: CaseInternalStatus.ASSIGNED_FOR_EXECUTION,
    to: CaseInternalStatus.UNDER_REVIEW,
    roles: [UserRole.CASE_MANAGER],
  },
  {
    from: CaseInternalStatus.UNDER_REVIEW,
    to: CaseInternalStatus.INTER_AGENCY_COORDINATION,
    roles: [UserRole.CASE_MANAGER],
  },
  {
    from: CaseInternalStatus.UNDER_REVIEW,
    to: CaseInternalStatus.WAITING_ADDITIONAL_INFO,
    roles: [UserRole.CASE_MANAGER],
  },
  {
    from: CaseInternalStatus.UNDER_REVIEW,
    to: CaseInternalStatus.RESULT_BEING_PREPARED,
    roles: [UserRole.CASE_MANAGER],
  },
  {
    from: CaseInternalStatus.INTER_AGENCY_COORDINATION,
    to: CaseInternalStatus.WAITING_ADDITIONAL_INFO,
    roles: [UserRole.INSTITUTION_REP],
  },
  {
    from: CaseInternalStatus.INTER_AGENCY_COORDINATION,
    to: CaseInternalStatus.RESULT_BEING_PREPARED,
    roles: [UserRole.CASE_MANAGER],
  },
  {
    from: CaseInternalStatus.WAITING_ADDITIONAL_INFO,
    to: CaseInternalStatus.UNDER_REVIEW,
    roles: [UserRole.INVESTOR],
  },
  {
    from: CaseInternalStatus.WAITING_ADDITIONAL_INFO,
    to: CaseInternalStatus.IN_EVALUATION,
    roles: [UserRole.INVESTOR],
  },
  {
    from: CaseInternalStatus.RESULT_BEING_PREPARED,
    to: CaseInternalStatus.COMPLETED,
    roles: [UserRole.CASE_MANAGER],
  },
  {
    from: CaseInternalStatus.RESULT_BEING_PREPARED,
    to: CaseInternalStatus.REJECTED,
    roles: [UserRole.SUPERVISOR],
  },
  {
    from: CaseInternalStatus.DRAFT,
    to: CaseInternalStatus.WITHDRAWN,
    roles: [UserRole.INVESTOR],
  },
  {
    from: CaseInternalStatus.SUBMITTED,
    to: CaseInternalStatus.WITHDRAWN,
    roles: [UserRole.INVESTOR],
  },
  {
    from: CaseInternalStatus.REGISTERED,
    to: CaseInternalStatus.WITHDRAWN,
    roles: [UserRole.INVESTOR],
  },
  {
    from: CaseInternalStatus.UNDER_REVIEW,
    to: CaseInternalStatus.WITHDRAWN,
    roles: [UserRole.INVESTOR],
  },
  { from: CaseInternalStatus.COMPLETED, to: CaseInternalStatus.ARCHIVED, roles: [UserRole.SYSADMIN, UserRole.SUPERVISOR] },
  { from: CaseInternalStatus.REJECTED, to: CaseInternalStatus.ARCHIVED, roles: [UserRole.SYSADMIN, UserRole.SUPERVISOR] },
  { from: CaseInternalStatus.WITHDRAWN, to: CaseInternalStatus.ARCHIVED, roles: [UserRole.SYSADMIN, UserRole.SUPERVISOR] },
  {
    from: CaseInternalStatus.REJECTED,
    to: CaseInternalStatus.UNDER_REVIEW,
    roles: [UserRole.SUPERVISOR],
  },
];

export function canTransition(
  from: CaseInternalStatus,
  to: CaseInternalStatus,
  roles: UserRole[],
): boolean {
  if (roles.includes(UserRole.SYSADMIN)) {
    return STANDARD_TRANSITIONS.some((row) => row.from === from && row.to === to);
  }
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

export function slaState(
  dueAt: Date | null,
  now = new Date(),
  pausedAt?: Date | null,
): "ok" | "warn" | "overdue" | "paused" {
  if (pausedAt) return "paused";
  if (!dueAt) return "ok";
  const ms = dueAt.getTime() - now.getTime();
  if (ms < 0) return "overdue";
  if (ms <= 2 * 24 * 60 * 60 * 1000) return "warn";
  return "ok";
}
