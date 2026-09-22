import { AppError } from "../lib/errors";
import { IdentificationLevel, type UserRole } from "@prisma/client";
import { isInternalRole as rolesAreInternal, requiresTwoFactor as rolesNeed2fa } from "../lib/roles";

export { IdentificationLevel };

/** TZ §7.2 — level-2 action without e-signature must not error; send the user to «Marşrutum». */
export function assertIdentificationLevel(
  current: IdentificationLevel,
  required: IdentificationLevel,
): void {
  if (required === IdentificationLevel.LEGAL && current !== IdentificationLevel.LEGAL) {
    throw new AppError(
      403,
      "IDENTIFICATION_LEVEL",
      "This action needs a legal identification level. Continue via e-signature or a representative on your Route screen.",
      { current, required, next: "route" },
    );
  }
}

export function isInternalRole(roles: UserRole[]): boolean {
  return rolesAreInternal(roles);
}

export function requiresTwoFactor(roles: UserRole[]): boolean {
  return rolesNeed2fa(roles);
}
