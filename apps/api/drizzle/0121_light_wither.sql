DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typname = 'company_subscription_plan'
  ) THEN
    CREATE TYPE "public"."company_subscription_plan" AS ENUM('free', 'pro');
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "plan" "company_subscription_plan";--> statement-breakpoint
UPDATE "companies" SET "plan" = 'free' WHERE "plan" IS NULL;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "plan" SET NOT NULL;
