CREATE TABLE "user_session_reads" (
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_session_reads_company_id_user_id_session_id_pk" PRIMARY KEY("company_id","user_id","session_id")
);
--> statement-breakpoint
ALTER TABLE "user_session_reads" ADD CONSTRAINT "user_session_reads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_reads" ADD CONSTRAINT "user_session_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_session_reads" ADD CONSTRAINT "user_session_reads_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_session_reads_company_user_id_idx" ON "user_session_reads" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "user_session_reads_session_id_idx" ON "user_session_reads" USING btree ("session_id");