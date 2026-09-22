-- Phase 3 additive schema (docs/PLAN-PHASE3.md §2 / TZ §25.1, §22, §22.1, TZ §2).
-- Does not drop Phase 1/2 CHECKs, triggers, or indexes.
--
-- ALTER TYPE ... ADD VALUE: Docker Compose is postgres:16-alpine (PG 15+ may
-- add and use new labels in the same transaction). Do not rewrite existing labels.

CREATE TYPE "bank_channel" AS ENUM ('PHYSICAL_SIGNATURE', 'REMOTE_ESIGN');

CREATE TYPE "e_residency_status" AS ENUM ('NONE', 'APPLIED', 'PLAN_PENDING', 'GRANTED');

ALTER TYPE "auth_provider" ADD VALUE 'E_NONRESIDENT';
ALTER TYPE "auth_provider" ADD VALUE 'FOREIGN_ESIGN';

ALTER TABLE "applications" ADD COLUMN "bank_channel" "bank_channel";

ALTER TABLE "procedures" ADD COLUMN "integration_code" TEXT;

ALTER TABLE "profiles" ADD COLUMN "e_residency_status" "e_residency_status" NOT NULL DEFAULT 'NONE';

ALTER TABLE "users" ADD COLUMN "esign_issuer" TEXT,
ADD COLUMN "fin" TEXT,
ADD COLUMN "identification_upgraded_at" TIMESTAMPTZ(6),
ADD COLUMN "virtual_fin" TEXT;

CREATE TABLE "flag_change_events" (
    "id" UUID NOT NULL,
    "procedure_id" UUID NOT NULL,
    "from_flag" "flag" NOT NULL,
    "to_flag" "flag" NOT NULL,
    "actor_user_id" UUID,
    "notified_count" INTEGER NOT NULL DEFAULT 0,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flag_change_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "flag_change_events_procedure_id_occurred_at_idx" ON "flag_change_events"("procedure_id", "occurred_at");
CREATE INDEX "flag_change_events_occurred_at_idx" ON "flag_change_events"("occurred_at");
CREATE INDEX "procedures_integration_code_idx" ON "procedures"("integration_code");

-- PostgreSQL UNIQUE allows multiple NULLs, so this is "unique if present".
CREATE UNIQUE INDEX "users_virtual_fin_key" ON "users"("virtual_fin");
CREATE UNIQUE INDEX "users_fin_key" ON "users"("fin");

ALTER TABLE "flag_change_events" ADD CONSTRAINT "flag_change_events_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "flag_change_events" ADD CONSTRAINT "flag_change_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Honesty fix: electricity_connection was seeded ONLINE without a live adapter (PLAN-PHASE3 §1.2 / §2.3).
-- Open stages follow FR-FLAG-03 (completed stages unchanged).
UPDATE procedures
SET flag = 'PLANNED',
    integration_code = COALESCE(integration_code, 'electricity'),
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'electricity_connection';

UPDATE stages s
SET flag = 'PLANNED',
    updated_at = CURRENT_TIMESTAMP
FROM procedures p
WHERE s.procedure_id = p.id
  AND p.code = 'electricity_connection'
  AND s.actual_completed_at IS NULL
  AND s.flag IS DISTINCT FROM 'PLANNED';

INSERT INTO flag_change_events (id, procedure_id, from_flag, to_flag, notified_count, occurred_at)
SELECT gen_random_uuid(), id, 'ONLINE', 'PLANNED', 0, CURRENT_TIMESTAMP
FROM procedures
WHERE code = 'electricity_connection';

CREATE OR REPLACE FUNCTION prevent_flag_change_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'flag_change_events is append-only (FR-FLAG-03)';
END;
$$;

CREATE TRIGGER flag_change_events_no_update
  BEFORE UPDATE ON flag_change_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_flag_change_mutation();

CREATE TRIGGER flag_change_events_no_delete
  BEFORE DELETE ON flag_change_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_flag_change_mutation();

COMMENT ON COLUMN users.virtual_fin IS
  'TZ §2 virtual FİN. Stored if issued. Does not change resident / non-resident labelling.';

COMMENT ON COLUMN users.fin IS
  'Resident ASAN Login / SİMA FİN (FR-AUTH-02) when a live adapter exists.';

COMMENT ON COLUMN users.identification_level IS
  'LEGAL only after a real ASAN_LOGIN / E_NONRESIDENT adapter (Available=true) or a SIGN representative (TZ §7.2). Adapter availability is a runtime flag, not a CHECK.';

COMMENT ON COLUMN profiles.e_residency_status IS
  'GRANTED only via back-office after TZ §22.1 legislation. PLAN stubs must not set GRANTED.';

COMMENT ON COLUMN applications.bank_channel IS
  'PHYSICAL_SIGNATURE vs REMOTE_ESIGN for bank_kyc. REMOTE_ESIGN stays PLAN until Mərkəzi Bank (TZ §22.1). Platform does not open accounts.';

COMMENT ON TABLE flag_change_events IS
  'FR-FLAG-03 procedure flag promotions. Append-only.';
