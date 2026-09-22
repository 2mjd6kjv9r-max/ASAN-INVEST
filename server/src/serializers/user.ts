import type { Profile, User } from "@prisma/client";

export function serializeUser(user: User & { profile?: Profile | null }) {
  return {
    id: user.id,
    email: user.email,
    roles: user.roles,
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
    screeningOutcome: user.screeningOutcome,
    profile: user.profile ? serializeProfile(user.profile) : null,
  };
}

export function serializeProfile(profile: Profile) {
  return {
    id: profile.id,
    country: profile.country,
    sector: profile.sector,
    activityArea: profile.activityArea,
    contacts: profile.contacts,
    companyName: profile.companyName,
    companyCountry: profile.companyCountry,
    companyRegId: profile.companyRegId,
    taxId: profile.taxId,
    companyActivity: profile.companyActivity,
    uboStructure: profile.uboStructure,
    version: profile.version,
    guestAnswers: profile.guestAnswers,
  };
}
