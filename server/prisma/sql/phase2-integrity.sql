-- Phase 2 integrity extras. Applied by 20260922120000_phase2_ombudsman_aftercare.
-- Do not drop Phase 1 CHECKs / triggers (Z-02, snapshot immutability, audit append-only, case-on-submit).

ALTER TABLE partners
  ADD CONSTRAINT partners_price_amount_non_negative
  CHECK (price_amount >= 0);

ALTER TABLE state_fees
  ADD CONSTRAINT state_fees_amount_non_negative
  CHECK (amount >= 0);

ALTER TABLE integration_messages
  ADD CONSTRAINT integration_messages_direction_check
  CHECK (direction IN ('OUTBOUND', 'INBOUND'));

-- Adapter log is append-only (same policy as audit_records / TZ §21.1).
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
