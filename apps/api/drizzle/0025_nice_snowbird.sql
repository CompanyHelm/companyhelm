CREATE TYPE "public"."session_queued_message_status" AS ENUM('pending', 'processing');--> statement-breakpoint
CREATE TABLE "session_queued_message_images" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_queued_message_id" uuid NOT NULL,
	"base64_encoded_image" text NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_queued_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"text" text NOT NULL,
	"status" "session_queued_message_status" NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_queued_message_images" ADD CONSTRAINT "session_queued_message_images_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_message_images" ADD CONSTRAINT "session_queued_message_images_session_queued_message_id_session_queued_messages_id_fk" FOREIGN KEY ("session_queued_message_id") REFERENCES "public"."session_queued_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD CONSTRAINT "session_queued_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_queued_messages" ADD CONSTRAINT "session_queued_messages_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_queued_message_images_company_id_idx" ON "session_queued_message_images" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_queued_message_images_session_queued_message_id_idx" ON "session_queued_message_images" USING btree ("session_queued_message_id");--> statement-breakpoint
CREATE INDEX "session_queued_messages_company_id_idx" ON "session_queued_messages" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "session_queued_messages_session_id_idx" ON "session_queued_messages" USING btree ("session_id");