CREATE TABLE "platform_models" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"model_provider" "model_provider" NOT NULL,
	"model_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"reasoning_supported" boolean DEFAULT false NOT NULL,
	"reasoning_levels" text[],
	"is_default" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_model_routes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"platform_model_id" uuid NOT NULL,
	"platform_model_provider_credential_model_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "agents_default_model_selection_check";
--> statement-breakpoint
ALTER TABLE "agents" DROP CONSTRAINT IF EXISTS "agents_default_platform_model_provider_credential_model_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP CONSTRAINT IF EXISTS "agent_sessions_current_model_selection_check";
--> statement-breakpoint
ALTER TABLE "agent_sessions" DROP CONSTRAINT IF EXISTS "agent_sessions_current_platform_model_provider_credential_model_id_fk";
--> statement-breakpoint
ALTER TABLE "agents" ADD COLUMN "default_platform_model_id" uuid;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD COLUMN "current_platform_model_id" uuid;
--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "platform_model_id" uuid;
--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "platform_model_provider_credential_model_id" uuid;
--> statement-breakpoint
ALTER TABLE "session_turns" ADD COLUMN "platform_model_provider_credential_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_models_default_uidx" ON "platform_models" USING btree ("is_default") WHERE "platform_models"."is_default";
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_models_key_uidx" ON "platform_models" USING btree ("key");
--> statement-breakpoint
CREATE INDEX "platform_models_model_provider_idx" ON "platform_models" USING btree ("model_provider");
--> statement-breakpoint
CREATE INDEX "platform_model_routes_platform_model_idx" ON "platform_model_routes" USING btree ("platform_model_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "platform_model_routes_credential_model_uidx" ON "platform_model_routes" USING btree ("platform_model_id","platform_model_provider_credential_model_id");
--> statement-breakpoint
WITH "catalog" AS (
	SELECT DISTINCT ON (
		"platform_model_provider_credentials"."model_provider",
		"platform_model_provider_credential_models"."model_id"
	)
		"platform_model_provider_credentials"."model_provider",
		"platform_model_provider_credential_models"."model_id",
		"platform_model_provider_credentials"."model_provider" || ':' || "platform_model_provider_credential_models"."model_id" AS "key",
		"platform_model_provider_credential_models"."name",
		"platform_model_provider_credential_models"."description",
		"platform_model_provider_credential_models"."reasoning_supported",
		"platform_model_provider_credential_models"."reasoning_levels",
		"platform_model_provider_credential_models"."is_available"
	FROM "platform_model_provider_credential_models"
	INNER JOIN "platform_model_provider_credentials"
		ON "platform_model_provider_credentials"."id" = "platform_model_provider_credential_models"."platform_model_provider_credential_id"
	ORDER BY
		"platform_model_provider_credentials"."model_provider",
		"platform_model_provider_credential_models"."model_id",
		"platform_model_provider_credentials"."is_default" DESC,
		"platform_model_provider_credential_models"."is_default" DESC,
		"platform_model_provider_credential_models"."updated_at" DESC
)
INSERT INTO "platform_models" (
	"id",
	"key",
	"model_provider",
	"model_id",
	"name",
	"description",
	"reasoning_supported",
	"reasoning_levels",
	"is_default",
	"is_available",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	"catalog"."key",
	"catalog"."model_provider",
	"catalog"."model_id",
	"catalog"."name",
	"catalog"."description",
	"catalog"."reasoning_supported",
	"catalog"."reasoning_levels",
	false,
	"catalog"."is_available",
	NOW(),
	NOW()
FROM "catalog"
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint
INSERT INTO "platform_model_routes" (
	"id",
	"platform_model_id",
	"platform_model_provider_credential_model_id",
	"created_at",
	"updated_at"
)
SELECT
	gen_random_uuid(),
	"platform_models"."id",
	"platform_model_provider_credential_models"."id",
	NOW(),
	NOW()
FROM "platform_model_provider_credential_models"
INNER JOIN "platform_model_provider_credentials"
	ON "platform_model_provider_credentials"."id" = "platform_model_provider_credential_models"."platform_model_provider_credential_id"
INNER JOIN "platform_models"
	ON "platform_models"."key" = "platform_model_provider_credentials"."model_provider" || ':' || "platform_model_provider_credential_models"."model_id"
ON CONFLICT ("platform_model_id", "platform_model_provider_credential_model_id") DO NOTHING;
--> statement-breakpoint
WITH "preferred_platform_model" AS (
	SELECT "platform_models"."id"
	FROM "platform_models"
	INNER JOIN "platform_model_routes"
		ON "platform_model_routes"."platform_model_id" = "platform_models"."id"
	INNER JOIN "platform_model_provider_credential_models"
		ON "platform_model_provider_credential_models"."id" = "platform_model_routes"."platform_model_provider_credential_model_id"
	INNER JOIN "platform_model_provider_credentials"
		ON "platform_model_provider_credentials"."id" = "platform_model_provider_credential_models"."platform_model_provider_credential_id"
	ORDER BY
		"platform_model_provider_credentials"."is_default" DESC,
		"platform_model_provider_credential_models"."is_default" DESC,
		"platform_models"."created_at" ASC
	LIMIT 1
)
UPDATE "platform_models"
SET "is_default" = true
FROM "preferred_platform_model"
WHERE "platform_models"."id" = "preferred_platform_model"."id"
	AND NOT EXISTS (
		SELECT 1
		FROM "platform_models" AS "existing_default_platform_models"
		WHERE "existing_default_platform_models"."is_default" = true
	);
--> statement-breakpoint
UPDATE "agents"
SET "default_platform_model_id" = "platform_model_routes"."platform_model_id"
FROM "platform_model_routes"
WHERE "agents"."default_platform_model_provider_credential_model_id" = "platform_model_routes"."platform_model_provider_credential_model_id";
--> statement-breakpoint
UPDATE "agent_sessions"
SET "current_platform_model_id" = "platform_model_routes"."platform_model_id"
FROM "platform_model_routes"
WHERE "agent_sessions"."current_platform_model_provider_credential_model_id" = "platform_model_routes"."platform_model_provider_credential_model_id";
--> statement-breakpoint
ALTER TABLE "platform_model_routes" ADD CONSTRAINT "platform_model_routes_platform_model_id_platform_models_id_fk" FOREIGN KEY ("platform_model_id") REFERENCES "public"."platform_models"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "platform_model_routes" ADD CONSTRAINT "platform_model_routes_platform_model_provider_credential_model_id_platform_model_provider_credential_models_id_fk" FOREIGN KEY ("platform_model_provider_credential_model_id") REFERENCES "public"."platform_model_provider_credential_models"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_platform_model_id_platform_models_id_fk" FOREIGN KEY ("default_platform_model_id") REFERENCES "public"."platform_models"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_platform_model_id_platform_models_id_fk" FOREIGN KEY ("current_platform_model_id") REFERENCES "public"."platform_models"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_platform_model_provider_credential_model_id_platform_model_provider_credential_models_id_fk" FOREIGN KEY ("current_platform_model_provider_credential_model_id") REFERENCES "public"."platform_model_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_turns" ADD CONSTRAINT "session_turns_platform_model_id_platform_models_id_fk" FOREIGN KEY ("platform_model_id") REFERENCES "public"."platform_models"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_turns" ADD CONSTRAINT "session_turns_platform_model_provider_credential_model_id_platform_model_provider_credential_models_id_fk" FOREIGN KEY ("platform_model_provider_credential_model_id") REFERENCES "public"."platform_model_provider_credential_models"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_turns" ADD CONSTRAINT "session_turns_platform_model_provider_credential_id_platform_model_provider_credentials_id_fk" FOREIGN KEY ("platform_model_provider_credential_id") REFERENCES "public"."platform_model_provider_credentials"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "agents" DROP COLUMN "default_platform_model_provider_credential_model_id";
--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_default_model_selection_check" CHECK ((
      ("agents"."default_model_credential_source" = 'platform' AND "agents"."default_platform_model_id" IS NOT NULL AND "agents"."default_model_provider_credential_model_id" IS NULL)
      OR
      ("agents"."default_model_credential_source" = 'user_provided' AND "agents"."default_platform_model_id" IS NULL AND "agents"."default_model_provider_credential_model_id" IS NOT NULL)
    ));
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_current_model_selection_check" CHECK ((
      ("agent_sessions"."current_model_credential_source" = 'platform' AND "agent_sessions"."current_platform_model_id" IS NOT NULL AND "agent_sessions"."current_model_provider_credential_model_id" IS NULL)
      OR
      ("agent_sessions"."current_model_credential_source" = 'user_provided' AND "agent_sessions"."current_platform_model_id" IS NULL AND "agent_sessions"."current_platform_model_provider_credential_model_id" IS NULL AND "agent_sessions"."current_model_provider_credential_model_id" IS NOT NULL)
    ));
