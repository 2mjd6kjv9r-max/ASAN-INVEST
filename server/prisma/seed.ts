import bcrypt from "bcryptjs";
import {
  AuthProvider,
  CaseInternalStatus,
  CmsStatus,
  Currency,
  Flag,
  IdentificationLevel,
  InvestorVisibleStatus,
  NotificationChannel,
  RuleSetKind,
  UserRole,
  UserStatus,
  WorkflowKind,
} from "@prisma/client";
import { prisma } from "./db/prisma.js";
import { INVESTOR_VISIBLE_STATUS } from "./db/status-mapping.js";

const SYSADMIN_ID = "00000000-0000-4000-8000-000000000001";
const SYSADMIN_PROFILE_ID = "00000000-0000-4000-8000-000000000002";
const SYSADMIN_EMAIL = "sysadmin@asaninvest.local";
const SYSADMIN_PASSWORD = "ChangeMe_Sysadmin_123";

const names = (az: string, en: string) => ({ az, en, ru: en, tr: en, ar: en });

async function seedSysadmin() {
  const passwordHash = await bcrypt.hash(SYSADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: SYSADMIN_EMAIL },
    update: {},
    create: {
      id: SYSADMIN_ID,
      email: SYSADMIN_EMAIL,
      passwordHash,
      identificationLevel: IdentificationLevel.BASIC,
      locale: "az",
      consents: { platform_terms: true },
      consentVersion: "phase1-demo",
      consentedAt: new Date(),
      authProvider: AuthProvider.EMAIL,
      emailVerifiedAt: new Date(),
      twoFactorEnabled: true,
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.userRoleAssignment.deleteMany({ where: { userId: SYSADMIN_ID } });
  await prisma.userRoleAssignment.create({
    data: {
      userId: SYSADMIN_ID,
      role: UserRole.SYSADMIN,
      grantedById: SYSADMIN_ID,
    },
  });
  await prisma.profile.upsert({
    where: { userId: SYSADMIN_ID },
    update: {},
    create: {
      id: SYSADMIN_PROFILE_ID,
      userId: SYSADMIN_ID,
      contacts: { note: "operator account — not an investor profile" },
    },
  });
}

async function seedWorkflow() {
  const rows: {
    internalStatus: CaseInternalStatus;
    sortOrder: number;
    slaWorkingDays: number | null;
    pauseSlaOnThisStatus: boolean;
    isTerminal: boolean;
  }[] = [
    { internalStatus: CaseInternalStatus.DRAFT, sortOrder: 10, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.SUBMITTED, sortOrder: 20, slaWorkingDays: 0, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.REGISTERED, sortOrder: 30, slaWorkingDays: 1, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.IN_EVALUATION, sortOrder: 40, slaWorkingDays: 5, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.WAITING_ADDITIONAL_INFO, sortOrder: 50, slaWorkingDays: 10, pauseSlaOnThisStatus: true, isTerminal: false },
    { internalStatus: CaseInternalStatus.ASSIGNED_FOR_EXECUTION, sortOrder: 60, slaWorkingDays: 1, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.UNDER_REVIEW, sortOrder: 70, slaWorkingDays: 10, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.INTER_AGENCY_COORDINATION, sortOrder: 80, slaWorkingDays: 10, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.RESULT_BEING_PREPARED, sortOrder: 90, slaWorkingDays: 3, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.COMPLETED, sortOrder: 100, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.REJECTED, sortOrder: 110, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.WITHDRAWN, sortOrder: 120, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.ARCHIVED, sortOrder: 130, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
  ];

  for (const row of rows) {
    await prisma.workflowStatus.upsert({
      where: {
        workflow_internalStatus: {
          workflow: WorkflowKind.STANDARD,
          internalStatus: row.internalStatus,
        },
      },
      update: {
        investorVisibleStatus: INVESTOR_VISIBLE_STATUS[row.internalStatus],
        sortOrder: row.sortOrder,
        slaWorkingDays: row.slaWorkingDays,
        pauseSlaOnThisStatus: row.pauseSlaOnThisStatus,
        isTerminal: row.isTerminal,
      },
      create: {
        workflow: WorkflowKind.STANDARD,
        internalStatus: row.internalStatus,
        investorVisibleStatus: INVESTOR_VISIBLE_STATUS[row.internalStatus],
        sortOrder: row.sortOrder,
        slaWorkingDays: row.slaWorkingDays,
        pauseSlaOnThisStatus: row.pauseSlaOnThisStatus,
        isTerminal: row.isTerminal,
      },
    });
  }

  const transitions: {
    from: CaseInternalStatus;
    to: CaseInternalStatus;
    requiredRole?: UserRole;
    requiresReason?: boolean;
  }[] = [
    { from: CaseInternalStatus.DRAFT, to: CaseInternalStatus.SUBMITTED, requiredRole: UserRole.INVESTOR },
    { from: CaseInternalStatus.SUBMITTED, to: CaseInternalStatus.REGISTERED },
    { from: CaseInternalStatus.REGISTERED, to: CaseInternalStatus.IN_EVALUATION },
    { from: CaseInternalStatus.REGISTERED, to: CaseInternalStatus.ASSIGNED_FOR_EXECUTION },
    { from: CaseInternalStatus.IN_EVALUATION, to: CaseInternalStatus.ASSIGNED_FOR_EXECUTION, requiredRole: UserRole.EVALUATOR },
    { from: CaseInternalStatus.IN_EVALUATION, to: CaseInternalStatus.WAITING_ADDITIONAL_INFO, requiredRole: UserRole.EVALUATOR },
    { from: CaseInternalStatus.IN_EVALUATION, to: CaseInternalStatus.REJECTED, requiredRole: UserRole.SUPERVISOR, requiresReason: true },
    { from: CaseInternalStatus.ASSIGNED_FOR_EXECUTION, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.INTER_AGENCY_COORDINATION, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.WAITING_ADDITIONAL_INFO, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.RESULT_BEING_PREPARED, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.INTER_AGENCY_COORDINATION, to: CaseInternalStatus.WAITING_ADDITIONAL_INFO, requiredRole: UserRole.INSTITUTION_REP },
    { from: CaseInternalStatus.INTER_AGENCY_COORDINATION, to: CaseInternalStatus.RESULT_BEING_PREPARED, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.WAITING_ADDITIONAL_INFO, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.INVESTOR },
    { from: CaseInternalStatus.WAITING_ADDITIONAL_INFO, to: CaseInternalStatus.IN_EVALUATION, requiredRole: UserRole.INVESTOR },
    { from: CaseInternalStatus.RESULT_BEING_PREPARED, to: CaseInternalStatus.COMPLETED, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.RESULT_BEING_PREPARED, to: CaseInternalStatus.REJECTED, requiredRole: UserRole.SUPERVISOR, requiresReason: true },
    { from: CaseInternalStatus.DRAFT, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.SUBMITTED, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.REGISTERED, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.COMPLETED, to: CaseInternalStatus.ARCHIVED },
    { from: CaseInternalStatus.REJECTED, to: CaseInternalStatus.ARCHIVED },
    { from: CaseInternalStatus.WITHDRAWN, to: CaseInternalStatus.ARCHIVED },
    { from: CaseInternalStatus.REJECTED, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.SUPERVISOR, requiresReason: true },
  ];

  for (const t of transitions) {
    await prisma.workflowTransition.upsert({
      where: {
        workflow_fromStatus_toStatus: {
          workflow: WorkflowKind.STANDARD,
          fromStatus: t.from,
          toStatus: t.to,
        },
      },
      update: {
        requiredRole: t.requiredRole ?? null,
        requiresReason: t.requiresReason ?? false,
      },
      create: {
        workflow: WorkflowKind.STANDARD,
        fromStatus: t.from,
        toStatus: t.to,
        requiredRole: t.requiredRole,
        requiresReason: t.requiresReason ?? false,
      },
    });
  }
}

async function upsertClassification(
  kind: Parameters<typeof prisma.classification.upsert>[0]["create"]["kind"],
  code: string,
  az: string,
  en: string,
  sortOrder: number,
) {
  return prisma.classification.upsert({
    where: { kind_code: { kind, code } },
    update: { names: names(az, en), sortOrder, isActive: true },
    create: { kind, code, names: names(az, en), sortOrder, isActive: true },
  });
}

async function seedClassifications() {
  await upsertClassification("COUNTRY", "AZ", "Azərbaycan", "Azerbaijan", 1);
  await upsertClassification("COUNTRY", "DE", "Almaniya", "Germany", 2);
  await upsertClassification("COUNTRY", "TR", "Türkiyə", "Türkiye", 3);
  await upsertClassification("COUNTRY", "AE", "Birləşmiş Ərəb Əmirlikləri", "United Arab Emirates", 4);

  await upsertClassification("SECTOR", "agri-processing", "Kənd təsərrüfatı emalı", "Agri-processing", 1);
  await upsertClassification("SECTOR", "chemicals", "Kimya sənayesi", "Chemicals", 2);
  await upsertClassification("SECTOR", "energy", "Energetika", "Energy", 3);
  await upsertClassification("SECTOR", "logistics", "Logistika", "Logistics", 4);

  await upsertClassification("ACTIVITY", "food-packaging", "Qida qablaşdırılması", "Food packaging", 1);
  await upsertClassification("ACTIVITY", "polymer-pipes", "Polimer boru istehsalı", "Polymer pipe manufacturing", 2);

  await upsertClassification("REGION", "baku", "Bakı", "Baku", 1);
  await upsertClassification("REGION", "ganja", "Gəncə", "Ganja", 2);
  await upsertClassification("REGION", "sumqayit", "Sumqayıt", "Sumqayit", 3);
  await upsertClassification("REGION", "karabakh", "Qarabağ", "Karabakh", 4);

  await upsertClassification("ZONE_PARK", "scip", "Sumqayıt Kimya Sənaye Parkı", "Sumqayit Chemical Industrial Park", 1);
  await upsertClassification("ZONE_PARK", "agropark-ganja", "Gəncə aqroparkı", "Ganja agropark", 2);

  await upsertClassification("INSTITUTION", "economy-ministry", "İqtisadiyyat Nazirliyi", "Ministry of Economy", 1);
  await upsertClassification("INSTITUTION", "azerishiq", "Azərişıq ASC", "Azerishiq OJSC", 2);
  await upsertClassification("INSTITUTION", "state-tax-service", "Dövlət Vergi Xidməti", "State Tax Service", 3);
  await upsertClassification("INSTITUTION", "asan", "ASAN", "ASAN", 4);
  await upsertClassification("INSTITUTION", "migration-service", "Dövlət Miqrasiya Xidməti", "State Migration Service", 5);

  await upsertClassification("DOCUMENT_TYPE", "power-of-attorney", "Etibarnamə", "Power of attorney", 1);
  await upsertClassification("DOCUMENT_TYPE", "business-plan", "Biznes-plan", "Business plan", 2);
  await upsertClassification("DOCUMENT_TYPE", "company-extract", "Reyestr çıxarışı", "Company extract", 3);
  await upsertClassification("DOCUMENT_TYPE", "identity-document", "Şəxsiyyət sənədi", "Identity document", 4);
}

async function seedApplicationTypes() {
  const types = [
    {
      code: "investment_intention",
      names: names("İnvestisiya niyyəti", "Investment intention"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: true,
    },
    {
      code: "project_interest",
      names: names("Konkret layihəyə maraq", "Interest in a listed project"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: true,
    },
    {
      code: "consultation",
      names: names("Konsultasiya", "Consultation"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
    },
    {
      code: "partnership_offer",
      names: names("Tərəfdaşlıq təklifi", "Partnership offer"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: true,
    },
    {
      code: "passport_stage",
      names: names("Pasport mərhələsi müraciəti", "Passport-stage application"),
      identificationLevel: IdentificationLevel.LEGAL,
      requiresEvaluation: true,
    },
  ];
  for (const t of types) {
    await prisma.applicationType.upsert({
      where: { code: t.code },
      update: t,
      create: { ...t, workflow: WorkflowKind.STANDARD, isActive: true, formSchema: { fields: [] } },
    });
  }
}

async function seedProcedures() {
  const economy = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "economy-ministry" } },
  });
  const tax = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "state-tax-service" } },
  });
  const azerishiq = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "azerishiq" } },
  });
  const migration = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "migration-service" } },
  });
  const passportType = await prisma.applicationType.findUniqueOrThrow({
    where: { code: "passport_stage" },
  });

  const procedures = [
    {
      code: "company_registration",
      names: names("Şirkət qeydiyyatı (DVX e-xidmətinə yönləndirmə)", "Company registration (redirect to existing STS e-service)"),
      institutionId: tax.id,
      flag: Flag.ONLINE,
      expectedDurationDays: 3,
      eServiceUrl: "https://www.taxes.gov.az",
      sortOrder: 10,
    },
    {
      code: "incentive_certificate",
      names: names("İnvestisiya təşviqi sənədi", "Investment incentive certificate"),
      institutionId: economy.id,
      flag: Flag.ONLINE,
      expectedDurationDays: 15,
      applicationTypeId: passportType.id,
      sortOrder: 20,
    },
    {
      code: "electricity_connection",
      names: names("Elektrik qoşulması", "Electricity connection"),
      institutionId: azerishiq.id,
      flag: Flag.ONLINE,
      expectedDurationDays: 10,
      applicationTypeId: passportType.id,
      sortOrder: 30,
    },
    {
      code: "bank_account",
      names: names("Bank hesabı", "Bank account"),
      institutionId: economy.id,
      flag: Flag.PHYSICAL,
      expectedDurationDays: 10,
      sortOrder: 40,
    },
    {
      code: "temporary_residence",
      names: names("Müvəqqəti yaşamaq icazəsi", "Temporary residence permit"),
      institutionId: migration.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 20,
      applicationTypeId: passportType.id,
      sortOrder: 50,
    },
  ];

  for (const p of procedures) {
    await prisma.procedure.upsert({
      where: { code: p.code },
      update: p,
      create: { ...p, isActive: true },
    });
  }

  const incentive = await prisma.procedure.findUniqueOrThrow({ where: { code: "incentive_certificate" } });
  const electricity = await prisma.procedure.findUniqueOrThrow({ where: { code: "electricity_connection" } });
  await prisma.procedureDependency.deleteMany({ where: { procedureId: electricity.id } });
  await prisma.procedureDependency.create({
    data: { procedureId: electricity.id, dependsOnProcedureId: incentive.id },
  });
}

async function seedRuleSets() {
  const common = {
    approvedById: SYSADMIN_ID,
    effectiveAt: new Date("2026-01-01T00:00:00.000Z"),
  };
  await prisma.ruleSet.upsert({
    where: { kind_version: { kind: RuleSetKind.KYA, version: "1" } },
    update: {},
    create: {
      ...common,
      kind: RuleSetKind.KYA,
      version: "1",
      body: {
        note: "Demo KYA rules — replace via İnzibatçılıq (FR-ADM-07).",
        procedures: [
          "company_registration",
          "incentive_certificate",
          "electricity_connection",
          "bank_account",
        ],
      },
    },
  });
  await prisma.ruleSet.upsert({
    where: { kind_version: { kind: RuleSetKind.INCENTIVE, version: "1" } },
    update: {},
    create: {
      ...common,
      kind: RuleSetKind.INCENTIVE,
      version: "1",
      body: {
        legalAct: "Presidential Decree No. 689 of 19.06.2026 (criteria stored as rules, FR-INC-02)",
        outcomes: ["ELIGIBLE", "CONDITIONALLY_ELIGIBLE", "NOT_ELIGIBLE"],
      },
    },
  });
  await prisma.ruleSet.upsert({
    where: { kind_version: { kind: RuleSetKind.ROUTE, version: "1" } },
    update: {},
    create: {
      ...common,
      kind: RuleSetKind.ROUTE,
      version: "1",
      body: {
        questions: ["country", "sector", "volume", "territory"],
        currencies: [Currency.AZN, Currency.USD, Currency.EUR],
        routes: ["A", "B", "C", "D"],
      },
    },
  });
}

async function seedCms() {
  const pages = [
    {
      pageKey: "HOME",
      slug: "home",
      title: names("ASAN Invest", "ASAN Invest"),
      body: names(
        "İki əsas hərəkət: layihəniz varsa marşrut kalkulyatoru; hazır imkanlara baxış. Qeydiyyat ikinci dərəcəlidir. Göstərici zolağı yalnız təsdiqlənmiş rəqəmlərlə doldurulur.",
        "Two primary actions: route calculator if you have a project; browse listed opportunities. Registration is secondary. The indicator strip is omitted until analytics figures are approved (FR-HOME-04).",
      ),
    },
    {
      pageKey: "WHY",
      slug: "why-azerbaijan",
      title: names("Niyə Azərbaycan?", "Why Azerbaijan?"),
      body: names(
        "Makroiqtisadi mühit, bazarlara çıxış, tənzimləmə və təşviqlər haqqında məlumat. Rəqəmlər təxmini xarakter daşıyır; yekun qərarı səlahiyyətli qurum verir.",
        "Information on the macroeconomic setting, market access, regulation, and incentives. Figures are estimates; competent authorities take final decisions.",
      ),
    },
    {
      pageKey: "OPP",
      slug: "opportunities",
      title: names("İnvestisiya İmkanları", "Investment Opportunities"),
      body: names(
        "Sahələr, layihələr, zona və parklar, regionlar. «Maraq bildir» müraciəti imkan kartına bağlanır.",
        "Sectors, projects, zones and parks, regions. Expressing interest binds the application to the opportunity card.",
      ),
    },
    {
      pageKey: "GUIDE",
      slug: "investor-guide",
      title: names("İnvestor Bələdçisi", "Investor Guide"),
      body: names(
        "Qeydiyyat, vergi, təşviq, torpaq, əmək, miqrasiya və icazələr üzrə addım-addım məlumat. Hər prosedurun bayrağı göstərilir.",
        "Step-by-step information on registration, tax, incentives, land, labour, migration, and permits. Every procedure shows its honesty flag.",
      ),
    },
    {
      pageKey: "ABOUT",
      slug: "about",
      title: names("ASAN Invest haqqında", "About ASAN Invest"),
      body: names(
        "Portal qurumları əvəz etmir; investorla qurumlar arasında tək təmas nöqtəsidir. Operator — ASAN; koordinator — İqtisadiyyat Nazirliyi.",
        "The portal does not replace institutions; it is the investor’s single contact point. Operator: ASAN. Coordinator: Ministry of Economy.",
      ),
    },
  ];

  for (const page of pages) {
    const row = await prisma.cmsContent.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        body: page.body,
        status: CmsStatus.PUBLISHED,
        ownerUserId: SYSADMIN_ID,
        effectiveAt: new Date(),
        publishedAt: new Date(),
      },
      create: {
        ...page,
        status: CmsStatus.PUBLISHED,
        ownerUserId: SYSADMIN_ID,
        effectiveAt: new Date(),
        publishedAt: new Date(),
        version: 1,
      },
    });
    await prisma.cmsContentVersion.upsert({
      where: { contentId_version: { contentId: row.id, version: 1 } },
      update: {},
      create: {
        contentId: row.id,
        version: 1,
        title: page.title,
        body: page.body,
        status: CmsStatus.PUBLISHED,
      },
    });
  }
}

async function seedNotificationTemplates() {
  const events: { eventType: string; mandatory: boolean; az: string; en: string }[] = [
    { eventType: "account.registered", mandatory: true, az: "Hesab yaradıldı. Kabinetdə təsdiq edin.", en: "Account created. Confirm it in the cabinet." },
    { eventType: "account.verified", mandatory: true, az: "E-poçt təsdiqləndi.", en: "Email verified." },
    { eventType: "application.submitted", mandatory: true, az: "Müraciət təqdim edildi: {{number}}.", en: "Application submitted: {{number}}." },
    { eventType: "application.status_changed", mandatory: true, az: "{{number}} statusu dəyişdi.", en: "Status changed for {{number}}." },
    { eventType: "application.result", mandatory: true, az: "{{number}} üzrə nəticə hazırdır. Təfərrüat kabinetdədir.", en: "A result is ready for {{number}}. Details are in the cabinet." },
    { eventType: "application.additional_info_requested", mandatory: true, az: "{{number}} üçün əlavə məlumat tələb olunur.", en: "Additional information is requested for {{number}}." },
    { eventType: "sla.warning", mandatory: true, az: "{{number}} üzrə müddət yaxınlaşır.", en: "A deadline is approaching for {{number}}." },
    { eventType: "sla.overdue", mandatory: true, az: "{{number}} üzrə müddət keçib.", en: "A deadline has passed for {{number}}." },
    { eventType: "sla.escalated", mandatory: true, az: "{{number}} eskalasiya edilib.", en: "{{number}} has been escalated." },
    { eventType: "evaluation.opinion", mandatory: false, az: "{{number}} üzrə rəy daxil olub.", en: "An opinion was recorded for {{number}}." },
    { eventType: "case.decision", mandatory: true, az: "{{number}} üzrə qərar var. Təfərrüat kabinetdədir.", en: "A decision exists for {{number}}. Details are in the cabinet." },
    { eventType: "rules.version_changed", mandatory: false, az: "Qayda versiyası dəyişib. Yenidən hesabla təklif olunur.", en: "A rule version changed. Recalculation is offered." },
    { eventType: "procedure.flag_changed", mandatory: false, az: "Prosedurun bayrağı dəyişib.", en: "A procedure flag changed." },
    { eventType: "document.expiring_30_days", mandatory: true, az: "Sənədin etibarlılıq müddətinə 30 gün qalıb.", en: "A document expires in 30 days." },
  ];

  const roles = [UserRole.INVESTOR, UserRole.CASE_MANAGER, UserRole.SUPERVISOR];
  const channels: NotificationChannel[] = [
    NotificationChannel.PORTAL,
    NotificationChannel.EMAIL,
  ];

  for (const event of events) {
    for (const role of roles) {
      for (const channel of channels) {
        for (const locale of ["az", "en"] as const) {
          const body = locale === "az" ? event.az : event.en;
          await prisma.notificationTemplate.upsert({
            where: {
              eventType_role_locale_channel: {
                eventType: event.eventType,
                role,
                locale,
                channel,
              },
            },
            update: { body, subject: event.eventType, isMandatory: event.mandatory },
            create: {
              eventType: event.eventType,
              role,
              locale,
              channel,
              subject: event.eventType,
              body,
              isMandatory: event.mandatory,
            },
          });
        }
      }
    }
  }
}

async function main() {
  await seedSysadmin();
  await seedWorkflow();
  await seedClassifications();
  await seedApplicationTypes();
  await seedProcedures();
  await seedRuleSets();
  await seedCms();
  await seedNotificationTemplates();
  console.log("Seed complete (sysadmin, Standart workflow, classifications, procedures, rule sets, CMS, templates).");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
