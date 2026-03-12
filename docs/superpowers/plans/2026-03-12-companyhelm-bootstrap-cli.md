# CompanyHelm Bootstrap CLI Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `@companyhelm/cli` package in `CompanyHelm/companyhelm` that provides `companyhelm up|down|status|logs|reset --force` for a packaged local CompanyHelm deployment with generated CompanyHelm auth credentials and a connected host-managed runner.

**Architecture:** The CLI is a TypeScript Node application with a thin command layer over focused service classes. Runtime state, Docker orchestration, bootstrap seeding, runner supervision, status inspection, logs, and terminal rendering are separate units so commands stay small and testable. The packaged stack runs `postgres`, `api`, and `frontend` in Docker on a private network while the runner is supervised on the host.

**Tech Stack:** Node 24, TypeScript, `commander`, `dockerode`, `vitest`, `chalk` or `colorette` for color, `figlet` for ASCII art, and standard Node `child_process` / `fs`.

---

## File Structure

Create these files and keep responsibilities narrow.

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `README.md`
- Create: `.gitignore`
- Create: `src/cli.ts`
- Create: `src/commands/register-commands.ts`
- Create: `src/commands/up.ts`
- Create: `src/commands/down.ts`
- Create: `src/commands/status.ts`
- Create: `src/commands/logs.ts`
- Create: `src/commands/reset.ts`
- Create: `src/core/ui/TerminalRenderer.ts`
- Create: `src/core/process/CommandRunner.ts`
- Create: `src/core/runtime/RuntimePaths.ts`
- Create: `src/core/runtime/RuntimeState.ts`
- Create: `src/core/runtime/RuntimeStateStore.ts`
- Create: `src/core/runtime/PortAllocator.ts`
- Create: `src/core/runtime/Secrets.ts`
- Create: `src/core/runtime/ImageCatalog.ts`
- Create: `src/core/docker/DockerStackManager.ts`
- Create: `src/core/docker/ComposeTemplateRenderer.ts`
- Create: `src/core/bootstrap/SeedSqlRenderer.ts`
- Create: `src/core/bootstrap/DeploymentBootstrapper.ts`
- Create: `src/core/runner/RunnerSupervisor.ts`
- Create: `src/core/status/StatusService.ts`
- Create: `src/core/logs/LogsService.ts`
- Create: `src/templates/docker-compose.yaml.tpl`
- Create: `src/templates/seed.sql.tpl`
- Create: `tests/unit/package-smoke.test.ts`
- Create: `tests/unit/terminal-renderer.test.ts`
- Create: `tests/unit/runtime-state-store.test.ts`
- Create: `tests/unit/port-allocator.test.ts`
- Create: `tests/unit/compose-template-renderer.test.ts`
- Create: `tests/unit/seed-sql-renderer.test.ts`
- Create: `tests/unit/runner-supervisor.test.ts`
- Create: `tests/unit/status-service.test.ts`
- Create: `tests/unit/logs-service.test.ts`
- Create: `tests/unit/register-commands.test.ts`
- Create: `tests/unit/readme.test.ts`
- Create: `tests/integration/up-command.test.ts`
- Create: `tests/integration/down-status-reset.test.ts`
- Create: `tests/fixtures/fake-docker.ts`
- Create: `tests/fixtures/fake-runner-bin.js`

## Chunk 1: Project Scaffold and Command Skeleton

### Task 1: Initialize the package and test harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Write the failing package smoke test**

```ts
import { existsSync } from "node:fs";
import { test, expect } from "vitest";

test("package manifest exists", () => {
  expect(existsSync("package.json")).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/package-smoke.test.ts`
Expected: FAIL because `package.json` and the Vitest harness do not exist yet.

- [ ] **Step 3: Write minimal package/tooling files**

```json
{
  "name": "@companyhelm/cli",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "bin": {
    "companyhelm": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "npm run build && vitest run"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/package-smoke.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore tests/unit/package-smoke.test.ts
git commit -m "chore: scaffold bootstrap cli package"
```

### Task 2: Register the CLI command surface

**Files:**
- Create: `src/cli.ts`
- Create: `src/commands/register-commands.ts`
- Create: `src/commands/up.ts`
- Create: `src/commands/down.ts`
- Create: `src/commands/status.ts`
- Create: `src/commands/logs.ts`
- Create: `src/commands/reset.ts`
- Test: `tests/unit/register-commands.test.ts`

- [ ] **Step 1: Write the failing command registration test**

```ts
import { test, expect } from "vitest";
import { buildProgram } from "../../src/commands/register-commands.js";

test("registers the initial command surface", () => {
  const program = buildProgram();
  expect(program.commands.map((command) => command.name())).toEqual([
    "up",
    "down",
    "status",
    "logs",
    "reset",
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/register-commands.test.ts`
Expected: FAIL with module-not-found for `register-commands.js`.

- [ ] **Step 3: Write minimal command registration and handlers**

```ts
export function buildProgram() {
  const program = new Command();
  program.command("up");
  program.command("down");
  program.command("status");
  program.command("logs").argument("<service>");
  program.command("reset").option("--force");
  return program;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/register-commands.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts src/commands/register-commands.ts src/commands/up.ts src/commands/down.ts src/commands/status.ts src/commands/logs.ts src/commands/reset.ts tests/unit/register-commands.test.ts
git commit -m "feat: add bootstrap cli command skeleton"
```

## Chunk 2: Terminal UX and Runtime State

### Task 3: Add terminal rendering for ASCII art, colors, and summaries

**Files:**
- Create: `src/core/ui/TerminalRenderer.ts`
- Modify: `src/commands/up.ts`
- Modify: `src/commands/down.ts`
- Modify: `src/commands/status.ts`
- Modify: `src/commands/logs.ts`
- Modify: `src/commands/reset.ts`
- Test: `tests/unit/terminal-renderer.test.ts`

- [ ] **Step 1: Write the failing terminal renderer tests**

```ts
import { test, expect } from "vitest";
import { TerminalRenderer } from "../../src/core/ui/TerminalRenderer.js";

test("renders a branded startup banner", () => {
  const renderer = new TerminalRenderer(false);
  expect(renderer.renderBanner()).toContain("COMPANYHELM");
});

test("formats success output with labels", () => {
  const renderer = new TerminalRenderer(false);
  expect(renderer.success("ready")).toContain("ready");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/terminal-renderer.test.ts`
Expected: FAIL with module-not-found for `TerminalRenderer.js`.

- [ ] **Step 3: Write the minimal renderer and wire handlers through it**

```ts
export class TerminalRenderer {
  renderBanner(): string {
    return "COMPANYHELM";
  }

  success(message: string): string {
    return `[ok] ${message}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/terminal-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/ui/TerminalRenderer.ts src/commands/up.ts src/commands/down.ts src/commands/status.ts src/commands/logs.ts src/commands/reset.ts tests/unit/terminal-renderer.test.ts
git commit -m "feat: add branded terminal renderer"
```

### Task 4: Persist first-run runtime state, generated credentials, and ports

**Files:**
- Create: `src/core/runtime/RuntimePaths.ts`
- Create: `src/core/runtime/RuntimeState.ts`
- Create: `src/core/runtime/RuntimeStateStore.ts`
- Create: `src/core/runtime/PortAllocator.ts`
- Create: `src/core/runtime/Secrets.ts`
- Test: `tests/unit/runtime-state-store.test.ts`
- Test: `tests/unit/port-allocator.test.ts`

- [ ] **Step 1: Write the failing runtime state tests**

```ts
import { test, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { RuntimeStateStore } from "../../src/core/runtime/RuntimeStateStore.js";

test("initializes state with admin credentials and runner secret", () => {
  const root = mkdtempSync(path.join(tmpdir(), "companyhelm-state-"));
  const store = new RuntimeStateStore(root);
  const state = store.initialize();
  expect(state.auth.username).toBe("admin");
  expect(state.auth.password.length).toBeGreaterThan(10);
  expect(state.runner.secret.length).toBeGreaterThan(10);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/runtime-state-store.test.ts tests/unit/port-allocator.test.ts`
Expected: FAIL because the runtime state modules do not exist yet.

- [ ] **Step 3: Write minimal runtime state classes**

```ts
export interface RuntimeState {
  auth: { username: string; password: string };
  runner: { secret: string };
}

export class RuntimeStateStore {
  initialize(): RuntimeState {
    return {
      auth: { username: "admin", password: randomSecret() },
      runner: { secret: randomSecret() },
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/runtime-state-store.test.ts tests/unit/port-allocator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/runtime/RuntimePaths.ts src/core/runtime/RuntimeState.ts src/core/runtime/RuntimeStateStore.ts src/core/runtime/PortAllocator.ts src/core/runtime/Secrets.ts tests/unit/runtime-state-store.test.ts tests/unit/port-allocator.test.ts
git commit -m "feat: persist bootstrap runtime state"
```

## Chunk 3: Docker Stack and Database Bootstrap

### Task 5: Render a private-network Docker stack with limited host port exposure

**Files:**
- Create: `src/core/runtime/ImageCatalog.ts`
- Create: `src/core/docker/ComposeTemplateRenderer.ts`
- Create: `src/templates/docker-compose.yaml.tpl`
- Test: `tests/unit/compose-template-renderer.test.ts`

- [ ] **Step 1: Write the failing compose renderer test**

```ts
import { test, expect } from "vitest";
import { ComposeTemplateRenderer } from "../../src/core/docker/ComposeTemplateRenderer.js";

test("renders frontend, api, and postgres with only allowed host ports", () => {
  const yaml = new ComposeTemplateRenderer().render({
    uiPort: 4173,
    runnerGrpcPort: 50051,
    agentCliGrpcPort: 50052,
  });

  expect(yaml).toContain("frontend");
  expect(yaml).toContain("runnerGrpcPort");
  expect(yaml).not.toContain("5432:5432");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/compose-template-renderer.test.ts`
Expected: FAIL with module-not-found for the compose renderer.

- [ ] **Step 3: Write the minimal template renderer and image catalog**

```ts
export class ComposeTemplateRenderer {
  render(ports: { uiPort: number; runnerGrpcPort: number; agentCliGrpcPort: number }): string {
    return `services:\n  frontend:\n    ports:\n      - "${ports.uiPort}:4173"`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/compose-template-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/runtime/ImageCatalog.ts src/core/docker/ComposeTemplateRenderer.ts src/templates/docker-compose.yaml.tpl tests/unit/compose-template-renderer.test.ts
git commit -m "feat: render packaged docker stack"
```

### Task 6: Seed CompanyHelm auth data and hashed runner secrets

**Files:**
- Create: `src/core/bootstrap/SeedSqlRenderer.ts`
- Create: `src/core/bootstrap/DeploymentBootstrapper.ts`
- Create: `src/core/process/CommandRunner.ts`
- Create: `src/templates/seed.sql.tpl`
- Test: `tests/unit/seed-sql-renderer.test.ts`

- [ ] **Step 1: Write the failing seed renderer test**

```ts
import { test, expect } from "vitest";
import { SeedSqlRenderer } from "../../src/core/bootstrap/SeedSqlRenderer.js";

test("renders admin user and hashed runner secret", () => {
  const sql = new SeedSqlRenderer().render({
    companyId: "company-1",
    companyName: "Local CompanyHelm",
    username: "admin",
    passwordHash: "password-hash",
    runnerName: "local-runner",
    runnerSecretHash: "runner-hash",
  });

  expect(sql).toContain("admin");
  expect(sql).toContain("runner-hash");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/seed-sql-renderer.test.ts`
Expected: FAIL with module-not-found for `SeedSqlRenderer.js`.

- [ ] **Step 3: Write the minimal SQL renderer and bootstrap coordinator**

```ts
export class SeedSqlRenderer {
  render(input: { username: string; runnerSecretHash: string }): string {
    return `-- seed\n-- ${input.username}\n-- ${input.runnerSecretHash}\n`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/seed-sql-renderer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/bootstrap/SeedSqlRenderer.ts src/core/bootstrap/DeploymentBootstrapper.ts src/core/process/CommandRunner.ts src/templates/seed.sql.tpl tests/unit/seed-sql-renderer.test.ts
git commit -m "feat: add bootstrap seeding flow"
```

## Chunk 4: Runner Supervision and Service Commands

### Task 7: Start and stop the host-managed runner with persisted secrets

**Files:**
- Create: `src/core/runner/RunnerSupervisor.ts`
- Create: `tests/fixtures/fake-runner-bin.js`
- Test: `tests/unit/runner-supervisor.test.ts`

- [ ] **Step 1: Write the failing runner supervisor test**

```ts
import { test, expect } from "vitest";
import { RunnerSupervisor } from "../../src/core/runner/RunnerSupervisor.js";

test("builds runner launch args with the generated secret", () => {
  const supervisor = new RunnerSupervisor("/tmp/companyhelm");
  const args = supervisor.buildStartArgs({
    grpcTarget: "127.0.0.1:50051",
    secret: "runner-secret",
  });

  expect(args).toContain("runner-secret");
  expect(args).toContain("127.0.0.1:50051");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/runner-supervisor.test.ts`
Expected: FAIL with module-not-found for `RunnerSupervisor.js`.

- [ ] **Step 3: Write the minimal supervisor**

```ts
export class RunnerSupervisor {
  buildStartArgs(input: { grpcTarget: string; secret: string }): string[] {
    return ["runner", "start", "--grpc-target", input.grpcTarget, "--secret", input.secret];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/runner-supervisor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/runner/RunnerSupervisor.ts tests/fixtures/fake-runner-bin.js tests/unit/runner-supervisor.test.ts
git commit -m "feat: supervise host runner lifecycle"
```

### Task 8: Implement `up`, `down`, `status`, `logs`, and `reset --force`

**Files:**
- Create: `src/core/docker/DockerStackManager.ts`
- Create: `src/core/status/StatusService.ts`
- Create: `src/core/logs/LogsService.ts`
- Modify: `src/commands/up.ts`
- Modify: `src/commands/down.ts`
- Modify: `src/commands/status.ts`
- Modify: `src/commands/logs.ts`
- Modify: `src/commands/reset.ts`
- Test: `tests/unit/status-service.test.ts`
- Test: `tests/unit/logs-service.test.ts`
- Test: `tests/integration/up-command.test.ts`
- Test: `tests/integration/down-status-reset.test.ts`
- Create: `tests/fixtures/fake-docker.ts`

- [ ] **Step 1: Write the failing status, logs, and reset guard tests**

```ts
import { test, expect } from "vitest";
import { buildProgram } from "../../src/commands/register-commands.js";

test("reset requires the force flag", async () => {
  const program = buildProgram();
  await expect(program.parseAsync(["node", "companyhelm", "reset"])).rejects.toThrow("--force");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/status-service.test.ts tests/unit/logs-service.test.ts tests/integration/up-command.test.ts tests/integration/down-status-reset.test.ts`
Expected: FAIL because the service classes and real command behavior are not implemented.

- [ ] **Step 3: Write the minimal orchestration path**

```ts
export class DockerStackManager {
  async up(): Promise<void> {}
  async down(): Promise<void> {}
}

export class StatusService {
  async read() {
    return { frontend: "running", api: "running", postgres: "running", runner: "running" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/status-service.test.ts tests/unit/logs-service.test.ts tests/integration/up-command.test.ts tests/integration/down-status-reset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/docker/DockerStackManager.ts src/core/status/StatusService.ts src/core/logs/LogsService.ts src/commands/up.ts src/commands/down.ts src/commands/status.ts src/commands/logs.ts src/commands/reset.ts tests/unit/status-service.test.ts tests/unit/logs-service.test.ts tests/integration/up-command.test.ts tests/integration/down-status-reset.test.ts tests/fixtures/fake-docker.ts
git commit -m "feat: implement bootstrap deployment commands"
```

## Chunk 5: Documentation and End-to-End Verification

### Task 9: Document install, lifecycle, generated credentials, and service logs

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the failing documentation expectation test**

```ts
import { readFileSync } from "node:fs";
import { test, expect } from "vitest";

test("readme documents the required commands", () => {
  const readme = readFileSync("README.md", "utf8");
  expect(readme).toContain("companyhelm up");
  expect(readme).toContain("companyhelm logs <service>");
  expect(readme).toContain("companyhelm reset --force");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/readme.test.ts`
Expected: FAIL because the README and test file do not exist yet.

- [ ] **Step 3: Write the README**

```md
# CompanyHelm CLI

Install `@companyhelm/cli` and run `companyhelm up` to start the local deployment.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/readme.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add README.md tests/unit/readme.test.ts
git commit -m "docs: add bootstrap cli usage guide"
```

### Task 10: Run the full verification suite and record the exact commands

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run unit tests**

Run: `npm test -- tests/unit`
Expected: PASS

- [ ] **Step 2: Run integration tests**

Run: `npm test -- tests/integration`
Expected: PASS

- [ ] **Step 3: Run a local smoke boot**

Run: `node dist/cli.js up`
Expected: printed ASCII art banner, printed UI URL, printed generated `admin` credentials on first run, and reported runner connectivity.

- [ ] **Step 4: Run service inspection commands**

Run: `node dist/cli.js status`
Expected: all four services reported individually.

Run: `node dist/cli.js logs api`
Expected: API-only logs.

Run: `node dist/cli.js reset --force`
Expected: deployment torn down and runtime state removed.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "test: verify bootstrap cli end to end"
```
