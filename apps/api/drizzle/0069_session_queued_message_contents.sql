DROP TABLE IF EXISTS "session_queued_message_contents";--> statement-breakpoint
DROP TABLE IF EXISTS "session_queued_message_images";--> statement-breakpoint
ALTER TABLE "session_queued_messages" DROP COLUMN IF EXISTS "text";--> statement-breakpoint

CREATE TABLE "session_queued_message_contents" (
  "id" uuid PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL,
  "session_queued_message_id" uuid NOT NULL,
  "type" "message_content_type" NOT NULL,
  "text" text,
  "data" text,
  "mime_type" text,
  "structured_content" jsonb,
  "tool_call_id" text,
  "tool_name" text,
  "arguments" jsonb,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint

ALTER TABLE "session_queued_message_contents"
  ADD CONSTRAINT "session_queued_message_contents_company_id_companies_id_fk"
  FOREIGN KEY ("company_id")
  REFERENCES "public"."companies"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "session_queued_message_contents"
  ADD CONSTRAINT "session_queued_message_contents_session_queued_message_id_session_queued_messages_id_fk"
  FOREIGN KEY ("session_queued_message_id")
  REFERENCES "public"."session_queued_messages"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "session_queued_message_contents_company_id_idx"
  ON "session_queued_message_contents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_queued_message_contents_session_queued_message_id_idx"
  ON "session_queued_message_contents" USING btree ("session_queued_message_id");--> statement-breakpoint

ALTER TABLE "session_queued_message_contents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DO $$ DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_queued_message_contents'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "session_queued_message_contents"', policy_record.policyname);
  END LOOP;
END $$;--> statement-breakpoint

CREATE POLICY "session_queued_message_contents_company_scope_policy"
ON "session_queued_message_contents"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
