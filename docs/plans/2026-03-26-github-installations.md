# GitHub Installations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Port GitHub App installation linking and repository visualization from `companyhelm-api` and `companyhelm-web` into `companyhelm-ng/apps/api` and `companyhelm-ng/apps/web`.

**Architecture:** Add company-scoped GitHub installation and repository persistence to the API schema, expose them through dedicated GraphQL resolvers and mutations backed by a GitHub App client, and build a shadcn-based repositories page in the web app that can both launch the GitHub install flow and complete the callback link using query params. The API remains the only place that reads the GitHub App PEM and client settings from YAML/env; the web app only consumes safe app-link data through GraphQL.

**Tech Stack:** TypeScript, Drizzle ORM, Postgres RLS, Fastify, Mercurius GraphQL, Inversify, React, TanStack Router, Relay, shadcn/ui, Vite.

---

### Task 1: Add GitHub installation persistence

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle/0029_github_installations.sql`
- Modify: `apps/api/drizzle/meta/_journal.json`

**Step 1: Add the new schema definitions**

Add `companyGithubInstallations` and `githubRepositories` to `apps/api/src/db/schema.ts` with:
- `companyGithubInstallations.installationId` as `bigint(..., { mode: "number" })` primary key
- company foreign keys with `cascade`
- repository fields for external id, names, URL, privacy, default branch, archived, timestamps
- indexes on `companyId` and a uniqueness guard on `(companyId, installationId, externalId)` for repositories

**Step 2: Add the migration**

Create `apps/api/drizzle/0029_github_installations.sql` that:
- creates both tables
- adds the repository uniqueness constraint/index
- enables row-level security on both tables
- adds `current_setting('app.current_company_id', true)::uuid` policies
- grants table/sequence access to the runtime role consistently with earlier migrations

**Step 3: Register the migration**

Append the new migration entry to `apps/api/drizzle/meta/_journal.json`.

### Task 2: Add the API GitHub client and GraphQL contract

**Files:**
- Create: `apps/api/src/github/client.ts`
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Create: `apps/api/src/graphql/resolvers/github_app_config.ts`
- Create: `apps/api/src/graphql/resolvers/github_installations.ts`
- Create: `apps/api/src/graphql/resolvers/github_repositories.ts`
- Create: `apps/api/src/graphql/mutations/add_github_installation.ts`
- Create: `apps/api/src/graphql/mutations/delete_github_installation.ts`
- Create: `apps/api/src/graphql/mutations/refresh_github_installation_repositories.ts`
- Modify: `apps/api/src/graphql/graphql_application.ts`

**Step 1: Add the GitHub client**

Port the minimal subset from `companyhelm-api/src/client/github.ts`:
- PEM normalization
- GitHub App JWT generation
- installation access token caching
- installation repository listing
- installation id validation

Keep the file class-based and only include behavior needed for installation setup and repository refresh.

**Step 2: Extend the schema**

Add GraphQL types and inputs for:
- `GithubAppConfig`
- `GithubInstallation`
- `GithubRepository`
- `AddGithubInstallationInput`
- `DeleteGithubInstallationInput`
- `RefreshGithubInstallationRepositoriesInput`

Add queries:
- `GithubAppConfig`
- `GithubInstallations`
- `GithubRepositories(installationId: ID)`

Add mutations:
- `AddGithubInstallation`
- `DeleteGithubInstallation`
- `RefreshGithubInstallationRepositories`

**Step 3: Implement resolvers and mutations**

Use the authenticated company from `GraphqlRequestContext`, not client-supplied company ids.

Behavior:
- app config query returns safe app metadata only
- installations query lists company-linked installations ordered by id
- repositories query lists cached repositories, optionally filtered by installation
- add mutation links an installation, rejects cross-company conflicts, and seeds cached repos
- refresh mutation re-fetches and replaces cached repos for one installation
- delete mutation removes the installation record and cascades repository deletion

**Step 4: Wire GraphQL application**

Register the new resolver and mutation classes in `apps/api/src/graphql/graphql_application.ts` without breaking existing constructor-based tests.

### Task 3: Add API coverage

**Files:**
- Create: `apps/api/tests/github_client.test.ts`
- Create: `apps/api/tests/github_installations_graphql.test.ts`

**Step 1: Add focused GitHub client tests**

Cover:
- installation id validation
- callback query parsing
- JWT payload shape

**Step 2: Add GraphQL flow tests**

Cover:
- app config query returns values from config
- add mutation stores installation + repo rows in authenticated company scope
- add mutation rejects cross-company conflicts
- refresh mutation replaces repository cache
- delete mutation removes installation record

### Task 4: Build the repositories page in the web app

**Files:**
- Create: `apps/web/src/pages/repositories/repositories_page.tsx`
- Create: `apps/web/src/pages/repositories/__generated__/...` via Relay compiler
- Modify: `apps/web/src/routes.ts`
- Modify: `apps/web/src/components/layout/application_sidebar.tsx`
- Modify: `apps/web/src/components/layout/application_header.tsx`

**Step 1: Add the route**

Create `/repositories` in TanStack Router and include it in the main application shell navigation.

**Step 2: Build the page**

Use shadcn primitives already in the repo:
- `Card`
- `Button`
- `Input`
- `Table`
- `Badge`
- `AlertDialog`

UI requirements:
- install button that opens the GitHub App install URL from the API query
- manual installation ID form to link an installation without the callback
- callback handler that reads `installation_id`, `setup_action`, and `state` from the URL and auto-links once per visit
- installations list with refresh/delete actions
- repositories table grouped by installation or annotated with installation id/account

**Step 3: Keep page behavior local**

Do not add PEM or app secrets to the web config. Use API data for the GitHub App link and local route search params for callback completion.

### Task 5: Verify and commit

**Files:**
- Verify in place

**Step 1: Run targeted API tests**

Run:
- `npm run test -w @companyhelm/api -- github_client.test.ts`
- `npm run test -w @companyhelm/api -- github_installations_graphql.test.ts`

**Step 2: Run broader checks for touched apps**

Run:
- `npm run test -w @companyhelm/api`
- `npm run build -w @companyhelm/web`

**Step 3: Commit validated changes**

Commit on branch `codex/port-github-installations-to-ng` with a message describing the GitHub installation flow port.
