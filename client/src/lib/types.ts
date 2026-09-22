export type Locale = 'az' | 'en' | 'ru' | 'tr' | 'ar'
export type Localized = Record<string, string>

export type UserRole =
  | 'INVESTOR'
  | 'CASE_MANAGER'
  | 'SUPERVISOR'
  | 'INSTITUTION_REP'
  | 'EVALUATOR'
  | 'OMBUDSMAN_OFFICER'
  | 'CONTENT_MANAGER'
  | 'ANALYST'
  | 'SYSADMIN'

export type IdentificationLevel = 'BASIC' | 'LEGAL'
export type UserStatus = 'ACTIVE' | 'DISABLED'
export type Flag = 'AUTO' | 'ONLINE' | 'PHYSICAL' | 'PLANNED'
export type ProjectStatus = 'PREPARATION' | 'EXECUTION' | 'OPERATION' | 'SUSPENDED' | 'CLOSED'
export type CaseInternalStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'REGISTERED'
  | 'IN_EVALUATION'
  | 'WAITING_ADDITIONAL_INFO'
  | 'ASSIGNED_FOR_EXECUTION'
  | 'UNDER_REVIEW'
  | 'INTER_AGENCY_COORDINATION'
  | 'RESULT_BEING_PREPARED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ARCHIVED'

export type InvestorVisibleStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_CONSIDERATION'
  | 'WAITING_YOUR_RESPONSE'
  | 'AT_INSTITUTION'
  | 'RESULT_BEING_PREPARED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'ARCHIVED'

export type StageDisplayStatus =
  | 'LOCKED'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_YOUR_RESPONSE'
  | 'COMPLETED'
  | 'PROBLEMATIC'
  | 'NOT_APPLICABLE'

export type RepresentationAuthority = 'VIEW' | 'PREPARE' | 'SIGN'
export type Currency = 'AZN' | 'USD' | 'EUR'
export type ClassificationKind =
  | 'SECTOR'
  | 'ACTIVITY'
  | 'REGION'
  | 'COUNTRY'
  | 'ZONE_PARK'
  | 'INSTITUTION'
  | 'DOCUMENT_TYPE'
export type IncentiveOutcome = 'eligible' | 'conditionally_eligible' | 'not_eligible'
export type CmsStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
export type ApplicationSource = 'PASSPORT_STAGE' | 'OPPORTUNITY_CARD' | 'NEW_APPLICATION'

export type ApiErrorBody = {
  error: { code: string; message: string; details?: unknown }
}

export type Classification = {
  id: string
  kind: ClassificationKind
  code: string
  names: Localized
  parentId: string | null
  isActive: boolean
  sortOrder: number
}

export type Procedure = {
  id: string
  code: string
  names: Localized
  flag: Flag
  expectedDurationDays: number | null
  feeAmount: string | null
  feeCurrency: Currency | null
  legalBasis: string | null
  eServiceUrl: string | null
  institution: { id: string; code: string; names: Localized }
}

export type CmsPage = {
  slug: string
  pageKey: string
  locale: string
  title: string
  body: string
  titleI18n?: Localized
  bodyI18n?: Localized
  publishedAt: string | null
  version: number
}

export type Opportunities = {
  catalogue: { slug: string; title: string; body: string }[]
  zones: { id: string; code: string; names: Localized }[]
}

export type FeeLine = { label: string; amount: string; currency: string }
export type PoliteStop = { code: string; message: string }

export type RouteResult = {
  estimated: boolean
  registrationRoute: string
  legalForm: string
  legalization: string
  visaNote: string
  residenceBasis: boolean
  estimatedWorkingDays: number
  physicalContactsInAzerbaijan: number
  stateFees: FeeLine[]
  partnerFees: FeeLine[]
  politeStop: PoliteStop | null
  ruleVersion?: string
  id?: string
}

export type IncentiveResult = {
  id?: string
  outcome: IncentiveOutcome
  explanationAz: string
  explanationEn: string
  legalCitation: string
  estimatedSavingNote: string | null
  alternatives: string[]
  ruleVersion?: string
}

export type KyaProcedure = {
  code: string
  reason: string
  ruleVersion: string
  names: Localized | null
  institutionId?: string | null
  flag?: Flag | null
  expectedDurationDays?: number | null
}

export type KyaEvaluateResult = {
  needsConfirmation?: boolean
  extracted?: unknown
  message?: string
  procedures?: KyaProcedure[]
  ruleSetId?: string
  ruleVersion?: string
  id?: string
}

export type Profile = {
  id: string
  countryId: string | null
  sectorId: string | null
  activityAreaId: string | null
  contacts: unknown
  companyName: string | null
  companyCountryId: string | null
  companyRegId: string | null
  taxId: string | null
  companyActivity: string | null
  uboStructure: unknown
  version: number
}

export type User = {
  id: string
  email: string
  roles: UserRole[]
  identificationLevel: IdentificationLevel
  locale: string
  status: UserStatus
  authProvider: string
  emailVerifiedAt: string | null
  twoFactorEnabled: boolean
  institutionId: string | null
  consents: unknown
  consentVersion: string | null
  consentedAt: string | null
  pepSanctionsStatus: string | null
  pepSanctionsCheckedAt: string | null
  profile: Profile | null
}

export type AuthSuccess = { accessToken: string; user: User }
export type TwoFactorChallenge = { twoFactorRequired: true; challengeId: string }

export type CabinetDashboard = {
  nextStep: { title: string; action: string; projectName: string | null }
  applications: { id: string; publicNumber: string | null; type: string; investorStatus: InvestorVisibleStatus }[]
  notifications: { id: string; eventType: string; body: string; readAt: string | null; createdAt: string }[]
}

export type ProjectListItem = {
  id: string
  name: string
  volumeAmount: string
  volumeCurrency: Currency
  sizeCategory: string
  status: ProjectStatus
  stages: { id: string; flag: Flag; sortOrder: number; expectedDurationDays: number | null; displayStatus: StageDisplayStatus }[]
}

export type ProjectDetail = {
  id: string
  name: string
  volumeAmount: string
  status: ProjectStatus
  stages: {
    id: string
    flag: Flag
    sortOrder: number
    expectedDurationDays: number | null
    procedure: { code: string; names: Localized }
    displayStatus: StageDisplayStatus
  }[]
}

export type FormField = {
  name: string
  required?: boolean
  type?: string
  label?: Localized | string
}

export type ApplicationType = {
  id: string
  code: string
  names: Localized
  identificationLevel: IdentificationLevel
  requiresEvaluation: boolean
  formSchema: { fields?: FormField[] } | null
  workflow: string
  isActive: boolean
}

export type ApplicationDto = {
  id: string
  publicNumber: string | null
  type: { code: string; names: Localized }
  source: ApplicationSource
  answers: unknown
  snapshot: unknown
  submittedAt: string | null
  investorStatus: InvestorVisibleStatus
  nextStep: string | null
  finalResult: unknown
  messages?: { id: string; body: string; createdAt: string; isInternal?: boolean }[]
}

export type CaseListItem = {
  id: string
  internalStatus: CaseInternalStatus
  investorStatus: InvestorVisibleStatus
  slaDueAt: string | null
  slaState: string
  escalatedAt: string | null
  publicNumber: string | null
  type: string
  caseManager: { id: string; email: string } | null
  taskCount: number
}

export type CaseDetail = {
  id: string
  applicationId: string
  internalStatus: CaseInternalStatus
  caseManagerId: string | null
  slaDueAt: string | null
  registeredAt: string | null
  closedAt: string | null
  pausedAt: string | null
  escalatedAt: string | null
  finalResult: unknown
  application: { id: string; publicNumber: string | null; type: { code: string; names: Localized } }
  tasks: TaskDto[]
  evaluations: EvaluationDto[]
  caseManager: { id: string; email: string } | null
  extraInfoRequests: TaskDto[]
  reopenReason?: string | null
}

export type TaskDto = {
  id: string
  caseId: string
  institutionId: string
  assigneeUserId: string | null
  dueAt: string
  status: string
  opinion: string | null
  completedAt: string | null
}

export type EvaluationDto = {
  id: string
  caseId: string
  userId: string
  route: string
  opinion: string | null
  dueAt: string | null
}

export type Representation = {
  id: string
  authority: RepresentationAuthority
  validFrom: string
  validTo: string | null
  revokedAt: string | null
  representativeUser?: { id: string; email: string }
}

export type DocumentDto = {
  id: string
  typeCode?: string
  originalName?: string
  mimeType?: string
  createdAt?: string
}

export type NotificationDto = {
  id: string
  eventType: string
  body: string
  readAt: string | null
  createdAt: string
}

export type AnalyticsOverview = {
  applications: { total: number; submitted: number; byStatus: { internalStatus: CaseInternalStatus; count: number }[] }
  kyaCalculations: number
  cases: { total: number; completed: number; overdue: number; escalated: number }
  publicKpisApproved: boolean
}

export const INTERNAL_ROLES: UserRole[] = [
  'CASE_MANAGER',
  'SUPERVISOR',
  'INSTITUTION_REP',
  'EVALUATOR',
  'CONTENT_MANAGER',
  'ANALYST',
  'SYSADMIN',
]

export function isInternal(roles: UserRole[]) {
  return roles.some((role) => INTERNAL_ROLES.includes(role))
}

export function pickName(names: Localized | null | undefined, locale: string, fallback = '') {
  if (!names) return fallback
  return names[locale] || names.en || names.az || Object.values(names)[0] || fallback
}
