# Agents Page And Server Version Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `/agents` management page with Relay-backed listing and creation, and expose the API package version through `Me.serverVersion` for display in the sidebar.

**Architecture:** Reuse the existing authenticated GraphQL + Relay pattern used by model-provider credentials. Add agent list and creation operations in the API, add a small query for agent creation options derived from credential-backed models, and render the new UI route plus a sidebar footer version label using the `Me` query as the single source of truth.

**Tech Stack:** Fastify, Mercurius, Drizzle ORM, Inversify, Relay, TanStack Router, React.

---

### Task 1: Extend the API schema for agents and server version

**Files:**
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Modify: `apps/api/src/graphql/resolvers/me.ts`
- Modify: `apps/api/tests/me_query.test.ts`

**Step 1:** Add `serverVersion` to the `Me` GraphQL type.

**Step 2:** Resolve the API package version in `MeQueryResolver` and return it with the authenticated user/company payload.

**Step 3:** Extend the Me query test to assert `serverVersion` is present.

### Task 2: Add GraphQL read/write support for agents

**Files:**
- Create: `apps/api/src/graphql/resolvers/agents.ts`
- Create: `apps/api/src/graphql/resolvers/agent_create_options.ts`
- Create: `apps/api/src/graphql/mutations/add_agent.ts`
- Modify: `apps/api/src/graphql/graphql_application.ts`
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/tests/agents_query.test.ts`
- Create: `apps/api/tests/agent_create_options_query.test.ts`
- Create: `apps/api/tests/add_agent_mutation.test.ts`

**Step 1:** Add GraphQL types and inputs for `Agent`, `AgentCreateOption`, `Agents`, `AgentCreateOptions`, and `AddAgent`.

**Step 2:** Implement the list resolver for company-scoped agents.

**Step 3:** Implement the create-options resolver by joining provider credentials to provider models and returning grouped provider/model metadata, including reasoning levels.

**Step 4:** Implement the create mutation that writes `agents` records with the selected model, optional reasoning level, and optional system prompt.

**Step 5:** Wire the new resolvers/mutation into `GraphqlApplication`.

**Step 6:** Add focused API tests for list, options, and create behavior.

### Task 3: Add the `/agents` UI

**Files:**
- Create: `apps/web/src/pages/agents/agents_page.tsx`
- Create: `apps/web/src/pages/agents/create_agent_dialog.tsx`
- Create: `apps/web/src/pages/agents/agents_table.tsx`
- Modify: `apps/web/src/routes.ts`
- Modify: `apps/web/src/components/layout/application_sidebar.tsx`

**Step 1:** Add the `/agents` route under the authenticated page container tree.

**Step 2:** Build a Relay query for agents + create options and a Relay mutation for agent creation.

**Step 3:** Add a table matching the credentials page shape.

**Step 4:** Add a create dialog with required `name`, provider dropdown, model dropdown, conditional reasoning-level dropdown, and system prompt textarea.

**Step 5:** Update the sidebar navigation to include `Agents`.

### Task 4: Show the server version in the sidebar

**Files:**
- Modify: `apps/web/src/components/layout/application_sidebar.tsx`

**Step 1:** Add a Relay query for `Me.serverVersion`.

**Step 2:** Render the version in the bottom-right portion of the sidebar footer without disturbing the existing user controls.

### Task 5: Verify and commit

**Files:**
- Verify: `apps/api/tests/*.test.ts`
- Verify: `apps/web/src/**`

**Step 1:** Run focused API tests for Me, agents, and agent-create options.

**Step 2:** Run API lint.

**Step 3:** Run web build.

**Step 4:** Stage only the files for this feature and commit with a feature-scoped message.
