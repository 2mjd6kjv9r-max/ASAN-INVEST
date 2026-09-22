import { prisma } from "./prisma.js";
import { INVESTOR_VISIBLE_STATUS } from "./status-mapping.js";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? "ok" : "FAIL";
  console.log(`${mark.padEnd(4)} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function expectReject(name: string, fn: () => Promise<unknown>, match?: string) {
  try {
    await fn();
    record(name, false, "expected an error");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ok = match ? message.includes(match) : true;
    record(name, ok, ok ? undefined : `unexpected error: ${message}`);
  }
}

async function tableExists(name: string) {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${name}
    ) AS exists
  `;
  return rows[0]?.exists === true;
}

async function main() {
  const standardCount = await prisma.workflowStatus.count({ where: { workflow: "STANDARD" } });
  record("standart workflow statuses seeded", standardCount === 13, `count=${standardCount}`);

  const ombCount = await prisma.workflowStatus.count({ where: { workflow: "OMBUDSMAN" } });
  record("ombudsman workflow statuses seeded", ombCount === 13, `count=${ombCount}`);

  const aftCount = await prisma.workflowStatus.count({ where: { workflow: "AFTERCARE" } });
  record("aftercare workflow statuses seeded", aftCount === 12, `count=${aftCount}`);

  const extra = await prisma.$queryRaw<Array<{ internal_status: string }>>`
    SELECT DISTINCT internal_status::text
    FROM workflow_statuses
    WHERE internal_status::text IN (
      'UNDER_INVESTIGATION', 'IN_MEDIATION', 'OPINION_PREPARED',
      'OPINION_PENDING_APPROVAL', 'NEXT_CONTACT_PLANNED', 'IN_MONITORING'
    )
  `;
  record("TZ §14.2 Ombudsman/Aftercare statuses present", extra.length === 6, `count=${extra.length}`);

  const mappingOk = (await prisma.workflowStatus.findMany()).every(
    (row) => INVESTOR_VISIBLE_STATUS[row.internalStatus] === row.investorVisibleStatus,
  );
  record("workflow_statuses match TZ §14.1 / §14.2 mapping", mappingOk);

  const types = await prisma.applicationType.findMany({
    where: { code: { in: ["ombudsman", "aftercare", "company_registration", "bank_kyc"] } },
  });
  record("Phase 2 application types seeded", types.length === 4, `count=${types.length}`);

  const phase3Types = await prisma.applicationType.findMany({
    where: { code: { in: ["visa", "customs_incentive", "utility_connection", "e_residency"] } },
  });
  record("Phase 3 application types seeded", phase3Types.length === 4, `count=${phase3Types.length}`);

  const electricity = await prisma.procedure.findUniqueOrThrow({ where: { code: "electricity_connection" } });
  record(
    "electricity_connection is PLANNED (no live adapter)",
    electricity.flag === "PLANNED" && electricity.integrationCode === "electricity",
    `flag=${electricity.flag} integration=${electricity.integrationCode}`,
  );

  const planCodes = [
    "visa",
    "customs_incentive",
    "gas_connection",
    "water_connection",
    "work_permit",
    "e_notary",
    "construction_permit",
    "zoning_prequery",
    "e_residency",
  ];
  const planProcs = await prisma.procedure.findMany({ where: { code: { in: planCodes } } });
  record(
    "Phase 3 PLAN procedures seeded",
    planProcs.length === planCodes.length && planProcs.every((p) => p.flag === "PLANNED"),
    `count=${planProcs.length}`,
  );

  const banks = await prisma.classification.count({
    where: { kind: "INSTITUTION", code: { in: ["pilot-bank-a", "pilot-bank-b"] } },
  });
  record("two pilot bank institutions", banks === 2, `count=${banks}`);

  const dvx = await prisma.classification.findFirst({
    where: { kind: "INSTITUTION", code: { in: ["dvx", "state-tax-service"] } },
  });
  record("DVX institution present", dvx !== null);

  const partners = await prisma.partner.count({ where: { accreditationStatus: "ACTIVE" } });
  record("ACTIVE accredited partners seeded", partners >= 3, `count=${partners}`);

  const fees = await prisma.stateFee.findUnique({ where: { code: "e_company_registration" } });
  record("e-registration state fee is 0 AZN", fees !== null && Number(fees.amount) === 0 && fees.currency === "AZN");

  const ombudsmanPage = await prisma.cmsContent.findUnique({ where: { slug: "ombudsman" } });
  record("Ombudsman CMS page published", ombudsmanPage?.status === "PUBLISHED");

  const officer = await prisma.user.findUnique({
    where: { email: "ombudsman@asaninvest.local" },
    include: { roleAssignments: true },
  });
  record(
    "OMBUDSMAN_OFFICER seed has 2FA",
    officer?.twoFactorEnabled === true
      && officer.roleAssignments.some((r) => r.role === "OMBUDSMAN_OFFICER"),
  );

  record("systemic_problems table", await tableExists("systemic_problems"));
  record("partners table", await tableExists("partners"));
  record("partner_selections table", await tableExists("partner_selections"));
  record("integration_messages table", await tableExists("integration_messages"));
  record("state_fees table", await tableExists("state_fees"));
  record("flag_change_events table", await tableExists("flag_change_events"));

  const authProviders = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'auth_provider'
  `;
  const authLabels = new Set(authProviders.map((r) => r.enumlabel));
  record(
    "auth_provider has E_NONRESIDENT and FOREIGN_ESIGN",
    authLabels.has("E_NONRESIDENT") && authLabels.has("FOREIGN_ESIGN"),
  );

  const virtualFinIdx = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'users_virtual_fin_key'
    ) AS exists
  `;
  record("unique users.virtual_fin", virtualFinIdx[0]?.exists === true);

  const finIdx = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'users_fin_key'
    ) AS exists
  `;
  record("unique users.fin", finIdx[0]?.exists === true);

  const eResPage = await prisma.cmsContent.findUnique({ where: { slug: "e-residency" } });
  record("e-residency CMS page published", eResPage?.status === "PUBLISHED");

  const paymentEnum = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'payment_status'
    ) AS exists
  `;
  record("payment_status enum", paymentEnum[0]?.exists === true);

  const phase1Xor = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'applications_z02_link'
    ) AS exists
  `;
  record("Phase 1 Z-02 XOR constraint kept", phase1Xor[0]?.exists === true);

  const snapshotTrigger = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'applications_snapshot_immutable'
    ) AS exists
  `;
  record("Phase 1 snapshot trigger kept", snapshotTrigger[0]?.exists === true);

  const auditTrigger = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'audit_records_no_update'
    ) AS exists
  `;
  record("Phase 1 audit immutability kept", auditTrigger[0]?.exists === true);

  const emailUnique = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'users_email_key'
    ) AS exists
  `;
  record("unique users.email", emailUnique[0]?.exists === true);

  const profileUnique = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'profiles_user_id_key'
    ) AS exists
  `;
  record("1:1 users↔profiles", profileUnique[0]?.exists === true);

  const caseUnique = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'cases_application_id_key'
    ) AS exists
  `;
  record("1:1 applications↔cases FK", caseUnique[0]?.exists === true);

  const unread = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = 'notifications_user_unread_idx'
    ) AS exists
  `;
  record("unread notifications index", unread[0]?.exists === true);

  const xor = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'applications_z02_link'
    ) AS exists
  `;
  record("Z-02 XOR constraint", xor[0]?.exists === true);

  const type = await prisma.applicationType.findFirstOrThrow();
  await expectReject(
    "Z-02 rejects application with neither link",
    () =>
      prisma.application.create({
        data: { typeId: type.id },
      }),
    "applications_z02_link",
  );

  const profile = await prisma.profile.findFirstOrThrow();
  const projectSector = await prisma.classification.findFirst({
    where: { kind: "SECTOR" },
  });
  const creator = await prisma.user.findFirstOrThrow({
    where: { email: "sysadmin@asaninvest.local" },
  });
  const project = await prisma.project.create({
    data: {
      profileId: profile.id,
      name: "integrity-check",
      sectorId: projectSector?.id,
      volumeAmount: "1000.00",
      volumeCurrency: "AZN",
      sizeCategory: "SMALL",
      createdById: creator.id,
    },
  });
  await expectReject(
    "Z-02 rejects application with both links",
    () =>
      prisma.application.create({
        data: {
          typeId: type.id,
          profileId: profile.id,
          projectId: project.id,
        },
      }),
    "applications_z02_link",
  );

  const application = await prisma.application.create({
    data: {
      typeId: type.id,
      profileId: profile.id,
      snapshot: { demo: true },
      publicNumber: "INV-2099-00001",
    },
  });
  await expectReject(
    "FR-APP-04 snapshot is immutable",
    () =>
      prisma.application.update({
        where: { id: application.id },
        data: { snapshot: { demo: false } },
      }),
    "FR-APP-04",
  );

  const audit = await prisma.auditRecord.create({
    data: {
      actorUserId: creator.id,
      action: "integrity.verify",
      objectType: "application",
      objectId: application.id,
      after: { ok: true },
    },
  });
  await expectReject(
    "TZ §21.1 audit update forbidden",
    () =>
      prisma.auditRecord.update({
        where: { id: audit.id },
        data: { action: "tampered" },
      }),
    "append-only",
  );
  await expectReject(
    "TZ §21.1 audit delete forbidden",
    () => prisma.auditRecord.delete({ where: { id: audit.id } }),
    "append-only",
  );

  const integration = await prisma.integrationMessage.create({
    data: {
      provider: "dvx",
      direction: "OUTBOUND",
      objectType: "application",
      objectId: application.id,
      payload: { probe: true },
      status: "recorded",
    },
  });
  await expectReject(
    "integration_messages update forbidden",
    () =>
      prisma.integrationMessage.update({
        where: { id: integration.id },
        data: { status: "tampered" },
      }),
    "append-only",
  );
  await expectReject(
    "integration_messages delete forbidden",
    () => prisma.integrationMessage.delete({ where: { id: integration.id } }),
    "append-only",
  );

  const flagEvent = await prisma.flagChangeEvent.create({
    data: {
      procedureId: electricity.id,
      fromFlag: "ONLINE",
      toFlag: "PLANNED",
      actorUserId: creator.id,
      notifiedCount: 0,
    },
  });
  await expectReject(
    "flag_change_events update forbidden",
    () =>
      prisma.flagChangeEvent.update({
        where: { id: flagEvent.id },
        data: { notifiedCount: 99 },
      }),
    "append-only",
  );
  await expectReject(
    "flag_change_events delete forbidden",
    () => prisma.flagChangeEvent.delete({ where: { id: flagEvent.id } }),
    "append-only",
  );

  await prisma.user.update({
    where: { id: creator.id },
    data: { virtualFin: "VF-INTEGRITY-1" },
  });
  await expectReject(
    "virtual_fin is unique",
    () =>
      prisma.user.create({
        data: {
          email: "virtual-fin-dup@asaninvest.local",
          virtualFin: "VF-INTEGRITY-1",
        },
      }),
    "virtual_fin",
  );
  await prisma.user.update({
    where: { id: creator.id },
    data: { virtualFin: null },
  });

  await prisma.application.delete({ where: { id: application.id } });
  await prisma.project.delete({ where: { id: project.id } });

  const money = await prisma.$queryRaw<Array<{ data_type: string }>>`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'volume_amount'
  `;
  record("projects.volume_amount is numeric", money[0]?.data_type === "numeric");

  const partnerMoney = await prisma.$queryRaw<Array<{ numeric_precision: number | null; numeric_scale: number | null }>>`
    SELECT numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_name = 'partners' AND column_name = 'price_amount'
  `;
  record(
    "partners.price_amount is NUMERIC(18,2)",
    partnerMoney[0]?.numeric_precision === 18 && partnerMoney[0]?.numeric_scale === 2,
  );

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} integrity check(s) failed`);
  }
  console.log(`\n${checks.length} checks passed`);
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
