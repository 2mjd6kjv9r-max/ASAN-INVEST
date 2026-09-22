-- Phase 2 additive schema (docs/PLAN-PHASE2.md §2 / TZ §14.2, §15, §16, §20).
-- Does not drop Phase 1 CHECKs, triggers, or indexes.
--
-- ALTER TYPE ... ADD VALUE:
--   PostgreSQL 11 and earlier cannot add more than one enum value in a single
--   transaction. PostgreSQL 12+ allows ADD VALUE inside a transaction; values
--   could not be *used* until commit until PostgreSQL 15.
--   Docker Compose runs postgres:16-alpine, so ADD VALUE and later statements
--   in this migration (and the subsequent seed transaction) are valid.
--   Do not rewrite existing labels; only append.

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('INITIATED', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "reform_status" AS ENUM ('IDENTIFIED', 'PROPOSED', 'ACCEPTED', 'IMPLEMENTED');

-- CreateEnum
CREATE TYPE "accreditation_status" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- AlterEnum — TZ §14.2
ALTER TYPE "case_internal_status" ADD VALUE 'UNDER_INVESTIGATION';
ALTER TYPE "case_internal_status" ADD VALUE 'IN_MEDIATION';
ALTER TYPE "case_internal_status" ADD VALUE 'OPINION_PREPARED';
ALTER TYPE "case_internal_status" ADD VALUE 'OPINION_PENDING_APPROVAL';
ALTER TYPE "case_internal_status" ADD VALUE 'NEXT_CONTACT_PLANNED';
ALTER TYPE "case_internal_status" ADD VALUE 'IN_MONITORING';

-- AlterEnum — TZ §11.1 / §2
ALTER TYPE "workflow_kind" ADD VALUE 'OMBUDSMAN';
ALTER TYPE "workflow_kind" ADD VALUE 'AFTERCARE';

-- AlterTable — FR-OMB-06 / WF-06
ALTER TABLE "applications" ADD COLUMN "linked_case_id" UUID;

-- AlterTable — FR-PAY-01, 04. Convert free-text status (Phase 1 default 'external') without dropping rows.
ALTER TABLE "payments" ADD COLUMN "failure_reason" TEXT,
ADD COLUMN "paid_at" TIMESTAMPTZ(6),
ADD COLUMN "provider" TEXT,
ADD COLUMN "provider_ref" TEXT,
ADD COLUMN "raw_payload" JSONB;

ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payments"
  ALTER COLUMN "status" TYPE "payment_status"
  USING (
    CASE upper(status)
      WHEN 'INITIATED' THEN 'INITIATED'::"payment_status"
      WHEN 'SUCCEEDED' THEN 'SUCCEEDED'::"payment_status"
      WHEN 'FAILED' THEN 'FAILED'::"payment_status"
      WHEN 'REFUNDED' THEN 'REFUNDED'::"payment_status"
      WHEN 'EXTERNAL' THEN 'EXTERNAL'::"payment_status"
      ELSE 'EXTERNAL'::"payment_status"
    END
  );
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'EXTERNAL'::"payment_status";

-- AlterTable — FR-REG submit result (VÖEN stays tax_id)
ALTER TABLE "profiles" ADD COLUMN "company_legal_form" TEXT,
ADD COLUMN "dvx_registered_at" TIMESTAMPTZ(6),
ADD COLUMN "dvx_registration_status" TEXT;

-- CreateTable
CREATE TABLE "systemic_problems" (
    "id" UUID NOT NULL,
    "category" TEXT NOT NULL,
    "institution_id" UUID NOT NULL,
    "cause" TEXT NOT NULL,
    "reform_status" "reform_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "systemic_problems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemic_problem_applications" (
    "problem_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,

    CONSTRAINT "systemic_problem_applications_pkey" PRIMARY KEY ("problem_id","application_id")
);

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "names" JSONB NOT NULL,
    "service_kind" TEXT NOT NULL,
    "price_amount" DECIMAL(18,2) NOT NULL,
    "price_currency" "currency" NOT NULL,
    "duration_note" TEXT,
    "rating" DECIMAL(3,2),
    "accreditation_status" "accreditation_status" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_selections" (
    "id" UUID NOT NULL,
    "partner_id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "application_id" UUID,
    "selected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_messages" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "object_type" TEXT NOT NULL,
    "object_id" TEXT NOT NULL,
    "provider_ref" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- FR-ADM-10 fee table. Additive counterpart to procedures.fee_amount; not a Phase 1 rewrite.
CREATE TABLE "state_fees" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "names" JSONB NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" "currency" NOT NULL DEFAULT 'AZN',
    "procedure_id" UUID,
    "application_type_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "state_fees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "systemic_problems_institution_id_reform_status_idx" ON "systemic_problems"("institution_id", "reform_status");

-- CreateIndex
CREATE INDEX "partners_accreditation_status_is_active_idx" ON "partners"("accreditation_status", "is_active");

-- CreateIndex
CREATE INDEX "partner_selections_partner_id_idx" ON "partner_selections"("partner_id");

-- CreateIndex
CREATE INDEX "partner_selections_user_id_idx" ON "partner_selections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "partner_selections_stage_id_key" ON "partner_selections"("stage_id");

-- CreateIndex
CREATE INDEX "integration_messages_provider_object_type_object_id_idx" ON "integration_messages"("provider", "object_type", "object_id");

-- CreateIndex
CREATE INDEX "integration_messages_occurred_at_idx" ON "integration_messages"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "state_fees_code_key" ON "state_fees"("code");

-- CreateIndex
CREATE INDEX "applications_linked_case_id_idx" ON "applications"("linked_case_id");

-- CreateIndex
CREATE INDEX "payments_provider_ref_idx" ON "payments"("provider_ref");

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_linked_case_id_fkey" FOREIGN KEY ("linked_case_id") REFERENCES "cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systemic_problems" ADD CONSTRAINT "systemic_problems_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "classifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systemic_problem_applications" ADD CONSTRAINT "systemic_problem_applications_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "systemic_problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systemic_problem_applications" ADD CONSTRAINT "systemic_problem_applications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_selections" ADD CONSTRAINT "partner_selections_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_selections" ADD CONSTRAINT "partner_selections_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_selections" ADD CONSTRAINT "partner_selections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partner_selections" ADD CONSTRAINT "partner_selections_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_fees" ADD CONSTRAINT "state_fees_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "procedures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state_fees" ADD CONSTRAINT "state_fees_application_type_id_fkey" FOREIGN KEY ("application_type_id") REFERENCES "application_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Integrity extras (also kept in prisma/sql/phase2-integrity.sql)
ALTER TABLE partners
  ADD CONSTRAINT partners_price_amount_non_negative
  CHECK (price_amount >= 0);

ALTER TABLE state_fees
  ADD CONSTRAINT state_fees_amount_non_negative
  CHECK (amount >= 0);

ALTER TABLE integration_messages
  ADD CONSTRAINT integration_messages_direction_check
  CHECK (direction IN ('OUTBOUND', 'INBOUND'));

CREATE OR REPLACE FUNCTION prevent_integration_message_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'integration_messages is append-only (TZ §21.1)';
END;
$$;

CREATE TRIGGER integration_messages_no_update
  BEFORE UPDATE ON integration_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_integration_message_mutation();

CREATE TRIGGER integration_messages_no_delete
  BEFORE DELETE ON integration_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_integration_message_mutation();

COMMENT ON TABLE workflow_statuses IS
  'Standart (TZ §14.1) plus Ombudsman and Aftercare extra statuses (TZ §14.2). Investor-visible values are a mapping (Z-03), not a second state machine.';

COMMENT ON TABLE state_fees IS
  'FR-ADM-10 dövlət rüsumları. Never mixed with partner prices (TZ §20). Counterpart to procedures.fee_amount for in-app checkout.';

COMMENT ON TABLE partners IS
  'FR-ADM-10 / FR-PAY-02 accredited partners. Contract is between investor and partner, not ASAN Invest.';

COMMENT ON TABLE integration_messages IS
  'Opaque DVX/bank/payment adapter log until an integration spec exists in-repo. Append-only.';
