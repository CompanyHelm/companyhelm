import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

test("plus billing plan migration adds the enum value safely", () => {
  const migration = readFileSync(
    resolve(import.meta.dirname, "../drizzle/0158_plus_billing_plan.sql"),
    "utf8",
  );

  assert.match(migration, /ALTER TYPE "public"\."company_subscription_plan" ADD VALUE IF NOT EXISTS 'plus'/u);
});
