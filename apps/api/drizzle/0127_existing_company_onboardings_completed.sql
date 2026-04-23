INSERT INTO "company_onboardings" ("company_id", "status", "completed_at", "created_at", "updated_at")
SELECT "companies"."id", 'completed', now(), now(), now()
FROM "companies"
ON CONFLICT ("company_id") DO UPDATE
SET
	"status" = 'completed',
	"completed_at" = COALESCE("company_onboardings"."completed_at", EXCLUDED."completed_at"),
	"updated_at" = EXCLUDED."updated_at";
