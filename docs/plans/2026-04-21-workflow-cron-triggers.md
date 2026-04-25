# Workflow Cron Triggers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add cron scheduling to workflow definitions so workflows can run automatically with a configured agent and launch input values.

**Architecture:** Workflow cron triggers live beside workflow definitions and use BullMQ job schedulers. Scheduled fires create normal workflow runs with `source = scheduled` and `trigger_id` set, so existing run detail and step tracking remain the execution surface.

**Tech Stack:** TypeScript, Drizzle, Mercurius GraphQL, BullMQ, Redis, React Relay, Tailwind/shadcn components.

---

### Task 1: Persistence

**Files:**
- Modify: `apps/api/src/db/schema/workflows.ts`
- Generate: `apps/api/drizzle/*`
- Test: `apps/api/tests/workflow_cron_trigger_migrations.test.ts`

Add workflow trigger, workflow cron trigger, and workflow trigger input value tables. Add `source` and `trigger_id` to workflow runs. Add RLS policies for new company-scoped trigger tables.

### Task 2: Backend Services

**Files:**
- Modify: `apps/api/src/services/workflows/types.ts`
- Modify: `apps/api/src/services/workflows/service.ts`
- Create: `apps/api/src/services/workflows/queue.ts`
- Create: `apps/api/src/services/workflows/queue_names.ts`
- Create: `apps/api/src/services/workflows/scheduler_sync.ts`
- Create: `apps/api/src/workers/workflow_triggers.ts`
- Modify: `apps/api/src/server/api_server.ts`
- Test: `apps/api/tests/workflow_scheduler_sync.test.ts`
- Test: `apps/api/tests/workflow_trigger_queue.test.ts`
- Test: `apps/api/tests/workflow_trigger_worker.test.ts`

Scheduled workflow runs load trigger configuration, validate the workflow and trigger state, skip if an existing run for the trigger is still running, and start a normal workflow run with the stored agent and input values.

### Task 3: GraphQL

**Files:**
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Modify: `apps/api/src/graphql/workflow_graphql_presenter.ts`
- Modify: `apps/api/src/graphql/registries/workflow_graphql_registry.ts`
- Create: `apps/api/src/graphql/mutations/create_workflow_cron_trigger.ts`
- Create: `apps/api/src/graphql/mutations/update_workflow_cron_trigger.ts`
- Create: `apps/api/src/graphql/mutations/delete_workflow_trigger.ts`

Expose workflow cron triggers on workflow records and add create, update, and delete mutations.

### Task 4: Web UI

**Files:**
- Modify: `apps/web/src/pages/workflows/workflow_types.ts`
- Create: `apps/web/src/pages/workflows/workflow_trigger_dialog.tsx`
- Modify: `apps/web/src/pages/workflows/workflow_detail_page.tsx`
- Generate: `apps/web/src/pages/workflows/__generated__/*`

Add a Schedules section to the workflow overview tab. Users can create, edit, enable, disable, and delete cron triggers with an assigned agent and workflow input values.

### Task 5: Verification and Commit

Run targeted API tests, Relay generation, and package checks. Commit the complete feature after validation.
