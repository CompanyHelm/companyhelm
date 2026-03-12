# CompanyHelm CLI Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `@companyhelm/cli` from a scaffold into a working local bootstrap CLI that can bring up the packaged CompanyHelm frontend, API, Postgres, and a host-managed local runner with truthful status/logging/teardown behavior.

**Architecture:** Keep the existing split between commands and service classes, but tighten the runtime contract. Docker remains responsible for `postgres`, `api`, and `frontend`; the CLI owns bootstrap artifacts, lifecycle orchestration, and a host-managed `runner`. Do not preserve current output or state-file compatibility if a cleaner design is easier.

**Tech Stack:** Node 24, TypeScript, `commander`, Docker Compose, packaged CompanyHelm images, `@companyhelm/runner`, `vitest`.

---

### Task 1: Lock down the runtime contract with failing orchestration tests

**Files:**
- Create: `tests/unit/command-dependencies.test.ts`
- Modify: `tests/integration/up-command.test.ts`
- Modify: `tests/integration/down-status-reset.test.ts`
- Modify: `src/commands/dependencies.ts`

**Step 1: Write the failing tests**

Add tests that define the expected top-level behavior:
- `up()` writes runtime artifacts, starts Docker, starts the host runner, and prints a usable summary.
- `down()` stops the host runner first, then Docker services.
- `reset()` removes runtime files after teardown.
- `status()` does not claim `runner` is healthy purely from Docker output.

Use injected fakes for the command runner, Docker manager, and filesystem-facing helpers so the tests stay deterministic.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/command-dependencies.test.ts tests/integration/up-command.test.ts tests/integration/down-status-reset.test.ts`
Expected: FAIL because `createDefaultDependencies()` currently hardcodes side effects and runner status is still derived from Docker-only state.

**Step 3: Refactor dependencies for testable orchestration**

Make `src/commands/dependencies.ts` accept explicit collaborators for:
- runtime paths/state store
- bootstrap writer
- Docker stack manager
- runner supervisor
- command runner / process launcher
- renderer/output sink

Keep the production factory simple, but separate orchestration from terminal IO enough that tests can assert behavior directly.

**Step 4: Run test to verify it passes**

Run: `npm run build`
Run: `npx vitest run tests/unit/command-dependencies.test.ts tests/integration/up-command.test.ts tests/integration/down-status-reset.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/commands/dependencies.ts tests/unit/command-dependencies.test.ts tests/integration/up-command.test.ts tests/integration/down-status-reset.test.ts
git commit -m "test: lock down cli orchestration contract"
```

### Task 2: Make the Docker stack actually bootstrappable

**Files:**
- Modify: `src/templates/docker-compose.yaml.tpl`
- Modify: `src/core/docker/ComposeTemplateRenderer.ts`
- Modify: `src/core/docker/DockerStackManager.ts`
- Modify: `src/core/runtime/RuntimePaths.ts`
- Modify: `tests/unit/compose-template-renderer.test.ts`
- Create: `tests/unit/docker-stack-manager.test.ts`

**Step 1: Write the failing tests**

Add tests that require the rendered compose file to include:
- Postgres initialization wiring for the generated `seed.sql`
- persistent state path or named volume for Postgres data
- the exact API/frontend environment variables required by the packaged images
- healthchecks / dependencies strong enough that the stack comes up in the right order
- only the intended host-exposed ports

Before writing the test expectations, inspect the actual packaged image contract from the CompanyHelm API/frontend repos or image docs and pin the env names explicitly in the test.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/compose-template-renderer.test.ts tests/unit/docker-stack-manager.test.ts`
Expected: FAIL because the current compose file only names images and ports and does not mount seed/bootstrap assets.

**Step 3: Implement the minimal compose/runtime wiring**

Update the compose template and renderer to support:
- bind or volume mounts for the generated seed/init SQL
- explicit container names or stable service names where needed for status/logs
- required env vars for API/frontend runtime configuration
- healthchecks and `depends_on` conditions that reflect real startup order

Update `DockerStackManager` to create any required directories before launch and to use the richer compose file during `up`, `down`, and `logs`.

**Step 4: Run test to verify it passes**

Run: `npm run build`
Run: `npx vitest run tests/unit/compose-template-renderer.test.ts tests/unit/docker-stack-manager.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/templates/docker-compose.yaml.tpl src/core/docker/ComposeTemplateRenderer.ts src/core/docker/DockerStackManager.ts src/core/runtime/RuntimePaths.ts tests/unit/compose-template-renderer.test.ts tests/unit/docker-stack-manager.test.ts
git commit -m "feat: wire packaged docker stack for bootstrap"
```

### Task 3: Apply bootstrap data and make the host runner lifecycle real

**Files:**
- Modify: `src/core/bootstrap/DeploymentBootstrapper.ts`
- Modify: `src/core/bootstrap/SeedSqlRenderer.ts`
- Modify: `src/core/runner/RunnerSupervisor.ts`
- Modify: `src/core/process/CommandRunner.ts`
- Modify: `src/core/runtime/RuntimePaths.ts`
- Modify: `src/core/runtime/RuntimeState.ts`
- Modify: `src/core/runtime/RuntimeStateStore.ts`
- Modify: `tests/unit/seed-sql-renderer.test.ts`
- Modify: `tests/unit/runner-supervisor.test.ts`
- Create: `tests/unit/runner-lifecycle.test.ts`

**Step 1: Write the failing tests**

Add tests that require:
- the generated seed SQL to match the real schema assumptions used by the packaged API
- runner config/log/pid files to be written to predictable paths
- `up()` to launch the runner in a way that keeps the CLI from hanging
- `down()` to stop the runner using persisted process metadata rather than hoping a one-shot command is enough

If the packaged runner CLI already provides daemonization/status semantics, write the tests around that contract; otherwise add a thin local supervisor layer and test that instead.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/seed-sql-renderer.test.ts tests/unit/runner-supervisor.test.ts tests/unit/runner-lifecycle.test.ts`
Expected: FAIL because the current code only builds start/stop args and never persists runner process state or log output.

**Step 3: Implement bootstrap and runner supervision**

Implement the smallest viable behavior that makes `companyhelm up` useful:
- generate every runtime artifact through `RuntimePaths`
- ensure bootstrap SQL is actually consumable by Postgres startup
- write runner config, pid, and log locations into runtime state or stable runtime files
- launch the runner detached or through the runner CLI’s supported background mode
- persist enough metadata to stop and inspect the runner later

**Step 4: Run test to verify it passes**

Run: `npm run build`
Run: `npx vitest run tests/unit/seed-sql-renderer.test.ts tests/unit/runner-supervisor.test.ts tests/unit/runner-lifecycle.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/bootstrap/DeploymentBootstrapper.ts src/core/bootstrap/SeedSqlRenderer.ts src/core/runner/RunnerSupervisor.ts src/core/process/CommandRunner.ts src/core/runtime/RuntimePaths.ts src/core/runtime/RuntimeState.ts src/core/runtime/RuntimeStateStore.ts tests/unit/seed-sql-renderer.test.ts tests/unit/runner-supervisor.test.ts tests/unit/runner-lifecycle.test.ts
git commit -m "feat: make bootstrap and runner lifecycle real"
```

### Task 4: Replace placeholder status/log output with truthful operational reporting

**Files:**
- Modify: `src/core/status/StatusService.ts`
- Modify: `src/core/logs/LogsService.ts`
- Modify: `src/core/ui/TerminalRenderer.ts`
- Modify: `src/commands/status.ts`
- Modify: `src/commands/logs.ts`
- Modify: `tests/unit/status-service.test.ts`
- Modify: `tests/unit/logs-service.test.ts`
- Create: `tests/unit/status-command.test.ts`

**Step 1: Write the failing tests**

Add tests that require:
- `status` to report Docker services and the host runner independently
- `status` to include UI URL, exposed ports, and whether bootstrap credentials exist
- `logs runner` to read the actual runner log path
- unknown services to still fail clearly
- terminal output to be product-facing rather than raw JSON

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/status-service.test.ts tests/unit/logs-service.test.ts tests/unit/status-command.test.ts`
Expected: FAIL because the current command prints raw JSON and runner status comes only from `docker compose ps`.

**Step 3: Implement truthful reporting**

Update `StatusService` to combine:
- Docker service state
- runner process state from pid/status metadata
- persisted runtime state for URLs, ports, and credential initialization

Update the status command and renderer to print a concise readable summary instead of raw JSON.

**Step 4: Run test to verify it passes**

Run: `npm run build`
Run: `npx vitest run tests/unit/status-service.test.ts tests/unit/logs-service.test.ts tests/unit/status-command.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/status/StatusService.ts src/core/logs/LogsService.ts src/core/ui/TerminalRenderer.ts src/commands/status.ts src/commands/logs.ts tests/unit/status-service.test.ts tests/unit/logs-service.test.ts tests/unit/status-command.test.ts
git commit -m "feat: add truthful status and logs output"
```

### Task 5: Harden startup, teardown, and reset semantics

**Files:**
- Modify: `src/core/runtime/PortAllocator.ts`
- Modify: `src/commands/dependencies.ts`
- Modify: `src/core/docker/DockerStackManager.ts`
- Modify: `src/commands/down.ts`
- Modify: `src/commands/reset.ts`
- Modify: `tests/unit/port-allocator.test.ts`
- Modify: `tests/integration/down-status-reset.test.ts`
- Create: `tests/unit/up-failure-handling.test.ts`

**Step 1: Write the failing tests**

Add tests that require:
- port conflict detection before startup
- best-effort cleanup when Docker start or runner start fails mid-boot
- `reset --force` to remove all runtime artifacts, including runner logs/pid/config
- idempotent `down()` when services are already gone

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/port-allocator.test.ts tests/unit/up-failure-handling.test.ts tests/integration/down-status-reset.test.ts`
Expected: FAIL because ports are currently hardcoded and partial-start failure cleanup is not implemented.

**Step 3: Implement startup/teardown hardening**

Make `PortAllocator` probe for free ports instead of returning fixed offsets, and update startup orchestration so failure paths:
- stop any newly started containers
- stop the runner if it already started
- leave readable logs/state for diagnosis without pretending the deployment is healthy

Keep reset destructive and simple; backward compatibility is not required.

**Step 4: Run test to verify it passes**

Run: `npm run build`
Run: `npx vitest run tests/unit/port-allocator.test.ts tests/unit/up-failure-handling.test.ts tests/integration/down-status-reset.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/core/runtime/PortAllocator.ts src/commands/dependencies.ts src/core/docker/DockerStackManager.ts src/commands/down.ts src/commands/reset.ts tests/unit/port-allocator.test.ts tests/unit/up-failure-handling.test.ts tests/integration/down-status-reset.test.ts
git commit -m "feat: harden cli startup and teardown"
```

### Task 6: Document and verify the completed CLI end to end

**Files:**
- Modify: `README.md`
- Modify: `tests/unit/readme.test.ts`
- Create: `tests/integration/local-stack-smoke.test.ts`

**Step 1: Write the failing tests**

Add:
- a README test that checks for the real workflow and operational caveats
- a smoke test that exercises `up`, `status`, `logs runner`, and `down` through the built CLI with faked process/docker collaborators

If the environment has Docker plus the packaged images available locally, add an opt-in live smoke path guarded by an environment variable rather than making it mandatory in CI.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/readme.test.ts tests/integration/local-stack-smoke.test.ts`
Expected: FAIL until docs match the actual completed behavior and the smoke harness exists.

**Step 3: Update docs and add the smoke path**

Document:
- prerequisites
- what `companyhelm up` creates locally
- where runtime state/logs live
- how to inspect and reset the deployment

Keep the README honest about what is packaged versus host-managed.

**Step 4: Run the full verification suite**

Run: `npm run build`
Run: `npx vitest run`
Run: `npm test`
Expected: PASS

If Docker and images are available:

Run: `COMPANYHELM_E2E=1 npx vitest run tests/integration/local-stack-smoke.test.ts`
Expected: PASS with a real local deployment lifecycle.

**Step 5: Commit**

```bash
git add README.md tests/unit/readme.test.ts tests/integration/local-stack-smoke.test.ts
git commit -m "docs: document completed bootstrap cli"
```

