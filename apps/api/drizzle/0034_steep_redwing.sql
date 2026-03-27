CREATE TABLE "session_tools" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_tools" ADD CONSTRAINT "session_tools_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_tools" ADD CONSTRAINT "session_tools_agent_session_id_agent_sessions_id_fk" FOREIGN KEY ("agent_session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_tools_company_id_idx" ON "session_tools" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_tools_agent_session_id_idx" ON "session_tools" USING btree ("agent_session_id");--> statement-breakpoint
CREATE INDEX "session_tools_name_idx" ON "session_tools" USING btree ("name");