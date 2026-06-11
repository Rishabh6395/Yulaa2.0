-- CreateTable: user_sessions (refresh token + revocation support)
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id"            TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id"       TEXT         NOT NULL,
  "refresh_token" VARCHAR(512) NOT NULL,
  "expires_at"    TIMESTAMP(3) NOT NULL,
  "revoked_at"    TIMESTAMP(3),
  "user_agent"    VARCHAR(300),
  "ip_address"    VARCHAR(45),
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex on refresh_token for fast lookup
CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_refresh_token_key"
  ON "user_sessions"("refresh_token");

-- Index for fast user session queries
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx"
  ON "user_sessions"("user_id");

-- AddForeignKey
ALTER TABLE "user_sessions"
  ADD CONSTRAINT "user_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Auto-clean expired sessions older than 90 days (run periodically via cron)
-- CREATE INDEX IF NOT EXISTS "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");
