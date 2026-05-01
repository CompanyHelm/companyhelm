# Company Wallets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace CompanyHelm-managed LLM usage caps with company-scoped wallets that are debited for managed LLM charges and recharged monthly by subscription plan.

**Architecture:** Add wallet tables and plan scheduling fields, centralize balance/charge/recharge behavior in a wallet service, and swap existing managed-budget runtime gates to wallet checks. Use a BullMQ Job Scheduler for a daily UTC recharge sweep, while Postgres unique constraints make monthly recharges and LLM charges idempotent.

**Tech Stack:** TypeScript, Drizzle ORM/Postgres migrations, BullMQ, Vitest, Fastify API server.

---

### Task 1: Wallet schema and migration

**Files:**
- Modify: `apps/api/src/db/schema/company.ts`
- Create: `apps/api/src/db/schema/wallets.ts`
- Modify: `apps/api/src/db/schema/index.ts`
- Create: `apps/api/tests/company_wallets_migration.test.ts`
- Create: `apps/api/drizzle/0156_company_wallets.sql`

- [ ] Write a migration test that asserts wallet enums, tables, pending plan fields, category checks, and idempotency indexes exist.
- [ ] Add Drizzle enums/tables for wallets and wallet transactions, plus `pendingPlan`/`pendingPlanEffectiveAt` on companies.
- [ ] Add SQL migration with backfill: companies get a subscription wallet with current plan monthly amount and an opening transaction for the current UTC month.
- [ ] Export schema and run targeted migration test.

### Task 2: Wallet service

**Files:**
- Create: `apps/api/src/services/wallet/service.ts`
- Create: `apps/api/tests/company_wallet_service.test.ts`

- [ ] Write tests for positive/zero/negative balance checks, opening bootstrap, managed LLM charge idempotency, monthly recharge idempotency, upgrade top-up, downgrade scheduling, and applying due pending plans.
- [ ] Implement `CompanyWalletService` with plan amount mapping, UTC month periods, subscription wallet bootstrap, balance assertions, charge recording, monthly recharge, upgrade/downgrade helpers, and daily sweep.
- [ ] Run targeted wallet service tests.

### Task 3: Runtime enforcement and usage charging

**Files:**
- Modify: `apps/api/src/services/agent/session/session_lifecycle_service.ts`
- Modify: `apps/api/src/services/agent/session/session_prompt_service.ts`
- Modify: `apps/api/src/services/agent/session/process/execution.ts`
- Modify: `apps/api/src/services/agent/session/session_turn_usage_service.ts`
- Modify tests around session lifecycle/process/turn usage.

- [ ] Update tests so managed/platform sessions use wallet balance instead of daily/monthly budget caps.
- [ ] Inject and call `CompanyWalletService` at the existing managed-provider gates.
- [ ] Record `llm_charge` wallet transactions only when `credentialSource === "platform"`, using `totalCostNanoVirtualUsd`.
- [ ] Run targeted session and usage tests.

### Task 4: Company creation bootstrap

**Files:**
- Modify: `apps/api/src/services/bootstrap/company.ts`
- Modify: `apps/api/src/auth/local/local_auth_service.ts`
- Modify: `apps/api/src/auth/dev/dev_auth_service.ts`
- Modify: company creation tests.

- [ ] Update creation tests to assert a new free company has a subscription wallet and opening transaction.
- [ ] Call wallet bootstrap in every company creation path in the same transaction.
- [ ] Run targeted company creation/bootstrap tests.

### Task 5: BullMQ daily recharge scheduler

**Files:**
- Create: `apps/api/src/services/wallet/queue_names.ts`
- Create: `apps/api/src/services/wallet/queue.ts`
- Create: `apps/api/src/workers/wallet_recharges.ts`
- Modify: `apps/api/src/config/schema.ts`
- Modify: `apps/api/src/server/api_server.ts`
- Create: `apps/api/tests/wallet_recharge_worker.test.ts`

- [ ] Write tests proving the scheduler uses `wallet-subscription-recharge-daily` and the worker calls the wallet daily sweep.
- [ ] Add queue service using `queue.upsertJobScheduler("wallet-subscription-recharge-daily", ...)` at `03:15 UTC` daily.
- [ ] Add worker to process recharge sweep jobs and wire start/stop/close in `ApiServer`.
- [ ] Run targeted worker/server tests.

### Task 6: GraphQL/web visibility

**Files:**
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Create/modify wallet resolver files under `apps/api/src/graphql/resolvers`
- Modify usage/dashboard web components and Relay generated files as needed.

- [ ] Expose wallet total, wallet rows, recent transactions, current plan, and pending plan fields.
- [ ] Update usage/dashboard UI to show wallet balance and pending downgrade instead of old daily/monthly caps.
- [ ] Run API/web checks.

### Task 7: Local demo and PR

**Files:**
- No production files expected.

- [ ] Run full verification (`npm run check:api`, targeted tests, and web checks if touched).
- [ ] Start real local dev with local DB, API, and web app.
- [ ] Open forwarded URL, record a short video showing wallet balance/transactions and managed usage blocking or wallet display working.
- [ ] Upload video, push branch, and create GitHub PR with the video link.

