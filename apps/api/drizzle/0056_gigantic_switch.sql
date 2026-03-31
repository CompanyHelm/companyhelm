ALTER TABLE "session_messages" ADD COLUMN IF NOT EXISTS "turn_id" uuid;
--> statement-breakpoint
UPDATE "session_messages"
SET "turn_id" = "id"
WHERE "turn_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "session_messages" ALTER COLUMN "turn_id" SET NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_messages_session_turn_id_idx"
ON "session_messages" USING btree ("session_id","turn_id");
