import type { Profile, User, UserRoleAssignment } from "@prisma/client";
import { activeRoles } from "../lib/roles";

export function serializeUser(
  user: User & { profile?: Profile | null; roleAssignments?: UserRoleAssignment[] },
) {
  const roles = user.roleAssignments ? activeRoles(user.roleAssignments) : [];
  return {
    id: user.id,
    email: user.email,
    roles,
    identificationLevel: user.identificationLevel,
    locale: user.locale,
    status: user.status,
    authProvider: user.authProvider,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    twoFactorEnabled: user.twoFactorEnabled,
    institutionId: user.institutionId,
    consents: user.consents,
    consentVersion: user.consentVersion,
    consentedAt: user.consentedAt?.toISOString() ?? null,
    pepSanctionsStatus: user.pepSanctionsStatus,
    pepSanctionsCheckedAt: user.pepSanctionsCheckedAt?.toISOString() ?? null,
    profile: user.profile ? serializeProfile(user.profile) : null,
  };
}

export function serializeProfile(profile: Profile) {
  return {
    id: profile.id,
    countryId: profile.countryId,
    sectorId: profile.sectorId,
    activityAreaId: profile.activityAreaId,
    contacts: profile.contacts,
    companyName: profile.companyName,
    companyCountryId: profile.companyCountryId,
    companyRegId: profile.companyRegId,
    taxId: profile.taxId,
    companyActivity: profile.companyActivity,
    uboStructure: profile.uboStructure,
    version: profile.version,
  };
}
