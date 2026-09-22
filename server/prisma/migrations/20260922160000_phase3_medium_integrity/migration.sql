-- Filtered unique indexes and payload bounds (Phase 3 medium findings).
-- Does not drop Phase 1–3 CHECKs, triggers, or earlier indexes except the
-- unfiltered users.fin / users.virtual_fin uniques replaced below.

UPDATE users SET virtual_fin = NULL WHERE virtual_fin IS NOT NULL AND btrim(virtual_fin) = '';
UPDATE users SET fin = NULL WHERE fin IS NOT NULL AND btrim(fin) = '';
UPDATE payments SET provider_ref = NULL WHERE provider_ref IS NOT NULL AND btrim(provider_ref) = '';

DROP INDEX IF EXISTS "users_virtual_fin_key";
DROP INDEX IF EXISTS "users_fin_key";
DROP INDEX IF EXISTS "payments_provider_ref_idx";
DROP INDEX IF EXISTS "payments_provider_ref_key";

CREATE UNIQUE INDEX "users_virtual_fin_key" ON "users"("virtual_fin")
  WHERE virtual_fin IS NOT NULL AND btrim(virtual_fin) <> '';
CREATE UNIQUE INDEX "users_fin_key" ON "users"("fin")
  WHERE fin IS NOT NULL AND btrim(fin) <> '';
CREATE UNIQUE INDEX "payments_provider_ref_key" ON "payments"("provider_ref")
  WHERE provider_ref IS NOT NULL AND btrim(provider_ref) <> '';

ALTER TABLE users ADD CONSTRAINT users_virtual_fin_nonempty
  CHECK (virtual_fin IS NULL OR btrim(virtual_fin) <> '');
ALTER TABLE users ADD CONSTRAINT users_fin_nonempty
  CHECK (fin IS NULL OR btrim(fin) <> '');

ALTER TABLE payments ADD CONSTRAINT payments_provider_ref_nonempty
  CHECK (provider_ref IS NULL OR btrim(provider_ref) <> '');
ALTER TABLE payments ADD CONSTRAINT payments_raw_payload_size
  CHECK (raw_payload IS NULL OR octet_length(raw_payload::text) <= 8192);

COMMENT ON COLUMN users.virtual_fin IS
  'TZ §2 virtual FİN. Unique when non-empty. Empty string is not a FİN.';
COMMENT ON COLUMN users.fin IS
  'Resident ASAN Login / SİMA FİN. Unique when non-empty. Empty string is not a FİN.';
COMMENT ON COLUMN payments.provider_ref IS
  'Payment provider reference. Unique when non-empty so webhooks cannot attach one charge to two rows.';
