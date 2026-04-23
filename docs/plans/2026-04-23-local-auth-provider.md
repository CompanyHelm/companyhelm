# Local Auth Provider Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a real `local` auth provider that replaces Clerk with credential-backed sign-up/sign-in flows when configured, while keeping Clerk behavior unchanged when `auth.provider` remains `clerk`.

**Architecture:** Introduce provider-neutral auth contracts in the API and web app, then implement a `local` provider behind those contracts. The API will own salted password hashing, bearer-session token issuance, and company slug resolution; the web app will use a runtime-selected auth adapter so org routing and Relay keep working under both providers.

**Tech Stack:** TypeScript, Fastify, Drizzle ORM, jose, React, TanStack Router, Relay

---

### Task 1: Expand auth configuration and provider-neutral API contracts

**Files:**
- Modify: `apps/api/src/config/schema.ts`
- Modify: `apps/api/src/api_container.ts`
- Modify: `apps/api/src/auth/auth_provider.ts`
- Create: `apps/api/src/auth/organization_slug_resolver.ts`
- Modify: `apps/api/src/auth/clerk/organization_slug_resolver.ts`
- Modify: `apps/api/config/local.yaml`
- Modify: `apps/api/.env.example`

**Steps:**
1. Extend API config to accept `auth.provider = "local"` with the local provider settings needed for signing and hashing.
2. Generalize auth provider types so authenticated users can report either `clerk` or `local`.
3. Replace Clerk-only organization slug resolution with a provider-neutral resolver contract.
4. Bind the correct auth provider and slug resolver in the DI container based on config.

### Task 2: Add database support for local credentials and sessions

**Files:**
- Modify: `apps/api/src/db/schema/company.ts`
- Modify: `apps/api/src/db/schema/index.ts`
- Create: `apps/api/drizzle/0125_*.sql`
- Modify: `apps/api/drizzle/meta/_journal.json`

**Steps:**
1. Add company slug storage so local auth can build stable org-scoped URLs.
2. Add a credential table for salted password hashes and a session table for revocable local bearer sessions.
3. Keep the schema compatible with existing Clerk-backed users and companies so provider switching is config-driven, not a forked data model.

### Task 3: Implement local provider services in the API

**Files:**
- Create: `apps/api/src/auth/local/local_auth_provider.ts`
- Create: `apps/api/src/auth/local/local_auth_password_service.ts`
- Create: `apps/api/src/auth/local/local_auth_session_service.ts`
- Create: `apps/api/src/auth/local/local_auth_service.ts`
- Create: `apps/api/src/auth/local/local_organization_slug_resolver.ts`
- Modify: `apps/api/src/services/bootstrap/user.ts`
- Modify: `apps/api/src/services/bootstrap/company.ts`
- Modify: `apps/api/src/server/api_server.ts`

**Steps:**
1. Implement password hashing and verification using platform crypto.
2. Implement local bearer-session token signing and validation.
3. Implement sign-up and sign-in service logic that provisions the user, company, membership, defaults, and session in one flow.
4. Register Fastify routes for local sign-up, sign-in, and sign-out only when the provider is `local`.

### Task 4: Refactor the web app to a runtime-selected auth adapter

**Files:**
- Create: `apps/web/src/auth/auth_provider.tsx`
- Create: `apps/web/src/auth/clerk/clerk_auth_provider.tsx`
- Create: `apps/web/src/auth/local/local_auth_provider.tsx`
- Create: `apps/web/src/auth/local/local_auth_client.ts`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/config.ts`
- Modify: `apps/web/src/components/runtime_configuration_error.tsx`
- Modify: `apps/web/src/components/relay_environment_provider.tsx`
- Modify: `apps/web/src/components/layout/application_sidebar.tsx`
- Modify: `apps/web/src/lib/use_current_organization_slug.ts`
- Modify: `apps/web/src/pages/auth/page.tsx`
- Modify: `apps/web/src/pages/auth/route.tsx`
- Modify: `apps/web/src/pages/root/authenticated_route.tsx`
- Modify: `apps/web/src/pages/root/organization_home_route.tsx`
- Modify: `apps/web/src/pages/root/organization_route.tsx`
- Modify: `apps/web/src/pages/dashboard/dashboard_page.tsx`
- Modify: `docker/web/docker-entrypoint.sh`

**Steps:**
1. Introduce a shared CompanyHelm auth context exposing the app-level primitives currently taken from Clerk.
2. Implement the Clerk-backed adapter by delegating to `@clerk/react`.
3. Implement the local adapter using local storage plus the new API sign-in/sign-up endpoints.
4. Keep existing org-scoped navigation intact by exposing organization and membership data from both adapters.
5. Show the new local sign-in/sign-up forms only when runtime config says `provider = "local"`.

### Task 5: Add tests, verify, and commit

**Files:**
- Modify/Add: `apps/api/tests/*`
- Modify/Add: `apps/web/tests/*`

**Steps:**
1. Add API tests for config parsing, local password/session flows, and local auth route behavior.
2. Add web tests for runtime config parsing and provider-specific auth rendering.
3. Run focused checks for API and web until they pass.
4. Commit the validated changes with a single intentional commit.
