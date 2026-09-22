import bcrypt from "bcryptjs";
import {
  AccreditationStatus,
  AuthProvider,
  CaseInternalStatus,
  CmsStatus,
  Currency,
  Flag,
  IdentificationLevel,
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

const OMBUDSMAN_ID = "00000000-0000-4000-8000-000000000003";
const OMBUDSMAN_PROFILE_ID = "00000000-0000-4000-8000-000000000004";
const OMBUDSMAN_EMAIL = "ombudsman@asaninvest.local";
const OMBUDSMAN_PASSWORD = "ChangeMe_Ombudsman_123";

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

async function seedOmbudsmanOfficer() {
  const passwordHash = await bcrypt.hash(OMBUDSMAN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: OMBUDSMAN_EMAIL },
    update: { twoFactorEnabled: true, status: UserStatus.ACTIVE },
    create: {
      id: OMBUDSMAN_ID,
      email: OMBUDSMAN_EMAIL,
      passwordHash,
      identificationLevel: IdentificationLevel.BASIC,
      locale: "az",
      consents: { platform_terms: true },
      consentVersion: "phase2-demo",
      consentedAt: new Date(),
      authProvider: AuthProvider.EMAIL,
      emailVerifiedAt: new Date(),
      twoFactorEnabled: true,
      status: UserStatus.ACTIVE,
    },
  });
  await prisma.userRoleAssignment.deleteMany({ where: { userId: OMBUDSMAN_ID } });
  await prisma.userRoleAssignment.create({
    data: {
      userId: OMBUDSMAN_ID,
      role: UserRole.OMBUDSMAN_OFFICER,
      grantedById: SYSADMIN_ID,
    },
  });
  await prisma.profile.upsert({
    where: { userId: OMBUDSMAN_ID },
    update: {},
    create: {
      id: OMBUDSMAN_PROFILE_ID,
      userId: OMBUDSMAN_ID,
      contacts: { note: "Ombudsman officer — internal role, 2FA (NFR-02)" },
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

type WorkflowStatusSeed = {
  internalStatus: CaseInternalStatus;
  sortOrder: number;
  slaWorkingDays: number | null;
  pauseSlaOnThisStatus: boolean;
  isTerminal: boolean;
};

type WorkflowTransitionSeed = {
  from: CaseInternalStatus;
  to: CaseInternalStatus;
  requiredRole?: UserRole;
  requiresReason?: boolean;
};

async function upsertWorkflow(kind: WorkflowKind, statuses: WorkflowStatusSeed[], transitions: WorkflowTransitionSeed[]) {
  for (const row of statuses) {
    await prisma.workflowStatus.upsert({
      where: {
        workflow_internalStatus: {
          workflow: kind,
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
        workflow: kind,
        internalStatus: row.internalStatus,
        investorVisibleStatus: INVESTOR_VISIBLE_STATUS[row.internalStatus],
        sortOrder: row.sortOrder,
        slaWorkingDays: row.slaWorkingDays,
        pauseSlaOnThisStatus: row.pauseSlaOnThisStatus,
        isTerminal: row.isTerminal,
      },
    });
  }
  for (const t of transitions) {
    await prisma.workflowTransition.upsert({
      where: {
        workflow_fromStatus_toStatus: {
          workflow: kind,
          fromStatus: t.from,
          toStatus: t.to,
        },
      },
      update: {
        requiredRole: t.requiredRole ?? null,
        requiresReason: t.requiresReason ?? false,
      },
      create: {
        workflow: kind,
        fromStatus: t.from,
        toStatus: t.to,
        requiredRole: t.requiredRole,
        requiresReason: t.requiresReason ?? false,
      },
    });
  }
}

async function seedOmbudsmanAftercareWorkflows() {
  const ombStatuses: WorkflowStatusSeed[] = [
    { internalStatus: CaseInternalStatus.DRAFT, sortOrder: 10, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.SUBMITTED, sortOrder: 20, slaWorkingDays: 0, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.REGISTERED, sortOrder: 30, slaWorkingDays: 1, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.UNDER_INVESTIGATION, sortOrder: 40, slaWorkingDays: 10, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.WAITING_ADDITIONAL_INFO, sortOrder: 50, slaWorkingDays: 10, pauseSlaOnThisStatus: true, isTerminal: false },
    { internalStatus: CaseInternalStatus.INTER_AGENCY_COORDINATION, sortOrder: 60, slaWorkingDays: 10, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.IN_MEDIATION, sortOrder: 70, slaWorkingDays: 10, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.OPINION_PREPARED, sortOrder: 80, slaWorkingDays: 5, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.OPINION_PENDING_APPROVAL, sortOrder: 90, slaWorkingDays: 3, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.COMPLETED, sortOrder: 100, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.REJECTED, sortOrder: 110, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.WITHDRAWN, sortOrder: 120, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.ARCHIVED, sortOrder: 130, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
  ];
  const ombTransitions: WorkflowTransitionSeed[] = [
    { from: CaseInternalStatus.DRAFT, to: CaseInternalStatus.SUBMITTED, requiredRole: UserRole.INVESTOR },
    { from: CaseInternalStatus.SUBMITTED, to: CaseInternalStatus.REGISTERED },
    { from: CaseInternalStatus.REGISTERED, to: CaseInternalStatus.UNDER_INVESTIGATION, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.UNDER_INVESTIGATION, to: CaseInternalStatus.WAITING_ADDITIONAL_INFO, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.UNDER_INVESTIGATION, to: CaseInternalStatus.INTER_AGENCY_COORDINATION, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.UNDER_INVESTIGATION, to: CaseInternalStatus.IN_MEDIATION, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.UNDER_INVESTIGATION, to: CaseInternalStatus.OPINION_PREPARED, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.WAITING_ADDITIONAL_INFO, to: CaseInternalStatus.UNDER_INVESTIGATION, requiredRole: UserRole.INVESTOR },
    { from: CaseInternalStatus.INTER_AGENCY_COORDINATION, to: CaseInternalStatus.UNDER_INVESTIGATION, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.INTER_AGENCY_COORDINATION, to: CaseInternalStatus.WAITING_ADDITIONAL_INFO, requiredRole: UserRole.INSTITUTION_REP },
    { from: CaseInternalStatus.IN_MEDIATION, to: CaseInternalStatus.OPINION_PREPARED, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.OPINION_PREPARED, to: CaseInternalStatus.OPINION_PENDING_APPROVAL, requiredRole: UserRole.OMBUDSMAN_OFFICER },
    { from: CaseInternalStatus.OPINION_PENDING_APPROVAL, to: CaseInternalStatus.OPINION_PREPARED, requiredRole: UserRole.SUPERVISOR, requiresReason: true },
    { from: CaseInternalStatus.OPINION_PENDING_APPROVAL, to: CaseInternalStatus.COMPLETED, requiredRole: UserRole.SUPERVISOR },
    { from: CaseInternalStatus.OPINION_PENDING_APPROVAL, to: CaseInternalStatus.REJECTED, requiredRole: UserRole.SUPERVISOR, requiresReason: true },
    { from: CaseInternalStatus.DRAFT, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.SUBMITTED, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.REGISTERED, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.UNDER_INVESTIGATION, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.COMPLETED, to: CaseInternalStatus.ARCHIVED },
    { from: CaseInternalStatus.REJECTED, to: CaseInternalStatus.ARCHIVED },
    { from: CaseInternalStatus.WITHDRAWN, to: CaseInternalStatus.ARCHIVED },
  ];
  await upsertWorkflow(WorkflowKind.OMBUDSMAN, ombStatuses, ombTransitions);

  const aftStatuses: WorkflowStatusSeed[] = [
    { internalStatus: CaseInternalStatus.DRAFT, sortOrder: 10, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.SUBMITTED, sortOrder: 20, slaWorkingDays: 0, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.REGISTERED, sortOrder: 30, slaWorkingDays: 1, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.UNDER_REVIEW, sortOrder: 40, slaWorkingDays: 10, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.WAITING_ADDITIONAL_INFO, sortOrder: 50, slaWorkingDays: 10, pauseSlaOnThisStatus: true, isTerminal: false },
    { internalStatus: CaseInternalStatus.INTER_AGENCY_COORDINATION, sortOrder: 60, slaWorkingDays: 10, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.NEXT_CONTACT_PLANNED, sortOrder: 70, slaWorkingDays: null, pauseSlaOnThisStatus: true, isTerminal: false },
    { internalStatus: CaseInternalStatus.IN_MONITORING, sortOrder: 80, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: false },
    { internalStatus: CaseInternalStatus.COMPLETED, sortOrder: 90, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.REJECTED, sortOrder: 100, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.WITHDRAWN, sortOrder: 110, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
    { internalStatus: CaseInternalStatus.ARCHIVED, sortOrder: 120, slaWorkingDays: null, pauseSlaOnThisStatus: false, isTerminal: true },
  ];
  const aftTransitions: WorkflowTransitionSeed[] = [
    { from: CaseInternalStatus.DRAFT, to: CaseInternalStatus.SUBMITTED, requiredRole: UserRole.INVESTOR },
    { from: CaseInternalStatus.SUBMITTED, to: CaseInternalStatus.REGISTERED },
    { from: CaseInternalStatus.REGISTERED, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.WAITING_ADDITIONAL_INFO, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.INTER_AGENCY_COORDINATION, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.NEXT_CONTACT_PLANNED, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.IN_MONITORING, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.COMPLETED, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.WAITING_ADDITIONAL_INFO, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.INVESTOR },
    { from: CaseInternalStatus.INTER_AGENCY_COORDINATION, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.INTER_AGENCY_COORDINATION, to: CaseInternalStatus.WAITING_ADDITIONAL_INFO, requiredRole: UserRole.INSTITUTION_REP },
    { from: CaseInternalStatus.NEXT_CONTACT_PLANNED, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.NEXT_CONTACT_PLANNED, to: CaseInternalStatus.IN_MONITORING, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.IN_MONITORING, to: CaseInternalStatus.NEXT_CONTACT_PLANNED, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.IN_MONITORING, to: CaseInternalStatus.UNDER_REVIEW, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.IN_MONITORING, to: CaseInternalStatus.COMPLETED, requiredRole: UserRole.CASE_MANAGER },
    { from: CaseInternalStatus.DRAFT, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.SUBMITTED, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.REGISTERED, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.UNDER_REVIEW, to: CaseInternalStatus.WITHDRAWN, requiredRole: UserRole.INVESTOR, requiresReason: true },
    { from: CaseInternalStatus.COMPLETED, to: CaseInternalStatus.ARCHIVED },
    { from: CaseInternalStatus.REJECTED, to: CaseInternalStatus.ARCHIVED },
    { from: CaseInternalStatus.WITHDRAWN, to: CaseInternalStatus.ARCHIVED },
  ];
  await upsertWorkflow(WorkflowKind.AFTERCARE, aftStatuses, aftTransitions);
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
  await upsertClassification("INSTITUTION", "dvx", "Dövlət Vergi Xidməti (DVX)", "State Tax Service (DVX)", 6);
  await upsertClassification("INSTITUTION", "asan", "ASAN", "ASAN", 4);
  await upsertClassification("INSTITUTION", "migration-service", "Dövlət Miqrasiya Xidməti", "State Migration Service", 5);
  await upsertClassification("INSTITUTION", "pilot-bank-a", "Pilot bank A (KYC)", "Pilot bank A (KYC)", 10);
  await upsertClassification("INSTITUTION", "pilot-bank-b", "Pilot bank B (KYC)", "Pilot bank B (KYC)", 11);
  await upsertClassification("INSTITUTION", "dxa", "Dövlət Xidmətləri Agentliyi (ASAN Viza)", "State Agency for Public Service (ASAN Visa)", 12);
  await upsertClassification("INSTITUTION", "dgk", "Dövlət Gömrük Komitəsi", "State Customs Committee", 13);
  await upsertClassification("INSTITUTION", "azeriqaz", "Azəriqaz", "Azerigaz", 14);
  await upsertClassification("INSTITUTION", "water-resources", "Su Ehtiyatları Agentliyi", "Water Resources Agency", 15);
  await upsertClassification("INSTITUTION", "urban-planning", "Dövlət Şəhərsalma və Arxitektura Komitəsi", "State Committee on Urban Planning and Architecture", 16);
  await upsertClassification("INSTITUTION", "emdx", "Əmlak Məsələləri Dövlət Xidməti", "State Service on Property Issues", 17);
  await upsertClassification("INSTITUTION", "justice-ministry", "Ədliyyə Nazirliyi", "Ministry of Justice", 18);

  await upsertClassification("DOCUMENT_TYPE", "power-of-attorney", "Etibarnamə", "Power of attorney", 1);
  await upsertClassification("DOCUMENT_TYPE", "business-plan", "Biznes-plan", "Business plan", 2);
  await upsertClassification("DOCUMENT_TYPE", "company-extract", "Reyestr çıxarışı", "Company extract", 3);
  await upsertClassification("DOCUMENT_TYPE", "identity-document", "Şəxsiyyət sənədi", "Identity document", 4);
}

async function seedApplicationTypes() {
  const types: {
    code: string;
    names: ReturnType<typeof names>;
    identificationLevel: IdentificationLevel;
    requiresEvaluation: boolean;
    workflow: WorkflowKind;
    formSchema: object;
  }[] = [
    {
      code: "investment_intention",
      names: names("İnvestisiya niyyəti", "Investment intention"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: true,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [] },
    },
    {
      code: "project_interest",
      names: names("Konkret layihəyə maraq", "Interest in a listed project"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: true,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [] },
    },
    {
      code: "consultation",
      names: names("Konsultasiya", "Consultation"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [] },
    },
    {
      code: "partnership_offer",
      names: names("Tərəfdaşlıq təklifi", "Partnership offer"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: true,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [] },
    },
    {
      code: "passport_stage",
      names: names("Pasport mərhələsi müraciəti", "Passport-stage application"),
      identificationLevel: IdentificationLevel.LEGAL,
      requiresEvaluation: true,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [] },
    },
    {
      code: "ombudsman",
      names: names("Ombudsman müraciəti", "Ombudsman application"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
      workflow: WorkflowKind.OMBUDSMAN,
      formSchema: {
        fields: [
          { name: "problemDescription", required: true },
          { name: "requestedRemedy", required: false },
          { name: "linkedCaseId", required: false },
        ],
      },
    },
    {
      code: "aftercare",
      names: names("Aftercare müraciəti", "Aftercare application"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
      workflow: WorkflowKind.AFTERCARE,
      formSchema: {
        fields: [
          { name: "category", required: true, values: [
            "administrative_procedural",
            "institution_coordination",
            "expansion",
            "reinvestment",
            "permit_licence",
            "other",
          ] },
          { name: "description", required: true },
          { name: "nextContactDate", required: false },
        ],
      },
    },
    {
      code: "company_registration",
      names: names("Şirkət qeydiyyatı", "Company registration"),
      identificationLevel: IdentificationLevel.LEGAL,
      requiresEvaluation: false,
      workflow: WorkflowKind.STANDARD,
      formSchema: {
        fields: [
          { name: "companyName", required: true },
          { name: "legalForm", required: true },
          { name: "founders", required: true },
        ],
      },
    },
    {
      code: "bank_kyc",
      names: names("Bank KYC paketi", "Bank KYC packet"),
      identificationLevel: IdentificationLevel.LEGAL,
      requiresEvaluation: false,
      workflow: WorkflowKind.STANDARD,
      formSchema: {
        fields: [
          { name: "ubo", required: true },
          { name: "sourceOfFunds", required: true },
          { name: "fatcaCrs", required: true },
          { name: "activity", required: true },
          { name: "bankChannel", required: false, values: ["PHYSICAL_SIGNATURE", "REMOTE_ESIGN"] },
        ],
      },
    },
    {
      code: "visa",
      names: names("ASAN Viza", "ASAN Visa"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [{ name: "travelPurpose", required: false }] },
    },
    {
      code: "customs_incentive",
      names: names("Gömrük güzəşti (idxal)", "Customs incentive (import)"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [{ name: "equipmentDescription", required: true }] },
    },
    {
      code: "utility_connection",
      names: names("Kommunal qoşulma", "Utility connection"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [{ name: "utilityKind", required: true, values: ["electricity", "gas", "water"] }] },
    },
    {
      code: "e_residency",
      names: names("E-rezidentlik marağı", "E-residency interest"),
      identificationLevel: IdentificationLevel.BASIC,
      requiresEvaluation: false,
      workflow: WorkflowKind.STANDARD,
      formSchema: { fields: [{ name: "motivation", required: false }] },
    },
  ];
  for (const t of types) {
    await prisma.applicationType.upsert({
      where: { code: t.code },
      update: {
        names: t.names,
        identificationLevel: t.identificationLevel,
        requiresEvaluation: t.requiresEvaluation,
        workflow: t.workflow,
        isActive: true,
        formSchema: t.formSchema,
      },
      create: {
        code: t.code,
        names: t.names,
        identificationLevel: t.identificationLevel,
        requiresEvaluation: t.requiresEvaluation,
        workflow: t.workflow,
        isActive: true,
        formSchema: t.formSchema,
      },
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
  const dxa = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "dxa" } },
  });
  const dgk = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "dgk" } },
  });
  const azeriqaz = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "azeriqaz" } },
  });
  const water = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "water-resources" } },
  });
  const urban = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "urban-planning" } },
  });
  const justice = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "justice-ministry" } },
  });
  const asan = await prisma.classification.findUniqueOrThrow({
    where: { kind_code: { kind: "INSTITUTION", code: "asan" } },
  });
  const passportType = await prisma.applicationType.findUniqueOrThrow({
    where: { code: "passport_stage" },
  });
  const visaType = await prisma.applicationType.findUniqueOrThrow({ where: { code: "visa" } });
  const customsType = await prisma.applicationType.findUniqueOrThrow({ where: { code: "customs_incentive" } });
  const utilityType = await prisma.applicationType.findUniqueOrThrow({ where: { code: "utility_connection" } });
  const eResidencyType = await prisma.applicationType.findUniqueOrThrow({ where: { code: "e_residency" } });

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
      names: names(
        "Elektrik qoşulması (PLAN — canlı Azərişıq adapteri yoxdur)",
        "Electricity connection (PLAN — no live Azerishiq adapter)",
      ),
      institutionId: azerishiq.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 10,
      applicationTypeId: utilityType.id,
      integrationCode: "electricity",
      legalBasis: "TZ §22 kommunal. Seed previously marked ONLINE; no live API spec is in-repo.",
      sortOrder: 30,
    },
    {
      code: "bank_account",
      names: names("Bank hesabı", "Bank account"),
      institutionId: economy.id,
      flag: Flag.PHYSICAL,
      expectedDurationDays: 10,
      integrationCode: "remote_bank",
      legalBasis: "Remote e-sign channel is PLAN until TZ §22.1 / Mərkəzi Bank. Platform does not open accounts.",
      sortOrder: 40,
    },
    {
      code: "temporary_residence",
      names: names("Müvəqqəti yaşamaq icazəsi", "Temporary residence permit"),
      institutionId: migration.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 20,
      applicationTypeId: passportType.id,
      integrationCode: "migration",
      legalBasis: "TZ §25.3 item 6: biometrics stay PHYSICAL until the coordinator answers.",
      sortOrder: 50,
    },
    {
      code: "visa",
      names: names("ASAN Viza (PLAN)", "ASAN Visa (PLAN)"),
      institutionId: dxa.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 15,
      applicationTypeId: visaType.id,
      integrationCode: "visa",
      sortOrder: 60,
    },
    {
      code: "customs_incentive",
      names: names("Gömrük güzəşti — idxal (PLAN)", "Customs incentive — import (PLAN)"),
      institutionId: dgk.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 20,
      applicationTypeId: customsType.id,
      integrationCode: "customs",
      sortOrder: 70,
    },
    {
      code: "gas_connection",
      names: names("Qaz qoşulması (PLAN)", "Gas connection (PLAN)"),
      institutionId: azeriqaz.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 15,
      applicationTypeId: utilityType.id,
      integrationCode: "gas",
      sortOrder: 80,
    },
    {
      code: "water_connection",
      names: names("Su qoşulması (PLAN)", "Water connection (PLAN)"),
      institutionId: water.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 15,
      applicationTypeId: utilityType.id,
      integrationCode: "water",
      sortOrder: 90,
    },
    {
      code: "work_permit",
      names: names("İş icazəsi (PLAN)", "Work permit (PLAN)"),
      institutionId: migration.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 20,
      applicationTypeId: passportType.id,
      integrationCode: "migration",
      legalBasis: "Biometrics remain PHYSICAL until TZ §25.3 item 6. Do not claim remote biometrics.",
      sortOrder: 100,
    },
    {
      code: "e_notary",
      names: names("Elektron notariat (PLAN)", "Electronic notary (PLAN)"),
      institutionId: justice.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 10,
      integrationCode: "notary",
      sortOrder: 110,
    },
    {
      code: "construction_permit",
      names: names("Tikinti icazəsi (PLAN)", "Construction permit (PLAN)"),
      institutionId: urban.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 30,
      applicationTypeId: passportType.id,
      integrationCode: "planning",
      legalBasis: "FR-PROJ-06: do not invent FAR/height numbers.",
      sortOrder: 120,
    },
    {
      code: "zoning_prequery",
      names: names("Zonalaşdırma sorğusu (PLAN)", "Zoning pre-query (PLAN)"),
      institutionId: urban.id,
      flag: Flag.PLANNED,
      expectedDurationDays: 15,
      applicationTypeId: passportType.id,
      integrationCode: "planning",
      sortOrder: 130,
    },
    {
      code: "e_residency",
      names: names("E-rezidentlik (PLAN — qanun qüvvədə deyil)", "E-residency (PLAN — not in force)"),
      institutionId: asan.id,
      flag: Flag.PLANNED,
      expectedDurationDays: null,
      applicationTypeId: eResidencyType.id,
      integrationCode: "e_nonresident",
      legalBasis: "TZ §22.1 / §25.1. GRANTED only after legislation via back-office, never a stub.",
      sortOrder: 140,
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
  await prisma.ruleSet.upsert({
    where: { kind_version: { kind: RuleSetKind.INACTIVITY_THRESHOLD, version: "1" } },
    update: { body: { days: 60, source: "DVX activity feed when available (FR-AFT-03)" } },
    create: {
      ...common,
      kind: RuleSetKind.INACTIVITY_THRESHOLD,
      version: "1",
      body: { days: 60, source: "DVX activity feed when available (FR-AFT-03)" },
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
    {
      pageKey: "OMB",
      slug: "ombudsman",
      title: names("İnvestisiya Ombudsmanı", "Investment Ombudsman"),
      body: names(
        "İnvestisiya Ombudsmanı tövsiyə xarakterli rəy verir; qurum qərarını əvəz etmir. «Müraciət et» institusional əsas təsdiqlənəndən sonra aktivləşir (TZ §25.3 bənd 5). Rədd edilmiş case üzrə şikayət Vahid Müraciətdən Ombudsman növü ilə açılır.",
        "The Investment Ombudsman issues a recommendatory opinion; it does not replace an institution’s decision. Live submit is gated on the institutional basis (TZ §25.3 item 5). A complaint on a rejected case opens an Ombudsman application through Vahid Müraciət.",
      ),
    },
    {
      pageKey: "ERES",
      slug: "e-residency",
      title: names("E-rezidentlik", "E-residency"),
      body: names(
        "E-rezidentlik statusu qanunvericilikdə hələ qüvvədə deyil (TZ §22.1). Bu səhifə PLAN bayrağı ilə məlumat üçündür; maraq bildirişi Vahid Müraciətdən qəbul olunur. Platforma e-rezident statusu vermir.",
        "E-residency is not in force (TZ §22.1). This page is informational with a PLAN flag; interest is accepted through Vahid Müraciət. The platform does not grant e-resident status.",
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
    { eventType: "payment.initiated", mandatory: true, az: "Dövlət rüsumu ödənişi başladı: {{number}}.", en: "State-fee payment started: {{number}}." },
    { eventType: "payment.succeeded", mandatory: true, az: "Dövlət rüsumu ödənildi. Qəbz Sənədlərimdədir.", en: "State fee paid. The receipt is in My documents." },
    { eventType: "payment.failed", mandatory: true, az: "Ödəniş alınmadı. Səbəb kabinetdədir; yenidən cəhd edin və ya başqa üsul seçin.", en: "Payment failed. The reason is in the cabinet; retry or choose another method." },
    { eventType: "aftercare.passivity_warning", mandatory: true, az: "Fəaliyyət olmasa da hesabat öhdəliyi davam edir. Seçimləriniz kabinetdədir.", en: "Reporting duties continue even without activity. Choices are in the cabinet." },
    { eventType: "ombudsman.status_changed", mandatory: true, az: "Ombudsman müraciətinin statusu dəyişdi: {{number}}.", en: "Ombudsman application status changed: {{number}}." },
    { eventType: "aftercare.status_changed", mandatory: true, az: "Aftercare müraciətinin statusu dəyişdi: {{number}}.", en: "Aftercare application status changed: {{number}}." },
  ];

  const roles = [UserRole.INVESTOR, UserRole.CASE_MANAGER, UserRole.SUPERVISOR, UserRole.OMBUDSMAN_OFFICER];
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

async function seedPartnersAndFees() {
  const partners = [
    {
      id: "00000000-0000-4000-8000-000000000101",
      names: names("Hüquqi ünvan xidməti", "Legal address service"),
      serviceKind: "legal_address",
      priceAmount: "150.00",
      priceCurrency: Currency.AZN,
      durationNote: "12 months",
      rating: "4.50",
    },
    {
      id: "00000000-0000-4000-8000-000000000102",
      names: names("Tərcümə", "Translation"),
      serviceKind: "translation",
      priceAmount: "40.00",
      priceCurrency: Currency.AZN,
      durationNote: "per document",
      rating: "4.20",
    },
    {
      id: "00000000-0000-4000-8000-000000000103",
      names: names("Notariat", "Notary"),
      serviceKind: "notary",
      priceAmount: "80.00",
      priceCurrency: Currency.AZN,
      durationNote: "per act",
      rating: "4.00",
    },
  ];
  for (const p of partners) {
    await prisma.partner.upsert({
      where: { id: p.id },
      update: {
        names: p.names,
        serviceKind: p.serviceKind,
        priceAmount: p.priceAmount,
        priceCurrency: p.priceCurrency,
        durationNote: p.durationNote,
        rating: p.rating,
        accreditationStatus: AccreditationStatus.ACTIVE,
        isActive: true,
      },
      create: {
        ...p,
        accreditationStatus: AccreditationStatus.ACTIVE,
        isActive: true,
      },
    });
  }

  const companyRegType = await prisma.applicationType.findUniqueOrThrow({ where: { code: "company_registration" } });
  const companyRegProc = await prisma.procedure.findUniqueOrThrow({ where: { code: "company_registration" } });
  await prisma.stateFee.upsert({
    where: { code: "e_company_registration" },
    update: {
      names: names("Elektron şirkət qeydiyyatı rüsumu", "Electronic company-registration state fee"),
      amount: "0.00",
      currency: Currency.AZN,
      procedureId: companyRegProc.id,
      applicationTypeId: companyRegType.id,
      isActive: true,
    },
    create: {
      code: "e_company_registration",
      names: names("Elektron şirkət qeydiyyatı rüsumu", "Electronic company-registration state fee"),
      amount: "0.00",
      currency: Currency.AZN,
      procedureId: companyRegProc.id,
      applicationTypeId: companyRegType.id,
      isActive: true,
    },
  });
  await prisma.stateFee.upsert({
    where: { code: "incentive_certificate_state_fee" },
    update: {
      names: names("İnvestisiya təşviqi sənədi rüsumu (nümunə)", "Incentive-certificate state fee (sample)"),
      amount: "0.00",
      currency: Currency.AZN,
      isActive: true,
    },
    create: {
      code: "incentive_certificate_state_fee",
      names: names("İnvestisiya təşviqi sənədi rüsumu (nümunə)", "Incentive-certificate state fee (sample)"),
      amount: "0.00",
      currency: Currency.AZN,
      isActive: true,
    },
  });
}

async function main() {
  await seedSysadmin();
  await seedOmbudsmanOfficer();
  await seedWorkflow();
  await seedOmbudsmanAftercareWorkflows();
  await seedClassifications();
  await seedApplicationTypes();
  await seedProcedures();
  await seedRuleSets();
  await seedCms();
  await seedNotificationTemplates();
  await seedPartnersAndFees();
  console.log("Seed complete (Phase 1–3 catalogue: PLAN §22 shells, electricity retagged PLANNED, e-residency CMS).");
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
