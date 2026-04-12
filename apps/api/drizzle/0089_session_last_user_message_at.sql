ALTER TABLE "agent_sessions" ADD COLUMN IF NOT EXISTS "last_user_message_at" timestamp with time zone;--> statement-breakpoint
UPDATE "agent_sessions"
SET "last_user_message_at" = latest."last_user_message_at"
FROM (
  SELECT
    "company_id",
    "session_id",
    MAX("created_at") AS "last_user_message_at"
  FROM "session_messages"
  WHERE "role" = 'user'
  GROUP BY "company_id", "session_id"
) AS latest
WHERE "agent_sessions"."company_id" = latest."company_id"
  AND "agent_sessions"."id" = latest."session_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_sessions_company_last_user_message_at_idx"
  ON "agent_sessions" USING btree ("company_id", "last_user_message_at");
