CREATE TYPE "public"."agent_inbox_kind" AS ENUM('human_question');--> statement-breakpoint
CREATE TYPE "public"."agent_inbox_status" AS ENUM('open', 'resolved');--> statement-breakpoint
CREATE TABLE "agent_inbox_human_question_answers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"inbox_item_id" uuid NOT NULL,
	"selected_proposal_id" uuid,
	"custom_answer_text" text,
	"final_answer_text" text NOT NULL,
	"answered_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_inbox_human_question_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"inbox_item_id" uuid NOT NULL,
	"answer_text" text NOT NULL,
	"rating" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"pros" text[] NOT NULL,
	"cons" text[] NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_inbox_human_question_proposals_rating_check" CHECK ("agent_inbox_human_question_proposals"."rating" >= 1 AND "agent_inbox_human_question_proposals"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "agent_inbox_human_questions" (
	"inbox_item_id" uuid PRIMARY KEY NOT NULL,
	"question_text" text NOT NULL,
	"allow_custom_answer" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_inbox_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"tool_call_id" text,
	"kind" "agent_inbox_kind" NOT NULL,
	"status" "agent_inbox_status" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "agent_inbox_human_question_answers" ADD CONSTRAINT "agent_inbox_human_question_answers_inbox_item_id_agent_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."agent_inbox_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_human_question_answers" ADD CONSTRAINT "agent_inbox_human_question_answers_selected_proposal_id_agent_inbox_human_question_proposals_id_fk" FOREIGN KEY ("selected_proposal_id") REFERENCES "public"."agent_inbox_human_question_proposals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_human_question_answers" ADD CONSTRAINT "agent_inbox_human_question_answers_answered_by_user_id_users_id_fk" FOREIGN KEY ("answered_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_human_question_proposals" ADD CONSTRAINT "agent_inbox_human_question_proposals_inbox_item_id_agent_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."agent_inbox_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_human_questions" ADD CONSTRAINT "agent_inbox_human_questions_inbox_item_id_agent_inbox_items_id_fk" FOREIGN KEY ("inbox_item_id") REFERENCES "public"."agent_inbox_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_items" ADD CONSTRAINT "agent_inbox_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_items" ADD CONSTRAINT "agent_inbox_items_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_items" ADD CONSTRAINT "agent_inbox_items_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_inbox_items" ADD CONSTRAINT "agent_inbox_items_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_inbox_human_question_answers_inbox_item_id_uidx" ON "agent_inbox_human_question_answers" USING btree ("inbox_item_id");--> statement-breakpoint
CREATE INDEX "agent_inbox_human_question_proposals_inbox_item_id_idx" ON "agent_inbox_human_question_proposals" USING btree ("inbox_item_id");--> statement-breakpoint
CREATE INDEX "agent_inbox_human_questions_inbox_item_id_idx" ON "agent_inbox_human_questions" USING btree ("inbox_item_id");--> statement-breakpoint
CREATE INDEX "agent_inbox_items_company_id_idx" ON "agent_inbox_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_inbox_items_session_id_idx" ON "agent_inbox_items" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "agent_inbox_items_agent_id_idx" ON "agent_inbox_items" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_inbox_items_status_idx" ON "agent_inbox_items" USING btree ("status");
