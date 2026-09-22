-- Phase 3 integrity extras. Applied by 20260922140000_phase3_identity_plan_shells.
-- Do not drop Phase 1/2 CHECKs / triggers.

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
