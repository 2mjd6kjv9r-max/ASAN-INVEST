export type User = {
  id: string;
  email: string;
  role: "investor" | "operator" | "admin";
  status: string;
  nationalityType: "azerbaijani_citizen" | "foreign_citizen";
  preferredLocale: "az" | "en";
  profile: Profile | null;
  kycDocuments?: KycDocument[];
};

export type Profile = {
  firstName: string;
  lastName: string;
  patronymic: string | null;
  dateOfBirth: string | null;
  countryOfCitizenship: string | null;
  fin: string | null;
  passportNumber: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  country: string | null;
  kycStatus: "unsubmitted" | "pending" | "approved" | "rejected";
  kycRejectReason: string | null;
};

export type KycDocument = {
  id: string;
  type: string;
  originalName: string;
  status: string;
  createdAt: string;
};

export type Named = { id: string; slug: string; nameAz: string; nameEn: string };

export type Project = {
  id: string;
  slug: string;
  titleAz: string;
  titleEn: string;
  summaryAz: string;
  summaryEn: string;
  descriptionAz: string;
  descriptionEn: string;
  region: string;
  currency: string;
  targetAmount: string;
  minInvestment: string;
  maxInvestment: string | null;
  fundedAmount: string;
  remainingAmount: string;
  status: string;
  fundingStartsAt: string;
  fundingEndsAt: string;
  expectedReturnNote: string | null;
  agency: Named;
  sector: Named;
  updates?: { id: string; titleAz: string; titleEn: string; bodyAz: string; bodyEn: string; createdAt: string }[];
};

export type Investment = {
  id: string;
  publicRef: string;
  amount: string;
  currency: string;
  status: string;
  rejectReason: string | null;
  createdAt: string;
  project?: Project;
  user?: { id: string; email: string };
};
