import { AppError } from "../lib/errors";

export type IdentificationLevel = "basic" | "legal";

/** TZ §7.2 — level-2 action without e-signature must not error; send the user to «Marşrutum». */
export function assertIdentificationLevel(
  current: IdentificationLevel,
  required: IdentificationLevel,
): void {
  if (required === "legal" && current !== "legal") {
    throw new AppError(
      403,
      "IDENTIFICATION_LEVEL",
      "This action needs a legal identification level. Continue via e-signature or a representative on your Route screen.",
      { current, required, next: "route" },
    );
  }
}

export function isInternalRole(roles: string[]): boolean {
  return roles.some((role) =>
    ["case_manager", "supervisor", "institution_rep", "evaluator", "content_manager", "analyst", "sysadmin"].includes(
      role,
    ),
  );
}

export function requiresTwoFactor(roles: string[]): boolean {
  return isInternalRole(roles); // NFR-02
}
