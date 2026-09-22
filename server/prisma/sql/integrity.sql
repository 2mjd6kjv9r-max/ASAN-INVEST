-- Extra integrity objects that Prisma does not emit from schema.prisma.
-- Applied as part of the init migration. PLAN §5.1 items 4–7.

-- Z-02: every application links to a project XOR a profile (TZ §3.1).
ALTER TABLE applications
  ADD CONSTRAINT applications_z02_link
  CHECK ((project_id IS NULL) <> (profile_id IS NULL));

-- Payments attach to a project XOR an application (TZ §4.3).
ALTER TABLE payments
  ADD CONSTRAINT payments_project_xor_application
  CHECK ((project_id IS NULL) <> (application_id IS NULL));

ALTER TABLE projects
  ADD CONSTRAINT projects_volume_amount_positive
  CHECK (volume_amount > 0);

ALTER TABLE payments
  ADD CONSTRAINT payments_amount_non_negative
  CHECK (amount >= 0);

ALTER TABLE procedures
  ADD CONSTRAINT procedures_fee_amount_non_negative
  CHECK (fee_amount IS NULL OR fee_amount >= 0);

-- UI-04 locales
ALTER TABLE users
  ADD CONSTRAINT users_locale_ui04
  CHECK (locale IN ('az', 'en', 'ru', 'tr', 'ar'));

ALTER TABLE notification_templates
  ADD CONSTRAINT notification_templates_locale_ui04
  CHECK (locale IN ('az', 'en', 'ru', 'tr', 'ar'));

ALTER TABLE guest_sessions
  ADD CONSTRAINT guest_sessions_locale_ui04
  CHECK (locale IN ('az', 'en', 'ru', 'tr', 'ar'));

-- FR-CASE-07: re-open requires a reason.
ALTER TABLE cases
  ADD CONSTRAINT cases_reopen_requires_reason
  CHECK (
    (reopened_at IS NULL AND reopen_reason IS NULL AND reopened_by IS NULL)
    OR (reopened_at IS NOT NULL AND reopen_reason IS NOT NULL)
  );

-- Cabinet / desk indexes (PLAN §5.1 item 7)
CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX cases_desk_due_idx
  ON cases (sla_due_at)
  WHERE sla_due_at IS NOT NULL
    AND internal_status NOT IN ('COMPLETED', 'REJECTED', 'WITHDRAWN', 'ARCHIVED', 'DRAFT');

-- Application numbers: INV-YYYY-00000 (FR-APP-03). Assigned at submit, not on draft.
CREATE SEQUENCE application_public_number_seq;

CREATE OR REPLACE FUNCTION next_application_public_number()
RETURNS text
LANGUAGE sql
AS $$
  SELECT 'INV-' || to_char(timezone('UTC', now()), 'YYYY') || '-'
    || lpad(nextval('application_public_number_seq')::text, 5, '0');
$$;

-- FR-APP-04: snapshot is immutable once written.
CREATE OR REPLACE FUNCTION prevent_application_snapshot_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.snapshot IS NOT NULL AND NEW.snapshot IS DISTINCT FROM OLD.snapshot THEN
    RAISE EXCEPTION 'applications.snapshot is immutable after submit (FR-APP-04)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER applications_snapshot_immutable
  BEFORE UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION prevent_application_snapshot_mutation();

-- TZ §21.1: audit journal cannot be changed.
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_records is append-only (TZ §21.1)';
END;
$$;

CREATE TRIGGER audit_records_no_update
  BEFORE UPDATE ON audit_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_records_no_delete
  BEFORE DELETE ON audit_records
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_mutation();

-- FR-CASE-01: submitted application must have a case (checked at commit).
CREATE OR REPLACE FUNCTION ensure_case_on_submit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.submitted_at IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM cases WHERE application_id = NEW.id) THEN
    RAISE EXCEPTION 'submitted application must have a case (FR-CASE-01)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER applications_case_on_submit
  AFTER INSERT OR UPDATE OF submitted_at ON applications
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION ensure_case_on_submit();

COMMENT ON TABLE workflow_statuses IS
  'Standart workflow only (TZ §14.1). Phase 2 TZ §14.2 Ombudsman/Aftercare extra statuses are not stored.';
