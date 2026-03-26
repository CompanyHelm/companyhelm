# Tasks Management Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add minimal task management to `companyhelm-ng`, including persisted tasks and task categories, a `/tasks` kanban route, and a `/settings` category-management route.

**Architecture:** Add normalized task tables to the API schema, expose a small GraphQL surface for listing and mutating tasks/categories, and build Relay-backed pages in `apps/web` that use shadcn components for the board, dialogs, and settings UI. Keep scope intentionally narrow: no task runs, no assignment, no execution, no subscriptions, and no REST task API.

**Tech Stack:** Drizzle ORM, Mercurius GraphQL, React, Relay, TanStack Router, shadcn/ui

---

### Task 1: Add minimal task persistence and migrations

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/drizzle/meta/_journal.json`
- Create: `apps/api/drizzle/0029_*.sql`
- Create: `apps/api/drizzle/meta/0029_snapshot.json`

### Task 2: Add GraphQL task queries and mutations

**Files:**
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Modify: `apps/api/src/graphql/graphql_application.ts`
- Create: `apps/api/src/graphql/resolvers/tasks.ts`
- Create: `apps/api/src/graphql/resolvers/task_categories.ts`
- Create: `apps/api/src/graphql/mutations/create_task.ts`
- Create: `apps/api/src/graphql/mutations/create_task_category.ts`
- Create: `apps/api/src/graphql/mutations/set_task_category.ts`

### Task 3: Add focused API tests for the new task slice

**Files:**
- Create: `apps/api/tests/tasks_query.test.ts`
- Create: `apps/api/tests/task_categories_query.test.ts`
- Create: `apps/api/tests/create_task_mutation.test.ts`
- Create: `apps/api/tests/create_task_category_mutation.test.ts`
- Create: `apps/api/tests/set_task_category_mutation.test.ts`

### Task 4: Add the Relay-backed tasks route

**Files:**
- Modify: `apps/web/src/routes.ts`
- Modify: `apps/web/src/components/layout/application_sidebar.tsx`
- Modify: `apps/web/src/components/layout/application_header.tsx`
- Create: `apps/web/src/pages/tasks/tasks_page.tsx`
- Create: `apps/web/src/pages/tasks/task_board.tsx`
- Create: `apps/web/src/pages/tasks/create_task_dialog.tsx`
- Create: `apps/web/src/pages/tasks/__generated__/*.graphql.ts`

### Task 5: Add the settings route and task-category management UI

**Files:**
- Modify: `apps/web/src/routes.ts`
- Modify: `apps/web/src/components/layout/application_sidebar.tsx`
- Modify: `apps/web/src/components/layout/application_header.tsx`
- Create: `apps/web/src/pages/settings/settings_page.tsx`
- Create: `apps/web/src/pages/settings/__generated__/*.graphql.ts`

### Task 6: Regenerate artifacts and verify

**Files:**
- Modify: generated Drizzle and Relay artifacts as produced by tooling

**Checks:**
- `npm run db:generate`
- `npm run relay -w @companyhelm/web`
- `npm test -w @companyhelm/api`
- `npm run build -w @companyhelm/web`
