# Platform Model Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let agents and sessions select either a platform-managed model or a company-provided model while exposing CompanyHelm as one virtual company-facing provider.

**Architecture:** Add a model credential source enum and nullable platform model FKs beside the existing company model FKs. GraphQL keeps company credential IDs for BYO selections but hides platform credential IDs behind a virtual CompanyHelm provider option.

**Tech Stack:** TypeScript, Drizzle ORM, GraphQL schema/resolvers, Vitest.

---

### Task 1: Schema

**Files:**
- Modify: `apps/api/src/db/schema/agents.ts`
- Modify: `apps/api/src/db/schema/sessions.ts`
- Modify: `apps/api/src/db/schema/platform_ai.ts`
- Create: `apps/api/drizzle/0137_platform_model_selection.sql`

**Steps:**
1. Add `model_credential_source` enum with `platform` and `user_provided`.
2. Add platform model selection columns to `agents` and `agent_sessions`.
3. Relax existing company model FKs to nullable where needed.
4. Add availability columns to platform model rows.

### Task 2: GraphQL Model Options

**Files:**
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Modify: `apps/api/src/graphql/resolvers/agent_create_options.ts`
- Test: `apps/api/tests/agent_create_options_query.test.ts`

**Steps:**
1. Add `modelCredentialSource` and platform model IDs to option types.
2. Aggregate active platform models into one virtual CompanyHelm provider.
3. Keep BYO provider options using company credential rows.

### Task 3: Agent and Session Selection

**Files:**
- Modify: `apps/api/src/graphql/mutations/add_agent.ts`
- Modify: `apps/api/src/graphql/mutations/update_agent.ts`
- Modify: `apps/api/src/services/agent/session/*`

**Steps:**
1. Accept platform or user-provided selections.
2. Store exactly one model FK based on source.
3. Resolve runtime credentials by joining through the selected model table.

### Task 4: Verification

**Commands:**
- `npm run check -w @companyhelm/api`
- Focused Vitest files covering agent options, add/update agent, and session creation.
