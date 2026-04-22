CREATE TYPE "public"."company_subscription_plan" AS ENUM('free', 'starter', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."company_subscription_status" AS ENUM('trialing', 'active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "company_subscriptions" (
	"company_id" uuid PRIMARY KEY NOT NULL,
	"plan" "company_subscription_plan" NOT NULL,
	"status" "company_subscription_status" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_subscriptions" ADD CONSTRAINT "company_subscriptions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_subscriptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_subscriptions_company_scope_policy"
ON "company_subscriptions"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);
