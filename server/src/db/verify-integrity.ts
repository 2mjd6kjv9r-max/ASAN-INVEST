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

async function main() {
  const statusCount = await prisma.workflowStatus.count();
  record("standart workflow statuses seeded", statusCount === 13, `count=${statusCount}`);

  const forbidden = await prisma.$queryRaw<Array<{ internal_status: string }>>`
    SELECT internal_status::text
    FROM workflow_statuses
    WHERE internal_status::text IN (
      'UNDER_INVESTIGATION', 'IN_MEDIATION', 'OPINION_PREPARED',
      'OPINION_PENDING_APPROVAL', 'NEXT_CONTACT_PLANNED', 'IN_MONITORING'
    )
  `;
  record("no TZ §14.2 Ombudsman/Aftercare statuses", forbidden.length === 0);

  const mappingOk = (await prisma.workflowStatus.findMany()).every(
    (row) => INVESTOR_VISIBLE_STATUS[row.internalStatus] === row.investorVisibleStatus,
  );
  record("workflow_statuses match TZ §14.1 mapping", mappingOk);

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

  await prisma.application.delete({ where: { id: application.id } });
  await prisma.project.delete({ where: { id: project.id } });

  const money = await prisma.$queryRaw<Array<{ data_type: string }>>`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'volume_amount'
  `;
  record("projects.volume_amount is numeric", money[0]?.data_type === "numeric");

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
