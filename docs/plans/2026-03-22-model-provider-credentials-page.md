# Model Provider Credentials Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a credentials management page where authenticated users can view and create company-scoped model provider credentials.

**Architecture:** Reuse the existing authenticated GraphQL transport and credential-creation mutation, add a new query that lists credentials for the authenticated company, and build a new page under the existing page-container route. The page uses local shadcn-style UI primitives for dialog, table, and form controls so the feature stays consistent with the requested component style without disturbing unrelated package work.

**Tech Stack:** Fastify, Mercurius GraphQL, Drizzle, Clerk React, TanStack Router, Tailwind, local shadcn-style UI components.

---

### Task 1: Add GraphQL read support for credentials

**Files:**
- Create: `apps/api/src/graphql/resolvers/model_provider_credentials.ts`
- Create: `apps/api/src/graphql/schema/types/model_provider_credentials_result.graphql`
- Modify: `apps/api/src/graphql/graphql_application.ts`
- Modify: `apps/api/src/graphql/schema/query.graphql`
- Test: `apps/api/tests/model_provider_credentials_query.test.ts`

**Steps:**
1. Add a resolver that requires `context.authSession.company.id` and selects company credentials from `model_provider_credentials`.
2. Expose the query in the GraphQL schema and application resolver map.
3. Write a focused test proving the query only returns credentials for the authenticated company.

### Task 2: Tighten the existing credential create path for the page

**Files:**
- Modify: `apps/api/src/graphql/mutations/add_model_provider_credential.ts`
- Modify: `apps/api/src/graphql/schema/inputs/add_model_provider_credential_input.graphql`
- Test: `apps/api/tests/add_model_provider_credential_mutation.test.ts`

**Steps:**
1. Limit the mutation path to the currently supported API-key workflow.
2. Keep the output compatible with the page table and form flow.
3. Add or update tests for the accepted provider/type combination and required API key.

### Task 3: Add shared web API helpers and shadcn-style primitives

**Files:**
- Modify: `apps/web/src/config.ts`
- Create: `apps/web/src/lib/graphql_client.ts`
- Create: `apps/web/src/components/ui/dialog.tsx`
- Create: `apps/web/src/components/ui/table.tsx`

**Steps:**
1. Add a typed Vite config value for the GraphQL endpoint.
2. Create a minimal authenticated GraphQL request helper that accepts a Clerk token getter.
3. Add local shadcn-style dialog and table primitives used by the credentials page.

### Task 4: Add the credentials page and route

**Files:**
- Create: `apps/web/src/pages/model-provider-credentials/model_provider_credentials_page.tsx`
- Create: `apps/web/src/pages/model-provider-credentials/route.tsx`
- Create: `apps/web/src/pages/model-provider-credentials/credentials_table.tsx`
- Create: `apps/web/src/pages/model-provider-credentials/create_credential_dialog.tsx`
- Modify: `apps/web/src/routes.ts`
- Modify: `apps/web/src/components/layout/application_sidebar.tsx`
- Modify: `apps/web/src/components/layout/application_header.tsx`

**Steps:**
1. Add a route under the authenticated page-container tree.
2. Add a sidebar navigation item for the new page.
3. Build the page with a table of existing credentials and a `Create credentials` button.
4. Add a modal that lets the user choose `OpenAI / Codex` and enter an API key, then submit the mutation and refresh the table.

### Task 5: Verify and commit

**Files:**
- Modify: `docs/plans/2026-03-22-model-provider-credentials-page.md`

**Steps:**
1. Run `npm test` in `apps/api`.
2. Run `npm run build` in `apps/web`.
3. Stage only the files for this feature plus the plan file.
4. Commit with a message matching the feature scope.
