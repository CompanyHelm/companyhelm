CREATE TYPE "public"."message_content_type" AS ENUM('text', 'image');--> statement-breakpoint
CREATE TYPE "public"."session_message_role" AS ENUM('user', 'assistant', 'toolResult');--> statement-breakpoint
CREATE TABLE "message_contents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"type" "message_content_type" NOT NULL,
	"text" text,
	"data" text,
	"mime_type" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"role" "session_message_role" NOT NULL,
	"tool_call_id" text,
	"tool_name" text,
	"is_error" boolean NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "message_contents" ADD CONSTRAINT "message_contents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_contents" ADD CONSTRAINT "message_contents_message_id_session_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."session_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_messages" ADD CONSTRAINT "session_messages_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_contents_company_id_idx" ON "message_contents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "message_contents_message_id_idx" ON "message_contents" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "session_messages_company_id_idx" ON "session_messages" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_messages_session_id_idx" ON "session_messages" USING btree ("session_id");