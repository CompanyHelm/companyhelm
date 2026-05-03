WITH current_period AS (
  SELECT
    date_trunc('month', timezone('UTC', now()))::timestamp with time zone AS period_start,
    (date_trunc('month', timezone('UTC', now())) + interval '1 month')::timestamp with time zone AS period_end
), missing_company_wallets AS (
  SELECT
    "companies"."id" AS "company_id",
    CASE "companies"."plan"::text
      WHEN 'pro' THEN 500000000000
      WHEN 'plus' THEN 50000000000
      ELSE 10000000000
    END AS "amount_nano_usd"
  FROM "companies"
  WHERE NOT EXISTS (
    SELECT 1
    FROM "wallets"
    WHERE "wallets"."company_id" = "companies"."id"
      AND "wallets"."type" = 'subscription'
  )
), inserted_wallets AS (
  INSERT INTO "wallets" ("id", "company_id", "type", "amount_nano_usd", "created_at", "updated_at")
  SELECT
    gen_random_uuid(),
    "missing_company_wallets"."company_id",
    'subscription',
    "missing_company_wallets"."amount_nano_usd",
    now(),
    now()
  FROM "missing_company_wallets"
  RETURNING "id", "company_id", "amount_nano_usd"
)
INSERT INTO "wallet_transactions" ("id", "company_id", "wallet_id", "category", "amount_nano_usd", "period_start", "period_end", "created_at")
SELECT
  gen_random_uuid(),
  "inserted_wallets"."company_id",
  "inserted_wallets"."id",
  'opening',
  "inserted_wallets"."amount_nano_usd",
  "current_period"."period_start",
  "current_period"."period_end",
  now()
FROM "inserted_wallets"
CROSS JOIN "current_period"
ON CONFLICT DO NOTHING;
