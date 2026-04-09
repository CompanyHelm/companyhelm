DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_sessions'
      AND column_name = 'context_messages'
  ) THEN
    ALTER TABLE "agent_sessions"
    RENAME COLUMN "context_messages" TO "context_messages_snapshot";
  END IF;
END $$;--> statement-breakpoint

ALTER TABLE "agent_sessions"
ADD COLUMN IF NOT EXISTS "context_messages_snapshot_at" timestamp with time zone;--> statement-breakpoint

UPDATE "agent_sessions"
SET "context_messages_snapshot_at" = "updated_at"
WHERE "context_messages_snapshot" IS NOT NULL
  AND "context_messages_snapshot_at" IS NULL;--> statement-breakpoint

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'session_context_checkpoints'
      AND column_name = 'context_messages'
  ) THEN
    ALTER TABLE "session_context_checkpoints"
    RENAME COLUMN "context_messages" TO "context_messages_snapshot";
  END IF;
END $$;
