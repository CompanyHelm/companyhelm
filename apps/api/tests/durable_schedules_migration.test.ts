import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "vitest";

test("durable schedules migration creates schedule tables and queue-message subtype wiring", () => {
  const migration = readFileSync(
    resolve(import.meta.dirname, "../drizzle/0168_durable_schedules.sql"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE "schedules"/u);
  assert.match(migration, /CREATE TABLE "queued_agent_message_schedules"/u);
  assert.match(migration, /CREATE TABLE "schedule_runs"/u);
  assert.match(migration, /ALTER TYPE "public"\."session_message_principal_type" ADD VALUE IF NOT EXISTS 'schedule'/u);
  assert.match(migration, /schedule_runs_workflow_run_id_workflow_runs_id_fk/u);
});

test("durable schedules migration protects new company-scoped tables with RLS", () => {
  const migration = readFileSync(
    resolve(import.meta.dirname, "../drizzle/0168_durable_schedules.sql"),
    "utf8",
  );

  assert.match(migration, /ALTER TABLE "schedules" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "schedules_company_scope_policy"/u);
  assert.match(migration, /ALTER TABLE "queued_agent_message_schedules" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "queued_agent_message_schedules_company_scope_policy"/u);
  assert.match(migration, /ALTER TABLE "schedule_runs" ENABLE ROW LEVEL SECURITY/u);
  assert.match(migration, /CREATE POLICY "schedule_runs_company_scope_policy"/u);
});
