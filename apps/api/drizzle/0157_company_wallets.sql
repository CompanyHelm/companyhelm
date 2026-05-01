DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typname = 'wallet_type'
  ) THEN
    CREATE TYPE "public"."wallet_type" AS ENUM('subscription', 'pay_as_you_go');
  END IF;
END $$;--> statement-breakpoint
ALTER TYPE "public"."company_subscription_plan" ADD VALUE IF NOT EXISTS 'pro';--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typname = 'wallet_transaction_category'
  ) THEN
    CREATE TYPE "public"."wallet_transaction_category" AS ENUM('llm_charge', 'monthly_recharge', 'adjustment', 'opening');
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pending_plan" "company_subscription_plan";--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "pending_plan_effective_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "type" "wallet_type" NOT NULL,
  "amount_nano_usd" bigint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  "updated_at" timestamp with time zone NOT NULL
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "wallet_id" uuid NOT NULL,
  "category" "wallet_transaction_category" NOT NULL,
  "amount_nano_usd" bigint NOT NULL,
  "period_start" timestamp with time zone,
  "period_end" timestamp with time zone,
  "session_id" uuid,
  "session_turn_id" uuid,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "wallet_transactions_amount_sign_check" CHECK ((
    ("category" = 'llm_charge' AND "amount_nano_usd" < 0)
    OR ("category" IN ('monthly_recharge', 'opening') AND "amount_nano_usd" > 0)
    OR ("category" = 'adjustment' AND "amount_nano_usd" <> 0)
  )),
  CONSTRAINT "wallet_transactions_period_order_check" CHECK ("period_end" IS NULL OR ("period_start" IS NOT NULL AND "period_end" > "period_start"))
);--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_session_turn_id_session_turns_id_fk" FOREIGN KEY ("session_turn_id") REFERENCES "public"."session_turns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallets_company_id_idx" ON "wallets" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallets_company_type_uidx" ON "wallets" USING btree ("company_id", "type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_transactions_company_id_idx" ON "wallet_transactions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wallet_transactions_wallet_id_idx" ON "wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_monthly_recharge_period_uidx" ON "wallet_transactions" USING btree ("wallet_id", "category", "period_start") WHERE "category" = 'monthly_recharge' AND "period_start" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_opening_uidx" ON "wallet_transactions" USING btree ("wallet_id", "category") WHERE "category" = 'opening';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_transactions_llm_charge_turn_uidx" ON "wallet_transactions" USING btree ("session_turn_id", "category") WHERE "category" = 'llm_charge' AND "session_turn_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "wallets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "wallets_company_scope_policy"
ON "wallets"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "wallet_transactions_company_scope_policy"
ON "wallet_transactions"
AS PERMISSIVE
FOR ALL
TO public
USING ("company_id" = current_setting('app.current_company_id', true)::uuid)
WITH CHECK ("company_id" = current_setting('app.current_company_id', true)::uuid);--> statement-breakpoint
WITH current_period AS (
  SELECT
    date_trunc('month', now())::timestamp with time zone AS period_start,
    (date_trunc('month', now()) + interval '1 month')::timestamp with time zone AS period_end
), inserted_wallets AS (
  INSERT INTO "wallets" ("id", "company_id", "type", "amount_nano_usd", "created_at", "updated_at")
  SELECT
    gen_random_uuid(),
    "companies"."id",
    'subscription',
    CASE "companies"."plan"::text
      WHEN 'pro' THEN 100000000000
      ELSE 10000000000
    END,
    now(),
    now()
  FROM "companies"
  WHERE NOT EXISTS (
    SELECT 1
    FROM "wallets"
    WHERE "wallets"."company_id" = "companies"."id"
      AND "wallets"."type" = 'subscription'
  )
  RETURNING "id", "company_id", "amount_nano_usd"
)
INSERT INTO "wallet_transactions" ("id", "company_id", "wallet_id", "category", "amount_nano_usd", "period_start", "period_end", "created_at")
SELECT
  gen_random_uuid(),
  inserted_wallets."company_id",
  inserted_wallets."id",
  'opening',
  inserted_wallets."amount_nano_usd",
  current_period.period_start,
  current_period.period_end,
  now()
FROM inserted_wallets
CROSS JOIN current_period
ON CONFLICT DO NOTHING;
