WITH "legacy_companyhelm_models" AS (
	SELECT
		"model_provider_credential_models"."id" AS "model_provider_credential_model_id",
		"model_provider_credential_models"."model_id" AS "model_id",
		"model_provider_credentials"."id" AS "model_provider_credential_id"
	FROM "model_provider_credential_models"
	INNER JOIN "model_provider_credentials"
		ON "model_provider_credentials"."id" = "model_provider_credential_models"."model_provider_credential_id"
	WHERE "model_provider_credentials"."model_provider"::text IN ('system:companyhelm', 'companyhelm')
),
"legacy_model_platform_matches" AS (
	SELECT
		"legacy_companyhelm_models"."model_provider_credential_model_id",
		"platform_models"."id" AS "platform_model_id"
	FROM "legacy_companyhelm_models"
	INNER JOIN LATERAL (
		SELECT "platform_models"."id"
		FROM "platform_models"
		INNER JOIN "platform_model_routes"
			ON "platform_model_routes"."platform_model_id" = "platform_models"."id"
		WHERE "platform_models"."model_id" = "legacy_companyhelm_models"."model_id"
		ORDER BY
			"platform_models"."is_default" DESC,
			"platform_models"."is_available" DESC,
			"platform_models"."created_at" ASC
		LIMIT 1
	) AS "platform_models" ON true
)
UPDATE "agents"
SET
	"default_model_credential_source" = 'platform',
	"default_platform_model_id" = "legacy_model_platform_matches"."platform_model_id",
	"default_model_provider_credential_model_id" = NULL
FROM "legacy_model_platform_matches"
WHERE "agents"."default_model_provider_credential_model_id" = "legacy_model_platform_matches"."model_provider_credential_model_id";
--> statement-breakpoint
WITH "legacy_companyhelm_models" AS (
	SELECT
		"model_provider_credential_models"."id" AS "model_provider_credential_model_id",
		"model_provider_credential_models"."model_id" AS "model_id",
		"model_provider_credentials"."id" AS "model_provider_credential_id"
	FROM "model_provider_credential_models"
	INNER JOIN "model_provider_credentials"
		ON "model_provider_credentials"."id" = "model_provider_credential_models"."model_provider_credential_id"
	WHERE "model_provider_credentials"."model_provider"::text IN ('system:companyhelm', 'companyhelm')
),
"legacy_model_platform_matches" AS (
	SELECT
		"legacy_companyhelm_models"."model_provider_credential_model_id",
		"platform_models"."id" AS "platform_model_id",
		"platform_model_routes"."platform_model_provider_credential_model_id" AS "platform_model_provider_credential_model_id"
	FROM "legacy_companyhelm_models"
	INNER JOIN LATERAL (
		SELECT
			"platform_models"."id",
			"platform_models"."is_available",
			"platform_models"."is_default",
			"platform_models"."created_at"
		FROM "platform_models"
		INNER JOIN "platform_model_routes"
			ON "platform_model_routes"."platform_model_id" = "platform_models"."id"
		WHERE "platform_models"."model_id" = "legacy_companyhelm_models"."model_id"
		ORDER BY
			"platform_models"."is_default" DESC,
			"platform_models"."is_available" DESC,
			"platform_models"."created_at" ASC
		LIMIT 1
	) AS "platform_models" ON true
	INNER JOIN LATERAL (
		SELECT "platform_model_routes"."platform_model_provider_credential_model_id"
		FROM "platform_model_routes"
		WHERE "platform_model_routes"."platform_model_id" = "platform_models"."id"
		ORDER BY "platform_model_routes"."created_at" ASC
		LIMIT 1
	) AS "platform_model_routes" ON true
)
UPDATE "agent_sessions"
SET
	"current_model_credential_source" = 'platform',
	"current_platform_model_id" = "legacy_model_platform_matches"."platform_model_id",
	"current_platform_model_provider_credential_model_id" = "legacy_model_platform_matches"."platform_model_provider_credential_model_id",
	"current_model_provider_credential_model_id" = NULL
FROM "legacy_model_platform_matches"
WHERE "agent_sessions"."current_model_provider_credential_model_id" = "legacy_model_platform_matches"."model_provider_credential_model_id";
--> statement-breakpoint
DELETE FROM "model_provider_credential_models"
USING "model_provider_credentials"
WHERE "model_provider_credentials"."id" = "model_provider_credential_models"."model_provider_credential_id"
	AND "model_provider_credentials"."model_provider"::text IN ('system:companyhelm', 'companyhelm');
--> statement-breakpoint
DELETE FROM "model_provider_credentials"
WHERE "model_provider_credentials"."model_provider"::text IN ('system:companyhelm', 'companyhelm');
