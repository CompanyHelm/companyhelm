CREATE TABLE "agent_default_secrets" (
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"secret_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_default_secrets_agent_id_secret_id_pk" PRIMARY KEY("agent_id","secret_id")
);
--> statement-breakpoint
ALTER TABLE "agent_session_secrets" DROP CONSTRAINT "agent_session_secrets_created_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_session_secrets" ALTER COLUMN "created_by_user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_default_secrets" ADD CONSTRAINT "agent_default_secrets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_default_secrets" ADD CONSTRAINT "agent_default_secrets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_default_secrets" ADD CONSTRAINT "agent_default_secrets_secret_id_company_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."company_secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_default_secrets" ADD CONSTRAINT "agent_default_secrets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_default_secrets_company_id_idx" ON "agent_default_secrets" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_default_secrets_agent_id_idx" ON "agent_default_secrets" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "agent_default_secrets_secret_id_idx" ON "agent_default_secrets" USING btree ("secret_id");--> statement-breakpoint
ALTER TABLE "agent_session_secrets" ADD CONSTRAINT "agent_session_secrets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;