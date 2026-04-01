CREATE TABLE "agent_conversation_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"author_participant_id" uuid NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_conversation_participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_conversation_messages" ADD CONSTRAINT "agent_conversation_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversation_messages" ADD CONSTRAINT "agent_conversation_messages_conversation_id_agent_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversation_messages" ADD CONSTRAINT "agent_conversation_messages_author_participant_id_agent_conversation_participants_id_fk" FOREIGN KEY ("author_participant_id") REFERENCES "public"."agent_conversation_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversation_participants" ADD CONSTRAINT "agent_conversation_participants_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversation_participants" ADD CONSTRAINT "agent_conversation_participants_conversation_id_agent_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."agent_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversation_participants" ADD CONSTRAINT "agent_conversation_participants_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversation_participants" ADD CONSTRAINT "agent_conversation_participants_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_conversation_messages_company_id_idx" ON "agent_conversation_messages" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_conversation_messages_conversation_id_idx" ON "agent_conversation_messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "agent_conversation_messages_author_participant_id_idx" ON "agent_conversation_messages" USING btree ("author_participant_id");--> statement-breakpoint
CREATE INDEX "agent_conversation_participants_company_id_idx" ON "agent_conversation_participants" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_conversation_participants_conversation_id_idx" ON "agent_conversation_participants" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "agent_conversation_participants_session_id_idx" ON "agent_conversation_participants" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_conversation_participants_conversation_session_uidx" ON "agent_conversation_participants" USING btree ("conversation_id","session_id");--> statement-breakpoint
CREATE INDEX "agent_conversations_company_id_idx" ON "agent_conversations" USING btree ("company_id");