import { randomUUID } from "node:crypto";
import {
  bigint,
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";
import { companies } from "./company.ts";
import { agentSessions, sessionTurns } from "./sessions.ts";

export const walletTypeEnum = pgEnum("wallet_type", [
  "subscription",
  "pay_as_you_go",
]);

export const walletTransactionCategoryEnum = pgEnum("wallet_transaction_category", [
  "llm_charge",
  "monthly_recharge",
  "adjustment",
  "opening",
]);

export const wallets = pgTable("wallets", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  type: walletTypeEnum("type").notNull(),
  amountNanoUsd: bigint("amount_nano_usd", { mode: "number" }).default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("wallets_company_id_idx").on(table.companyId),
  companyTypeUnique: uniqueIndex("wallets_company_type_uidx").on(table.companyId, table.type),
}));

export const walletTransactions = pgTable("wallet_transactions", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  walletId: uuid("wallet_id")
    .references(() => wallets.id, { onDelete: "cascade" })
    .notNull(),
  category: walletTransactionCategoryEnum("category").notNull(),
  amountNanoUsd: bigint("amount_nano_usd", { mode: "number" }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  sessionId: uuid("session_id")
    .references((): typeof agentSessions.id => agentSessions.id, { onDelete: "set null" }),
  sessionTurnId: uuid("session_turn_id")
    .references((): typeof sessionTurns.id => sessionTurns.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
}, (table) => ({
  companyIdIndex: index("wallet_transactions_company_id_idx").on(table.companyId),
  walletIdIndex: index("wallet_transactions_wallet_id_idx").on(table.walletId),
  monthlyRechargePeriodUnique: uniqueIndex("wallet_transactions_monthly_recharge_period_uidx")
    .on(table.walletId, table.category, table.periodStart)
    .where(sql`${table.category} = 'monthly_recharge' AND ${table.periodStart} IS NOT NULL`),
  openingUnique: uniqueIndex("wallet_transactions_opening_uidx")
    .on(table.walletId, table.category)
    .where(sql`${table.category} = 'opening'`),
  llmChargeTurnUnique: uniqueIndex("wallet_transactions_llm_charge_turn_uidx")
    .on(table.sessionTurnId, table.category)
    .where(sql`${table.category} = 'llm_charge' AND ${table.sessionTurnId} IS NOT NULL`),
  amountSignCheck: check(
    "wallet_transactions_amount_sign_check",
    sql`(
      (${table.category} = 'llm_charge' AND ${table.amountNanoUsd} < 0)
      OR (${table.category} IN ('monthly_recharge', 'opening') AND ${table.amountNanoUsd} > 0)
      OR (${table.category} = 'adjustment' AND ${table.amountNanoUsd} <> 0)
    )`,
  ),
  periodOrderCheck: check(
    "wallet_transactions_period_order_check",
    sql`${table.periodEnd} IS NULL OR (${table.periodStart} IS NOT NULL AND ${table.periodEnd} > ${table.periodStart})`,
  ),
}));
