CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "threads" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "threads" CASCADE;--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_model_provider_credential_model_id" uuid;--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ADD COLUMN "model_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" ADD COLUMN "description" text NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "threads_company_id_idx" ON "agent_sessions" USING btree ("company_id");--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_model_provider_credential_model_id_model_provider_credential_models_id_fk" FOREIGN KEY ("default_model_provider_credential_model_id") REFERENCES "public"."model_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "default_model_name";--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "model_provider_credential_models" DROP COLUMN "updated_at";