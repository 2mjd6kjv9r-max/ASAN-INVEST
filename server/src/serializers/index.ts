import type {
  Agency,
  Investment,
  InvestorProfile,
  KycDocument,
  Project,
  ProjectUpdate,
  Sector,
  User,
} from "@prisma/client";
import { money } from "../lib/money";

export function serializeUser(
  user: User,
  profile?: InvestorProfile | null,
  extras?: { kycDocuments?: KycDocument[] },
) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    nationalityType: user.nationalityType,
    preferredLocale: user.preferredLocale,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    profile: profile ? serializeProfile(profile) : null,
    kycDocuments: extras?.kycDocuments?.map(serializeKycDocument),
  };
}

export function serializeProfile(profile: InvestorProfile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    patronymic: profile.patronymic,
    dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : null,
    countryOfCitizenship: profile.countryOfCitizenship,
    fin: profile.fin,
    passportNumber: profile.passportNumber,
    phone: profile.phone,
    addressLine: profile.addressLine,
    city: profile.city,
    country: profile.country,
    kycStatus: profile.kycStatus,
    kycReviewedAt: profile.kycReviewedAt?.toISOString() ?? null,
    kycRejectReason: profile.kycRejectReason,
  };
}

export function serializeKycDocument(doc: KycDocument) {
  return {
    id: doc.id,
    type: doc.type,
    originalName: doc.originalName,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
  };
}

export function serializeNamed(entity: Agency | Sector) {
  return { id: entity.id, slug: entity.slug, nameAz: entity.nameAz, nameEn: entity.nameEn };
}

export function serializeProject(
  project: Project & { agency: Agency; sector: Sector; updates?: ProjectUpdate[] },
) {
  return {
    id: project.id,
    slug: project.slug,
    titleAz: project.titleAz,
    titleEn: project.titleEn,
    summaryAz: project.summaryAz,
    summaryEn: project.summaryEn,
    descriptionAz: project.descriptionAz,
    descriptionEn: project.descriptionEn,
    region: project.region,
    currency: project.currency,
    targetAmount: money(project.targetAmount),
    minInvestment: money(project.minInvestment),
    maxInvestment: project.maxInvestment ? money(project.maxInvestment) : null,
    fundedAmount: money(project.fundedAmount),
    remainingAmount: money(
      project.targetAmount.minus(project.fundedAmount).lt(0)
        ? 0
        : project.targetAmount.minus(project.fundedAmount),
    ),
    status: project.status,
    fundingStartsAt: project.fundingStartsAt.toISOString(),
    fundingEndsAt: project.fundingEndsAt.toISOString(),
    expectedReturnNote: project.expectedReturnNote,
    publishedAt: project.publishedAt?.toISOString() ?? null,
    agency: serializeNamed(project.agency),
    sector: serializeNamed(project.sector),
    updates: project.updates?.map((update) => ({
      id: update.id,
      titleAz: update.titleAz,
      titleEn: update.titleEn,
      bodyAz: update.bodyAz,
      bodyEn: update.bodyEn,
      createdAt: update.createdAt.toISOString(),
    })),
  };
}

export function serializeInvestment(
  investment: Investment & {
    project?: Project & { agency: Agency; sector: Sector };
  },
) {
  return {
    id: investment.id,
    publicRef: investment.publicRef,
    amount: money(investment.amount),
    currency: investment.currency,
    status: investment.status,
    rejectReason: investment.rejectReason,
    createdAt: investment.createdAt.toISOString(),
    updatedAt: investment.updatedAt.toISOString(),
    project: investment.project ? serializeProject(investment.project) : undefined,
    projectId: investment.projectId,
  };
}
