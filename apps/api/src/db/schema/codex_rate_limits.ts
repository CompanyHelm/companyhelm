import { randomUUID } from "node:crypto";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { modelProviderCredentials } from "./agents.ts";
import { companies } from "./company.ts";

export const codexRateLimitSnapshots = pgTable("codex_rate_limit_snapshots", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  companyId: uuid("company_id")
    .references(() => companies.id, { onDelete: "cascade" })
    .notNull(),
  credentialId: uuid("credential_id")
    .references(() => modelProviderCredentials.id, { onDelete: "cascade" })
    .notNull(),
  limitId: text("limit_id").notNull(),
  limitName: text("limit_name"),
  planType: text("plan_type"),
  primaryUsedPercent: doublePrecision("primary_used_percent"),
  primaryWindowMinutes: integer("primary_window_minutes"),
  primaryResetsAt: timestamp("primary_resets_at", { withTimezone: true }),
  secondaryUsedPercent: doublePrecision("secondary_used_percent"),
  secondaryWindowMinutes: integer("secondary_window_minutes"),
  secondaryResetsAt: timestamp("secondary_resets_at", { withTimezone: true }),
  creditsHasCredits: boolean("credits_has_credits"),
  creditsUnlimited: boolean("credits_unlimited"),
  creditsBalance: text("credits_balance"),
  rateLimitReachedType: text("rate_limit_reached_type"),
  lastError: text("last_error"),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
}, (table) => ({
  credentialIndex: index("codex_rate_limit_snapshots_credential_idx").on(
    table.companyId,
    table.credentialId,
  ),
  credentialLimitUnique: uniqueIndex("codex_rate_limit_snapshots_credential_limit_uidx").on(
    table.companyId,
    table.credentialId,
    table.limitId,
  ),
}));
