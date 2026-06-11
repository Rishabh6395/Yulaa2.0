-- AddColumn: idempotency_key on fee_payments
-- Allows clients to supply a unique key per payment attempt so retries return
-- the existing record instead of creating a duplicate payment.
ALTER TABLE "fee_payments"
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(128);

-- UniqueIndex
CREATE UNIQUE INDEX IF NOT EXISTS "fee_payments_idempotency_key_key"
  ON "fee_payments"("idempotency_key")
  WHERE "idempotency_key" IS NOT NULL;
