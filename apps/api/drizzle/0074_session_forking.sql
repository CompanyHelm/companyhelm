ALTER TABLE "agent_sessions"
  ADD COLUMN "forked_from_turn_id" uuid;--> statement-breakpoint
ALTER TABLE "agent_sessions"
  ADD CONSTRAINT "agent_sessions_forked_from_turn_id_session_turns_id_fk"
  FOREIGN KEY ("forked_from_turn_id")
  REFERENCES "public"."session_turns"("id")
  ON DELETE set null
  ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "session_context_checkpoints" (
  "turn_id" uuid PRIMARY KEY NOT NULL,
  "company_id" uuid NOT NULL,
  "session_id" uuid NOT NULL,
  "context_messages" jsonb NOT NULL,
  "current_context_tokens" integer,
  "max_context_tokens" integer,
  "created_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
ALTER TABLE "session_context_checkpoints"
  ADD CONSTRAINT "session_context_checkpoints_turn_id_session_turns_id_fk"
  FOREIGN KEY ("turn_id")
  REFERENCES "public"."session_turns"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_context_checkpoints"
  ADD CONSTRAINT "session_context_checkpoints_company_id_companies_id_fk"
  FOREIGN KEY ("company_id")
  REFERENCES "public"."companies"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_context_checkpoints"
  ADD CONSTRAINT "session_context_checkpoints_session_id_agent_sessions_id_fk"
  FOREIGN KEY ("session_id")
  REFERENCES "public"."agent_sessions"("id")
  ON DELETE cascade
  ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_context_checkpoints_company_id_idx"
  ON "session_context_checkpoints" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_context_checkpoints_session_id_idx"
  ON "session_context_checkpoints" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_context_checkpoints_session_created_at_idx"
  ON "session_context_checkpoints" USING btree ("session_id", "created_at");--> statement-breakpoint
ALTER TABLE "session_context_checkpoints" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_context_checkpoints'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "session_context_checkpoints"', policy_record.policyname);
  END LOOP;
END
$$;--> statement-breakpoint
CREATE POLICY "session_context_checkpoints_company_scope_policy"
ON "session_context_checkpoints"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
