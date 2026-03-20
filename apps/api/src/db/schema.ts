import { randomUUID } from "node:crypto";
import {
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm/sql";

export const companies = pgTable("companies", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  name: varchar("name", { length: 255 }).notNull()
});

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .$defaultFn(() => randomUUID()),
  first_name: text("first_name").notNull(),
  last_name: text("last_name"),
  email: text("email").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull()
}, (table) => ({
  emailUnique: uniqueIndex("users_email_uidx").on(table.email),
  firstNameLengthCheck: check("users_first_name_length_check", sql`length(${table.first_name}) <= 255`),
  lastNameLengthCheck: check(
    "users_last_name_length_check",
    sql`${table.last_name} IS NULL OR length(${table.last_name}) <= 255`
  )
}));
