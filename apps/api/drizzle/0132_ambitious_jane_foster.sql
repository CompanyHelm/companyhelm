DO $$
BEGIN
  CREATE TYPE "public"."company_onboarding_llm_setup_status" AS ENUM('pending', 'third_party', 'company_managed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."company_onboarding_setup_status" AS ENUM('pending', 'completed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "company_mission" text;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "mission_skipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "github_setup_status" "company_onboarding_setup_status";--> statement-breakpoint
UPDATE "company_onboardings"
SET "github_setup_status" = 'pending'
WHERE "github_setup_status" IS NULL;--> statement-breakpoint
ALTER TABLE "company_onboardings" ALTER COLUMN "github_setup_status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "company_onboardings" ALTER COLUMN "github_setup_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "github_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "github_skipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "llm_setup_status" "company_onboarding_llm_setup_status";--> statement-breakpoint
UPDATE "company_onboardings"
SET "llm_setup_status" = 'pending'
WHERE "llm_setup_status" IS NULL;--> statement-breakpoint
ALTER TABLE "company_onboardings" ALTER COLUMN "llm_setup_status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "company_onboardings" ALTER COLUMN "llm_setup_status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "llm_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "company_onboardings" ADD COLUMN IF NOT EXISTS "llm_skipped_at" timestamp with time zone;--> statement-breakpoint
