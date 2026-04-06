ALTER TABLE "agent_conversation_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_conversation_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_conversation_messages"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_conversation_messages_company_scope_policy"
ON "agent_conversation_messages"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_conversation_participants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_conversation_participants'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_conversation_participants"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_conversation_participants_company_scope_policy"
ON "agent_conversation_participants"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_conversations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_conversations"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_conversations_company_scope_policy"
ON "agent_conversations"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_default_secrets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_default_secrets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_default_secrets"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_default_secrets_company_scope_policy"
ON "agent_default_secrets"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_environment_leases" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_environment_leases'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_environment_leases"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_environment_leases_company_scope_policy"
ON "agent_environment_leases"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_environment_requirements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_environment_requirements'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_environment_requirements"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_environment_requirements_company_scope_policy"
ON "agent_environment_requirements"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_environments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_environments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_environments"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_environments_company_scope_policy"
ON "agent_environments"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_inbox_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_inbox_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_inbox_items"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_inbox_items_company_scope_policy"
ON "agent_inbox_items"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_session_secrets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_session_secrets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_session_secrets"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_session_secrets_company_scope_policy"
ON "agent_session_secrets"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "artifacts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "artifacts"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "artifacts_company_scope_policy"
ON "artifacts"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "company_secrets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_secrets'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "company_secrets"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "company_secrets_company_scope_policy"
ON "company_secrets"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "company_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_settings'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "company_settings"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "company_settings_company_scope_policy"
ON "company_settings"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "message_contents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'message_contents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "message_contents"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "message_contents_company_scope_policy"
ON "message_contents"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "session_messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_messages'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "session_messages"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "session_messages_company_scope_policy"
ON "session_messages"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "session_tools" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_tools'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "session_tools"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "session_tools_company_scope_policy"
ON "session_tools"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "session_turns" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'session_turns'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "session_turns"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "session_turns_company_scope_policy"
ON "session_turns"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "task_categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_categories'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "task_categories"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "task_categories_company_scope_policy"
ON "task_categories"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "task_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'task_runs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "task_runs"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "task_runs_company_scope_policy"
ON "task_runs"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "tasks"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "tasks_company_scope_policy"
ON "tasks"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "user_session_reads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_session_reads'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "user_session_reads"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "user_session_reads_company_scope_policy"
ON "user_session_reads"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
--> statement-breakpoint
ALTER TABLE "agent_inbox_human_questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_inbox_human_questions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_inbox_human_questions"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_inbox_human_questions_company_scope_policy"
ON "agent_inbox_human_questions"
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM "agent_inbox_items"
    WHERE "agent_inbox_items"."id" = "inbox_item_id"
      AND "agent_inbox_items"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "agent_inbox_items"
    WHERE "agent_inbox_items"."id" = "inbox_item_id"
      AND "agent_inbox_items"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
);
--> statement-breakpoint
ALTER TABLE "agent_inbox_human_question_proposals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_inbox_human_question_proposals'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_inbox_human_question_proposals"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_inbox_human_question_proposals_company_scope_policy"
ON "agent_inbox_human_question_proposals"
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM "agent_inbox_items"
    WHERE "agent_inbox_items"."id" = "inbox_item_id"
      AND "agent_inbox_items"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "agent_inbox_items"
    WHERE "agent_inbox_items"."id" = "inbox_item_id"
      AND "agent_inbox_items"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
);
--> statement-breakpoint
ALTER TABLE "agent_inbox_human_question_answers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_inbox_human_question_answers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "agent_inbox_human_question_answers"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "agent_inbox_human_question_answers_company_scope_policy"
ON "agent_inbox_human_question_answers"
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM "agent_inbox_items"
    WHERE "agent_inbox_items"."id" = "inbox_item_id"
      AND "agent_inbox_items"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "agent_inbox_items"
    WHERE "agent_inbox_items"."id" = "inbox_item_id"
      AND "agent_inbox_items"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
);
--> statement-breakpoint
ALTER TABLE "artifact_markdown_documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifact_markdown_documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "artifact_markdown_documents"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "artifact_markdown_documents_company_scope_policy"
ON "artifact_markdown_documents"
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM "artifacts"
    WHERE "artifacts"."id" = "artifact_id"
      AND "artifacts"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "artifacts"
    WHERE "artifacts"."id" = "artifact_id"
      AND "artifacts"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
);
--> statement-breakpoint
ALTER TABLE "artifact_external_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifact_external_links'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "artifact_external_links"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "artifact_external_links_company_scope_policy"
ON "artifact_external_links"
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM "artifacts"
    WHERE "artifacts"."id" = "artifact_id"
      AND "artifacts"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "artifacts"
    WHERE "artifacts"."id" = "artifact_id"
      AND "artifacts"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
);
--> statement-breakpoint
ALTER TABLE "artifact_pull_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DO $$
DECLARE
  policy_record record;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifact_pull_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON "artifact_pull_requests"', policy_record.policyname);
  END LOOP;
END
$$;
--> statement-breakpoint
CREATE POLICY "artifact_pull_requests_company_scope_policy"
ON "artifact_pull_requests"
AS PERMISSIVE
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1
    FROM "artifacts"
    WHERE "artifacts"."id" = "artifact_id"
      AND "artifacts"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM "artifacts"
    WHERE "artifacts"."id" = "artifact_id"
      AND "artifacts"."company_id" = current_setting('app.current_company_id', true)::uuid
  )
);
