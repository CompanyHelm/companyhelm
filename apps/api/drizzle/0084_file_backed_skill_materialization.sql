DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'skills_file_backed_source_check'
  ) THEN
    ALTER TABLE "skills"
      ADD CONSTRAINT "skills_file_backed_source_check"
      CHECK (
        coalesce(cardinality("file_list"), 0) = 0
        OR (
          nullif(trim("repository"), '') IS NOT NULL
          AND nullif(trim("skill_directory"), '') IS NOT NULL
          AND nullif(trim("github_tracked_commit_sha"), '') IS NOT NULL
        )
      );
  END IF;
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "agent_session_active_skills" (
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE cascade,
  "session_id" uuid NOT NULL REFERENCES "agent_sessions"("id") ON DELETE cascade,
  "skill_id" uuid NOT NULL REFERENCES "skills"("id") ON DELETE cascade,
  "activated_at" timestamp with time zone NOT NULL,
  CONSTRAINT "agent_session_active_skills_session_id_skill_id_pk" PRIMARY KEY("session_id", "skill_id")
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "agent_session_active_skills_company_id_idx"
  ON "agent_session_active_skills" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_session_active_skills_session_id_idx"
  ON "agent_session_active_skills" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_session_active_skills_skill_id_idx"
  ON "agent_session_active_skills" USING btree ("skill_id");
