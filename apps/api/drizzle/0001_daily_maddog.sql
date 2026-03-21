CREATE TYPE "public"."model_provider" AS ENUM('openai');--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"default_model_name" text NOT NULL,
	"default_reasoning_level" text,
	"model_api_key_id" uuid,
	"model_oauth_token_id" uuid,
	"system_prompt" text,
	CONSTRAINT "agents_model_api_key_id_or_oauth_token_id_check" CHECK ((NOT ("agents"."model_api_key_id" IS NOT NULL AND "agents"."model_oauth_token_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "company_members" (
	"company_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "company_members_company_id_user_id_pk" PRIMARY KEY("company_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "model_api_keys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"model_provider" "model_provider" NOT NULL,
	"encrypted_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_oauth_tokens" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"model_provider" "model_provider" NOT NULL,
	"encrypted_refresh_token" text NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_auths" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"password_salt" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "name" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_model_api_key_id_model_api_keys_id_fk" FOREIGN KEY ("model_api_key_id") REFERENCES "public"."model_api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_model_oauth_token_id_model_oauth_tokens_id_fk" FOREIGN KEY ("model_oauth_token_id") REFERENCES "public"."model_oauth_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_members" ADD CONSTRAINT "company_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_api_keys" ADD CONSTRAINT "model_api_keys_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_oauth_tokens" ADD CONSTRAINT "model_oauth_tokens_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_auths" ADD CONSTRAINT "user_auths_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_company_id_idx" ON "agents" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_members_company_id_idx" ON "company_members" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_members_user_id_idx" ON "company_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "model_api_keys_company_id_idx" ON "model_api_keys" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "model_oauth_tokens_company_id_idx" ON "model_oauth_tokens" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "threads_company_id_idx" ON "threads" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_auths_user_id_uidx" ON "user_auths" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_auths_email_uidx" ON "user_auths" USING btree ("email");