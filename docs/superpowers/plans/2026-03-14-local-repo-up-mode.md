# Local Repo Up Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-service local repo startup options to `companyhelm up` and persist mixed-mode runtime state in YAML.

**Architecture:** Keep Docker and local-process concerns separate. Add a source resolver for the new CLI options, local service classes for API and frontend startup, and a local process manager that records per-service metadata in YAML runtime state for `down`, `status`, and `logs`.

**Tech Stack:** TypeScript, Commander, Vitest, YAML, Node child processes, Docker Compose

---

## Chunk 1: CLI options and YAML runtime state

### Task 1: Add failing CLI parsing tests for local repo options

**Files:**
- Modify: `tests/integration/up-command.test.ts`

- [ ] **Step 1: Write the failing tests**

Add coverage for:
- `companyhelm up --api-repo-path`
- `companyhelm up --api-repo-path ./custom-api`
- `companyhelm up --web-repo-path`
- `companyhelm up --web-repo-path ./custom-web`
- both options together

- [ ] **Step 2: Run the targeted test file and verify it fails**

Run: `npm test -- tests/integration/up-command.test.ts`
Expected: failures because the new options are not parsed or forwarded yet.

- [ ] **Step 3: Implement minimal CLI option parsing**

Update `src/commands/up.ts` and the `UpOptions` type so the parsed options flow into dependencies.

- [ ] **Step 4: Run the targeted test file and verify it passes**

Run: `npm test -- tests/integration/up-command.test.ts`
Expected: PASS

### Task 2: Add failing YAML runtime state tests

**Files:**
- Modify: `tests/unit/runtime-state-store.test.ts`
- Modify: `src/core/runtime/RuntimePaths.ts`
- Modify: `src/core/runtime/RuntimeState.ts`
- Modify: `src/core/runtime/RuntimeStateStore.ts`

- [ ] **Step 1: Write the failing tests**

Add coverage for:
- runtime state persisting to `state.yaml`
- YAML round-tripping current auth/port fields
- local-service metadata persistence for `api` and `frontend`

- [ ] **Step 2: Run the targeted test file and verify it fails**

Run: `npm test -- tests/unit/runtime-state-store.test.ts`
Expected: failures because state is still JSON-backed and lacks service metadata.

- [ ] **Step 3: Implement minimal YAML runtime state support**

Switch runtime state storage from JSON to YAML and extend the state shape for service metadata.

- [ ] **Step 4: Run the targeted test file and verify it passes**

Run: `npm test -- tests/unit/runtime-state-store.test.ts`
Expected: PASS

## Chunk 2: Local repo source resolution and service lifecycle

### Task 3: Add failing tests for source resolution and mixed-mode lifecycle

**Files:**
- Create: `tests/unit/local-repo-source-resolver.test.ts`
- Modify: `tests/unit/dependencies.test.ts`

- [ ] **Step 1: Write the failing tests**

Cover:
- sibling-default repo path resolution
- explicit repo path resolution
- mixed-mode startup invoking local API or frontend startup only when selected
- `logs`, `status`, and `down` using runtime state metadata for local services

- [ ] **Step 2: Run the targeted test files and verify they fail**

Run: `npm test -- tests/unit/local-repo-source-resolver.test.ts tests/unit/dependencies.test.ts`
Expected: failures because the resolver and local lifecycle support do not exist yet.

- [ ] **Step 3: Implement minimal source resolution and lifecycle orchestration**

Add focused classes under `src/core/local` and wire them into `src/commands/dependencies.ts`.

- [ ] **Step 4: Run the targeted test files and verify they pass**

Run: `npm test -- tests/unit/local-repo-source-resolver.test.ts tests/unit/dependencies.test.ts`
Expected: PASS

## Chunk 3: Command integration and verification

### Task 4: Add failing integration coverage for mixed-mode `up`

**Files:**
- Modify: `tests/integration/up-command.test.ts`

- [ ] **Step 1: Extend tests for forwarding the parsed repo-path options through the command layer**

- [ ] **Step 2: Run the targeted test file and verify it fails if forwarding is incomplete**

Run: `npm test -- tests/integration/up-command.test.ts`
Expected: FAIL if command forwarding still has gaps.

- [ ] **Step 3: Finish command integration**

Complete any missing forwarding or validation work in the command layer.

- [ ] **Step 4: Run the targeted test file and verify it passes**

Run: `npm test -- tests/integration/up-command.test.ts`
Expected: PASS

### Task 5: Verify the full repo test suite relevant to this change

**Files:**
- Review: `companyhelm-common/local-deployment/**`
- Review: `companyhelm-common/tests/**`

- [ ] **Step 1: Run the `companyhelm` test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Check `companyhelm-common` local-deployment and e2e helpers for required updates**

Run: `rg -n "companyhelm-api|companyhelm-web|local-deployment|start:api|start:frontend" /workspace/companyhelm-common`
Expected: review confirms whether helper updates are needed.

- [ ] **Step 3: If no helper updates are needed, document that result in the final summary**

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-03-14-local-repo-up-mode-design.md docs/superpowers/plans/2026-03-14-local-repo-up-mode.md src tests README.md
git commit -m "feat: support local repo services in up"
```
