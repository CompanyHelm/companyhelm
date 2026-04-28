# Platform Model Routes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add stable platform models that users select while platform admins map each exposed model to one or more concrete credential models, with hardcoded round-robin route selection.

**Architecture:** `platform_models` becomes the user-facing catalog and `platform_model_routes` maps each catalog row to provider-discovered `platform_model_provider_credential_models`. Agents and sessions store `platform_model_id`; runtime resolves a healthy route at execution time and records the concrete credential model used on each turn.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL migrations, GraphQL resolvers/mutations, Vitest.

---

### Task 1: Schema and Migration

**Files:**
- Modify: `apps/api/src/db/schema/platform_ai.ts`
- Modify: `apps/api/src/db/schema/agents.ts`
- Modify: `apps/api/src/db/schema/sessions.ts`
- Create: `apps/api/drizzle/0139_platform_model_routes.sql`
- Create: `apps/api/drizzle/meta/0139_snapshot.json`
- Modify: `apps/api/drizzle/meta/_journal.json`

**Steps:**
1. Add `platform_models` and `platform_model_routes`.
2. Change agent/session platform FKs from concrete credential models to platform models.
3. Add nullable turn audit columns for selected platform model and concrete route.
4. Migrate existing platform credential models into one platform model per distinct model identity and route existing rows to it.
5. Repoint existing agent/session platform selections through routes.

### Task 2: Model Selection Runtime

**Files:**
- Modify: `apps/api/src/services/agent/session/session_model_selection_service.ts`
- Modify: `apps/api/src/services/agent/session/process/execution.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/session_event_handler.ts`
- Modify: related session service type files.

**Steps:**
1. Resolve platform selections by `platform_model_id`.
2. Add hardcoded round-robin route selection across enabled, available credential models with active credentials.
3. Pass the concrete route into runtime execution and usage attribution.
4. Persist turn audit fields for platform calls.

### Task 3: GraphQL Surface

**Files:**
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Modify: agent/session mutations and resolvers that expose platform model IDs.
- Modify: platform admin resolvers/mutations for platform model route management.

**Steps:**
1. Expose user-facing platform model IDs in `AgentCreateOptions`.
2. Keep concrete route records admin-only.
3. Update add/update agent and create/prompt session inputs to accept `platformModelId`.

### Task 4: Admin Web UI

**Files:**
- Modify: `apps/web/src/routes.ts`
- Modify: admin navigation/dashboard files as needed.
- Create: `apps/web/src/pages/admin/models_page.tsx`

**Steps:**
1. Add a separate `/admin/models` page for exposed platform models.
2. Let admins see which concrete credential models route each platform model.
3. Keep credential refresh/catalog management on existing credential pages.

### Task 5: Tests and Validation

**Files:**
- Modify: `apps/api/tests/agent_create_options_query.test.ts`
- Modify: `apps/api/tests/add_agent_mutation.test.ts`
- Modify: `apps/api/tests/update_agent_mutation.test.ts`
- Modify: session mutation tests as needed.

**Steps:**
1. Update tests to assert platform model IDs are stable and concrete route IDs are hidden from company-facing options.
2. Add coverage for round-robin route resolution.
3. Run API check and focused tests.
