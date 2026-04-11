# GitHub Skills Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add end-to-end support for GitHub-backed skills in `companyhelm-ng`, including importing a skill from a linked GitHub repository and making attached skills available to the PI Mono runtime.

**Architecture:** Keep manual skill creation intact and add a separate GitHub-backed import path. The recommended scope combines transcript task 09 (GitHub-backed skill import) with task 02 (runtime provisioning), because import alone would create catalog entries that still never reach agent sessions. The backend should treat GitHub import as a snapshot ingest: fetch `SKILL.md` and the directory inventory from GitHub once, persist those fields on the skill record, then provision attached skill records into PI Mono resources at session bootstrap.

**Tech Stack:** TypeScript, GraphQL/Mercurius, Drizzle-backed services, React/Relay web UI, PI Mono runtime integration.

---

### Task 1: Lock scope and GraphQL shape

**Files:**
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Modify: `apps/api/src/graphql/graphql_application.ts`
- Create: `apps/api/src/graphql/mutations/import_github_skill.ts`
- Create: `apps/api/src/graphql/resolvers/github_skill_directories.ts`

**Step 1: Add dedicated GitHub import schema**

Add a new `ImportGithubSkill` mutation instead of overloading `CreateSkill`. The input should include:
- `name`
- `description`
- `skillGroupId`
- `repositoryId`
- `skillDirectory`

Add a query for the web dialog to discover candidate skill directories inside a cached repository. Keep this query narrow to the skills use case rather than exposing arbitrary repository browsing.

**Step 2: Register the new resolver and mutation**

Wire both into `GraphqlApplication` so the web app can query repository skill directories and submit the import.

**Step 3: Preserve manual flow**

Do not change the meaning of `CreateSkillInput` or `UpdateSkillInput` in a way that risks the existing manual CRUD path.

**Step 4: Verify schema compiles**

Run: `npm run check -w @companyhelm/api`

Expected: GraphQL schema changes compile with no TypeScript or lint errors.

### Task 2: Extend the GitHub client for skill discovery and file loading

**Files:**
- Modify: `apps/api/src/github/client.ts`
- Modify: `apps/api/tests/github_client.test.ts`

**Step 1: Add installation-scoped repository reading helpers**

Extend `GithubClient` with methods that can:
- resolve the installation access token for a cached repository
- list the files under a repository directory
- read file contents for a specific path

Prefer using the GitHub contents/tree APIs via the existing installation token machinery instead of adding a second GitHub client abstraction.

**Step 2: Add skill-directory discovery**

Implement a helper that finds directories containing `SKILL.md` for a given repository. Keep the first version opinionated:
- use the repository default branch
- scan the repository tree once
- return normalized directory paths and `SKILL.md` presence

**Step 3: Add content loading helpers**

Implement a helper that fetches the selected directory’s `SKILL.md` plus a normalized `fileList` for the tracked files under that directory.

**Step 4: Test the GitHub client additions**

Add tests for:
- directory discovery
- file inventory loading
- `SKILL.md` content fetch
- installation ownership/validation failures

Run: `npm exec -w @companyhelm/api -- vitest run tests/github_client.test.ts`

Expected: the new GitHub client behaviors are covered without hitting the real network.

### Task 3: Add backend skill import service behavior

**Files:**
- Modify: `apps/api/src/services/skills/service.ts`
- Modify: `apps/api/src/graphql/mutations/create_skill.ts` (only if needed to share validation)
- Create: `apps/api/src/graphql/mutations/import_github_skill.ts`
- Modify: `apps/api/tests/skill_service.test.ts`
- Modify: `apps/api/tests/skills_graphql.test.ts`

**Step 1: Add a dedicated service entrypoint**

Add a new `importGithubSkill(...)` path in `SkillService` that:
- validates the company-owned repository selection
- validates the optional group assignment
- loads the GitHub directory snapshot
- persists `repository`, `skillDirectory`, `fileList`, and imported `instructions`

Keep `createSkill(...)` as the manual-only path.

**Step 2: Decide how name and description are sourced**

Recommended MVP:
- user provides `name`
- user provides `description`
- backend imports `instructions` from `SKILL.md`

This is safer than trying to infer display metadata from arbitrary `SKILL.md` formats.

**Step 3: Implement the mutation**

`ImportGithubSkill` should call the new service method and return the same `Skill` payload shape already used by the list/detail pages.

**Step 4: Test both create paths**

Add GraphQL tests that prove:
- manual `CreateSkill` still works unchanged
- `ImportGithubSkill` creates a skill with populated `repository`, `skillDirectory`, `fileList`, and imported `instructions`
- invalid repository selections are rejected

Run: `npm exec -w @companyhelm/api -- vitest run tests/skill_service.test.ts tests/skills_graphql.test.ts`

Expected: both manual and GitHub-backed creation paths pass.

### Task 4: Replace the mocked GitHub create-skill UI

**Files:**
- Modify: `apps/web/src/pages/skills/create_skill_dialog.tsx`
- Modify: `apps/web/src/pages/skills/skills_page.tsx`
- Update generated Relay artifacts under `apps/web/src/pages/skills/__generated__/`

**Step 1: Query the available repositories**

Use the existing `GithubRepositories` query to populate the repository selector in the GitHub mode of `CreateSkillDialog`.

**Step 2: Query discoverable skill directories**

When the user chooses a repository, load the new skill-directory discovery query and populate a second selector for the available `SKILL.md` directories.

**Step 3: Reuse the existing skill form fields**

Do not build an entirely separate form. GitHub mode should still capture:
- name
- description
- group
- repository
- skill directory

Then submit the new `ImportGithubSkill` mutation.

**Step 4: Keep error handling and store updates consistent**

Update the Relay store in the same way the manual create path already prepends a new skill into the `Skills` list.

**Step 5: Verify the web app**

Run:
- `npm run check -w @companyhelm/web`
- `npm run build -w @companyhelm/web`

Expected: the dialog compiles, Relay artifacts are current, and the skills page builds cleanly.

### Task 5: Provision attached skills into PI Mono runtime resources

**Files:**
- Modify: `apps/api/src/services/agent/session/pi-mono/bootstrap_context.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/session_manager_service.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/companyhelm_resource_loader.ts`
- Modify: `apps/api/src/services/skills/service.ts`
- Modify: `apps/api/tests/companyhelm_resource_loader.test.ts`
- Modify: `apps/api/tests/agent_skill_defaults_service.test.ts`

**Step 1: Resolve effective agent skills**

Add a service method that returns the effective skill set for an agent, combining:
- directly attached skills
- skills pulled in through attached skill groups

Deduplicate by skill id and preserve a stable order.

**Step 2: Carry resolved skills into bootstrap**

Extend `AgentSessionBootstrapContext` to carry the resolved skill records so session assembly does not have to re-query later.

**Step 3: Build PI skill resources from stored skill records**

Update `CompanyHelmResourceLoader` so `getSkills()` returns in-memory PI skill resources generated from persisted skill records rather than an always-empty list.

Recommended mapping:
- skill path derived from `skillDirectory` when present, otherwise a stable synthetic path
- skill content derived from stored `instructions`
- diagnostics stay empty unless a skill record is malformed

**Step 4: Keep prompt overrides separate**

Do not mix company or agent prompt overrides into the skill resource list. Preserve the current append-system-prompt layering.

**Step 5: Verify runtime resource provisioning**

Run: `npm exec -w @companyhelm/api -- vitest run tests/companyhelm_resource_loader.test.ts tests/agent_skill_defaults_service.test.ts`

Expected: attached skills now appear in runtime resources and the loader no longer treats empty skills as the only valid state.

### Task 6: Final regression pass and commit

**Files:**
- Review all touched files above

**Step 1: Run full focused checks**

Run:
- `npm run check -w @companyhelm/api`
- `npm run check -w @companyhelm/web`
- `npm exec -w @companyhelm/api -- vitest run tests/github_client.test.ts tests/skill_service.test.ts tests/skills_graphql.test.ts tests/companyhelm_resource_loader.test.ts tests/agent_skill_defaults_service.test.ts`

Expected: all targeted API and web checks pass.

**Step 2: Run broader repo checks if the focused pass is clean**

Run:
- `npm run check:api`
- `npm run check:web`

**Step 3: Inspect the diff**

Confirm the implementation is limited to:
- GitHub-backed skill import
- GitHub skill directory discovery
- runtime skill provisioning
- related tests and Relay artifacts

**Step 4: Commit**

```bash
git add apps/api/src/github/client.ts \
  apps/api/src/graphql/graphql_application.ts \
  apps/api/src/graphql/schema/schema.graphql \
  apps/api/src/graphql/mutations/import_github_skill.ts \
  apps/api/src/graphql/resolvers/github_skill_directories.ts \
  apps/api/src/services/skills/service.ts \
  apps/api/src/services/agent/session/pi-mono/bootstrap_context.ts \
  apps/api/src/services/agent/session/pi-mono/companyhelm_resource_loader.ts \
  apps/api/src/services/agent/session/pi-mono/session_manager_service.ts \
  apps/api/tests/github_client.test.ts \
  apps/api/tests/skill_service.test.ts \
  apps/api/tests/skills_graphql.test.ts \
  apps/api/tests/companyhelm_resource_loader.test.ts \
  apps/api/tests/agent_skill_defaults_service.test.ts \
  apps/web/src/pages/skills/create_skill_dialog.tsx \
  apps/web/src/pages/skills/skills_page.tsx \
  apps/web/src/pages/skills/__generated__/* \
  docs/plans/2026-04-10-github-skills-implementation.md
git commit -m "Add GitHub-backed skill import and runtime provisioning"
```

## Recommendation

Implement the recommended end-to-end scope in this order:
1. GitHub client + import mutation
2. Web create-skill dialog wiring
3. Runtime provisioning of attached skills

Doing only the UI/import half would leave imported GitHub skills stored in the catalog but still unavailable to actual agent sessions.
