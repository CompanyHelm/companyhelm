CREATE TYPE "public"."company_subscription_plan" AS ENUM('free', 'pro');--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plan" "company_subscription_plan";--> statement-breakpoint
UPDATE "companies" SET "plan" = 'free' WHERE "plan" IS NULL;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "plan" SET NOT NULL;
