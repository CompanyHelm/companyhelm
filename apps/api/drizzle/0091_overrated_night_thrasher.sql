CREATE TABLE "secret_groups" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_default_secret_groups" (
	"company_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"secret_group_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "agent_default_secret_groups_agent_id_secret_group_id_pk" PRIMARY KEY("agent_id","secret_group_id")
);
--> statement-breakpoint
ALTER TABLE "company_secrets" ADD COLUMN "secret_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "secret_groups" ADD CONSTRAINT "secret_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_default_secret_groups" ADD CONSTRAINT "agent_default_secret_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_default_secret_groups" ADD CONSTRAINT "agent_default_secret_groups_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_default_secret_groups" ADD CONSTRAINT "agent_default_secret_groups_secret_group_id_secret_groups_id_fk" FOREIGN KEY ("secret_group_id") REFERENCES "public"."secret_groups"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_default_secret_groups" ADD CONSTRAINT "agent_default_secret_groups_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "company_secrets" ADD CONSTRAINT "company_secrets_secret_group_id_secret_groups_id_fk" FOREIGN KEY ("secret_group_id") REFERENCES "public"."secret_groups"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "secret_groups_company_id_idx" ON "secret_groups" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "agent_default_secret_groups_company_id_idx" ON "agent_default_secret_groups" USING btree ("company_id");
--> statement-breakpoint
CREATE INDEX "agent_default_secret_groups_agent_id_idx" ON "agent_default_secret_groups" USING btree ("agent_id");
--> statement-breakpoint
CREATE INDEX "agent_default_secret_groups_secret_group_id_idx" ON "agent_default_secret_groups" USING btree ("secret_group_id");
--> statement-breakpoint
CREATE INDEX "company_secrets_secret_group_id_idx" ON "company_secrets" USING btree ("secret_group_id");
