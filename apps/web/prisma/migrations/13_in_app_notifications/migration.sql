-- CreateTable: in_app_notifications
CREATE TABLE IF NOT EXISTS "in_app_notifications" (
  "id"         TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id"    TEXT         NOT NULL,
  "title"      VARCHAR(200) NOT NULL,
  "body"       TEXT         NOT NULL,
  "data"       JSONB,
  "is_read"    BOOLEAN      NOT NULL DEFAULT false,
  "read_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "in_app_notifications"
  ADD CONSTRAINT "in_app_notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "in_app_notifications_user_id_is_read_idx"
  ON "in_app_notifications"("user_id", "is_read");
