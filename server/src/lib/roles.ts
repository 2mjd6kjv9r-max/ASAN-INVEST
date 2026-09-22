import type { Prisma, UserRole, UserRoleAssignment } from "@prisma/client";
import { UserRole as Role } from "@prisma/client";

export const INTERNAL_ROLES: UserRole[] = [
  Role.CASE_MANAGER,
  Role.SUPERVISOR,
  Role.INSTITUTION_REP,
  Role.EVALUATOR,
  Role.CONTENT_MANAGER,
  Role.ANALYST,
  Role.SYSADMIN,
];

export const STAFF_ROLES: UserRole[] = [
  Role.CASE_MANAGER,
  Role.SUPERVISOR,
  Role.SYSADMIN,
];

export function isInternalRole(roles: UserRole[]): boolean {
  return roles.some((role) => INTERNAL_ROLES.includes(role));
}

export function requiresTwoFactor(roles: UserRole[]): boolean {
  return isInternalRole(roles);
}

export function hasRole(roles: UserRole[], ...needed: UserRole[]): boolean {
  return needed.some((role) => roles.includes(role));
}

export function activeRoles(assignments: UserRoleAssignment[], now = new Date()): UserRole[] {
  return assignments
    .filter((row) => row.validFrom <= now && (row.validTo === null || row.validTo > now))
    .map((row) => row.role);
}

export const userWithRolesInclude = {
  profile: true,
  roleAssignments: true,
} satisfies Prisma.UserInclude;
