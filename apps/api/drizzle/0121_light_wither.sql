DROP TABLE "company_subscriptions" CASCADE;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."company_subscription_plan";--> statement-breakpoint
CREATE TYPE "public"."company_subscription_plan" AS ENUM('free', 'pro');--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "plan" SET DATA TYPE "public"."company_subscription_plan" USING "plan"::"public"."company_subscription_plan";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "plan" "company_subscription_plan" NOT NULL;--> statement-breakpoint
DROP TYPE "public"."company_subscription_status";