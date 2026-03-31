CREATE TABLE "session_turns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
INSERT INTO "session_turns" ("id", "company_id", "session_id", "started_at", "ended_at")
SELECT
  "turn_id",
  "company_id",
  "session_id",
  MIN("created_at"),
  CASE
    WHEN bool_or("status" = 'running') THEN NULL
    ELSE MAX("updated_at")
  END
FROM "session_messages"
GROUP BY "turn_id", "company_id", "session_id";
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assigned_user_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assigned_agent_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assigned_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "session_turns" ADD CONSTRAINT "session_turns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_turns" ADD CONSTRAINT "session_turns_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_turns_company_id_idx" ON "session_turns" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_turns_session_id_idx" ON "session_turns" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_turns_session_started_at_idx" ON "session_turns" USING btree ("session_id","started_at");--> statement-breakpoint
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_turn_id_session_turns_id_fk" FOREIGN KEY ("turn_id") REFERENCES "public"."session_turns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigned_agent_id_agents_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_company_assigned_user_id_idx" ON "tasks" USING btree ("company_id","assigned_user_id");--> statement-breakpoint
CREATE INDEX "tasks_company_assigned_agent_id_idx" ON "tasks" USING btree ("company_id","assigned_agent_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_one_assignee_check" CHECK (num_nonnulls("tasks"."assigned_user_id", "tasks"."assigned_agent_id") <= 1);
