CREATE TABLE "agent_session_secrets" (
	"company_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"secret_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_session_secrets_session_id_secret_id_pk" PRIMARY KEY("session_id","secret_id")
);
--> statement-breakpoint
CREATE TABLE "company_secrets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"env_var_name" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"encryption_key_id" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"updated_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "company_secrets_env_var_name_check" CHECK ("company_secrets"."env_var_name" ~ '^[A-Z_][A-Z0-9_]*$')
);
--> statement-breakpoint
ALTER TABLE "agent_session_secrets" ADD CONSTRAINT "agent_session_secrets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session_secrets" ADD CONSTRAINT "agent_session_secrets_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session_secrets" ADD CONSTRAINT "agent_session_secrets_secret_id_company_secrets_id_fk" FOREIGN KEY ("secret_id") REFERENCES "public"."company_secrets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session_secrets" ADD CONSTRAINT "agent_session_secrets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_secrets" ADD CONSTRAINT "company_secrets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_secrets" ADD CONSTRAINT "company_secrets_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_secrets" ADD CONSTRAINT "company_secrets_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_session_secrets_company_id_idx" ON "agent_session_secrets" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "agent_session_secrets_session_id_idx" ON "agent_session_secrets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "agent_session_secrets_secret_id_idx" ON "agent_session_secrets" USING btree ("secret_id");--> statement-breakpoint
CREATE INDEX "company_secrets_company_id_idx" ON "company_secrets" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "company_secrets_company_name_lower_uidx" ON "company_secrets" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "company_secrets_company_env_var_lower_uidx" ON "company_secrets" USING btree ("company_id",lower("env_var_name"));