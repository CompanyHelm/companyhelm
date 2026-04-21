# API Server Graceful Shutdown Drain Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make ECS deployments drain CompanyHelm API/worker processes gracefully on `SIGTERM`/`SIGINT`, with readiness changes and periodic logs that show active job drainage progress.

**Architecture:** Add an explicit `ApiServer.stop()` lifecycle that is idempotent, flips the process into draining mode, stops accepting new HTTP traffic, waits for BullMQ workers to finish active jobs, then closes queue/database resources. Wrap worker shutdown in a reusable drain helper that logs active BullMQ job counts every few seconds while `worker.close(false)` is pending. Wire `main.ts` process signal handlers to call `server.stop()` instead of relying on process exit.

**Tech Stack:** Node 20, TypeScript, Fastify, BullMQ 5, ioredis, Pino, Vitest.

---

## Context

Current lifecycle entry points:

- `apps/api/src/main.ts` constructs the container and calls `ApiServer.start()`, but does not register `SIGTERM` or `SIGINT` handlers.
- `apps/api/src/server/api_server.ts` registers a Fastify `onClose` hook that stops workers and closes databases, but only runs if `app.close()` is called.
- `apps/api/src/workers/session_process.ts`, `github_webhooks.ts`, `routine_triggers.ts`, and `workflow_triggers.ts` each call `worker.close()` directly and do not emit drain-progress logs.
- BullMQ `Worker.close(false)` waits for active jobs to finish before resolving. BullMQ `Queue.getActiveCount()` can report active queue count while close is pending.

Implementation constraints:

- Keep shutdown idempotent. Multiple `SIGTERM`/`SIGINT` signals must not double-close workers or databases.
- Do not accept new HTTP requests after shutdown starts.
- Do not force-close BullMQ workers during normal ECS shutdown.
- Log drain progress every few seconds while active jobs remain.
- Keep the first implementation narrow: graceful process drain only. Do not split API and workers into separate ECS services in this change.

## Drain Log Shape

Use structured Pino logs so CloudWatch can filter by stable fields.

Recommended messages:

```ts
logger.info({
  signal,
}, "shutdown signal received");

logger.info({
  component: "api_server",
}, "api server entering draining mode");

logger.info({
  worker: "session_process",
  activeJobs,
  elapsedMilliseconds,
}, "waiting for worker jobs to drain");

logger.info({
  worker: "session_process",
  elapsedMilliseconds,
}, "worker drained");

logger.info({
  component: "api_server",
  elapsedMilliseconds,
}, "api server stopped");
```

Keep the exact wording stable enough for log searches. Use `activeJobs`, not a message-only count.

## Task 1: Add A Reusable Worker Drain Helper

**Files:**

- Create: `apps/api/src/workers/drain.ts`
- Test: `apps/api/tests/worker_drain.test.ts`

**Step 1: Write the failing tests**

Create `apps/api/tests/worker_drain.test.ts`.

Test 1: closes a worker and logs active-job progress while close is pending.

```ts
import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { drainBullmqWorker } from "../src/workers/drain.ts";

test("drainBullmqWorker logs active job count while close is pending", async () => {
  vi.useFakeTimers();
  const info = vi.fn();
  let resolveClose: () => void = () => {};
  const closePromise = new Promise<void>((resolve) => {
    resolveClose = resolve;
  });
  const queue = {
    getActiveCount: vi.fn()
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0),
    close: vi.fn(async () => undefined),
  };
  const worker = {
    close: vi.fn(() => closePromise),
  };

  const drainPromise = drainBullmqWorker({
    intervalMilliseconds: 2_000,
    logger: { info, warn: vi.fn(), error: vi.fn() } as never,
    queue: queue as never,
    worker: worker as never,
    workerName: "session_process",
  });

  await vi.advanceTimersByTimeAsync(2_000);
  await vi.advanceTimersByTimeAsync(2_000);
  resolveClose();
  await drainPromise;

  assert.equal(worker.close.mock.calls.length, 1);
  assert.equal(worker.close.mock.calls[0]?.[0], false);
  assert.equal(queue.close.mock.calls.length, 1);
  assert.ok(info.mock.calls.some((call) => call[1] === "waiting for worker jobs to drain"));
  assert.ok(info.mock.calls.some((call) => call[1] === "worker drained"));

  vi.useRealTimers();
});
```

Test 2: still resolves if the worker is missing.

```ts
test("drainBullmqWorker closes the queue when worker was never started", async () => {
  const queue = {
    close: vi.fn(async () => undefined),
  };

  await drainBullmqWorker({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as never,
    queue: queue as never,
    worker: undefined,
    workerName: "session_process",
  });

  assert.equal(queue.close.mock.calls.length, 1);
});
```

**Step 2: Run the failing tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/worker_drain.test.ts
```

Expected: fails because `apps/api/src/workers/drain.ts` does not exist.

**Step 3: Implement the drain helper**

Create `apps/api/src/workers/drain.ts`.

```ts
import type { Queue, Worker } from "bullmq";
import type { Logger as PinoLogger } from "pino";

export type DrainBullmqWorkerInput = {
  intervalMilliseconds?: number;
  logger: Pick<PinoLogger, "error" | "info" | "warn">;
  queue?: Pick<Queue, "close" | "getActiveCount">;
  worker?: Pick<Worker, "close">;
  workerName: string;
};

export async function drainBullmqWorker(input: DrainBullmqWorkerInput): Promise<void> {
  const startedAt = Date.now();
  const intervalMilliseconds = input.intervalMilliseconds ?? 5_000;
  let isDone = false;

  const closePromise = input.worker?.close(false) ?? Promise.resolve();
  const progressTimer = setInterval(() => {
    if (isDone || !input.queue?.getActiveCount) {
      return;
    }

    void input.queue.getActiveCount()
      .then((activeJobs) => {
        input.logger.info({
          activeJobs,
          elapsedMilliseconds: Date.now() - startedAt,
          worker: input.workerName,
        }, "waiting for worker jobs to drain");
      })
      .catch((error) => {
        input.logger.warn({
          error,
          worker: input.workerName,
        }, "failed to read worker active job count while draining");
      });
  }, intervalMilliseconds);

  try {
    await closePromise;
  } finally {
    isDone = true;
    clearInterval(progressTimer);
  }

  input.logger.info({
    elapsedMilliseconds: Date.now() - startedAt,
    worker: input.workerName,
  }, "worker drained");

  await input.queue?.close();
}
```

**Step 4: Run tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/worker_drain.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/workers/drain.ts apps/api/tests/worker_drain.test.ts
git commit -m "feat(api): add bullmq worker drain logging"
```

## Task 2: Wire Drain Helper Into BullMQ Workers

**Files:**

- Modify: `apps/api/src/workers/session_process.ts`
- Modify: `apps/api/src/workers/github_webhooks.ts`
- Modify: `apps/api/src/workers/routine_triggers.ts`
- Modify: `apps/api/src/workers/workflow_triggers.ts`
- Modify tests:
  - `apps/api/tests/session_process_worker.test.ts`
  - `apps/api/tests/workflow_trigger_worker.test.ts`
  - Add equivalent assertions to existing GitHub/routine worker tests if present; otherwise add focused tests for those workers.

**Step 1: Write failing tests for session worker drain behavior**

Update the BullMQ mock in `apps/api/tests/session_process_worker.test.ts` so mock workers expose `close(false)` and mock queues expose `getActiveCount()` and `close()`.

Add an assertion to the existing close test:

```ts
assert.equal(workerMocks.closeMock.mock.calls[0]?.[0], false);
```

Add an assertion that drain logs use the worker name:

```ts
assert.ok(info.mock.calls.some((call) => call[0]?.worker === "session_process"));
```

**Step 2: Run the failing test**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/session_process_worker.test.ts
```

Expected: fails because current worker `stop()` does not pass `false` explicitly and does not use the drain helper.

**Step 3: Add queue ownership to workers**

In each worker file:

- Import `Queue` from `bullmq`.
- Add `private queue?: Queue<PayloadType>;`.
- Instantiate a `Queue` with the same queue name and Redis connection configuration used for the worker.
- Call `drainBullmqWorker({ logger: this.logger, queue, worker, workerName })` in `stop()`.
- Keep `connection.quit()` after the drain helper returns.

Example for `session_process.ts`:

```ts
import { Queue, Worker } from "bullmq";
import { drainBullmqWorker } from "./drain.ts";

private queue?: Queue<SessionWakeJobPayload>;

this.queue = new Queue<SessionWakeJobPayload>(
  this.sessionProcessQueuedNames.getWakeQueueName(),
  { connection: this.connection },
);
```

Shutdown shape:

```ts
async stop(): Promise<void> {
  const worker = this.worker;
  const queue = this.queue;
  const connection = this.connection;
  this.worker = undefined;
  this.queue = undefined;
  this.connection = undefined;

  await drainBullmqWorker({
    logger: this.logger,
    queue,
    worker,
    workerName: "session_process",
  });
  if (connection) {
    await connection.quit();
  }
}
```

Use worker names:

- `session_process`
- `github_webhooks`
- `routine_triggers`
- `workflow_triggers`

**Step 4: Run focused worker tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/session_process_worker.test.ts tests/workflow_trigger_worker.test.ts
```

Expected: PASS after updating mocks.

**Step 5: Commit**

```bash
git add apps/api/src/workers apps/api/tests
git commit -m "feat(api): log worker drain progress on shutdown"
```

## Task 3: Add ApiServer Draining State And Stop Method

**Files:**

- Modify: `apps/api/src/server/api_server.ts`
- Modify: `apps/api/tests/api_server.test.ts`

**Step 1: Write failing tests**

Add tests to `apps/api/tests/api_server.test.ts`.

Test 1: `stop()` closes Fastify and dependencies exactly once.

```ts
test("ApiServer stop is idempotent and closes runtime dependencies", async () => {
  const databaseClose = vi.fn(async () => {});
  const adminDatabaseClose = vi.fn(async () => {});
  const sessionStop = vi.fn(async () => {});
  const routineStop = vi.fn(async () => {});
  const workflowStop = vi.fn(async () => {});
  const githubStop = vi.fn(async () => {});
  const workflowQueueClose = vi.fn(async () => {});
  const githubQueueClose = vi.fn(async () => {});
  const info = vi.fn();

  const server = new ApiServer(
    testConfig(),
    { close: adminDatabaseClose } as never,
    { close: databaseClose } as never,
    { register: async () => {} } as never,
    { getLogger: () => pino({ level: "silent" }), info } as never,
    { validateNoEvictionPolicy: async () => {} } as never,
    { start: () => {}, stop: () => {} } as never,
    { start: () => {}, stop: sessionStop } as never,
    { syncEnabledCronTriggers: async () => {} } as never,
    { start: () => {}, stop: routineStop } as never,
    { syncEnabledCronTriggers: async () => {} } as never,
    { close: workflowQueueClose } as never,
    { start: () => {}, stop: workflowStop } as never,
    { register: () => {} } as never,
    { close: githubQueueClose } as never,
    { register: () => {} } as never,
    { start: () => {}, stop: githubStop } as never,
  );

  await server.start();
  await Promise.all([server.stop(), server.stop()]);

  assert.equal(sessionStop.mock.calls.length, 1);
  assert.equal(routineStop.mock.calls.length, 1);
  assert.equal(workflowStop.mock.calls.length, 1);
  assert.equal(githubStop.mock.calls.length, 1);
  assert.equal(workflowQueueClose.mock.calls.length, 1);
  assert.equal(githubQueueClose.mock.calls.length, 1);
  assert.equal(databaseClose.mock.calls.length, 1);
  assert.equal(adminDatabaseClose.mock.calls.length, 1);
});
```

Test 2: readiness fails after draining starts.

```ts
test("ApiServer readiness reports draining during shutdown", async () => {
  const server = createTestServerWithSlowSessionStop();
  await server.start();

  const app = Reflect.get(server, "app");
  const address = app.server.address() as AddressInfo;

  const stopPromise = server.stop();
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "draining" });

  finishSlowSessionStop();
  await stopPromise;
});
```

Use local helpers in the test file to avoid repeating the large constructor argument list.

**Step 2: Run failing tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/api_server.test.ts
```

Expected: fails because `ApiServer.stop()` does not exist and `/health` is not draining-aware.

**Step 3: Implement `ApiServer.stop()`**

In `apps/api/src/server/api_server.ts`:

- Add fields:

```ts
private isDraining = false;
private stopPromise: Promise<void> | null = null;
```

- Extract shutdown body into a private method:

```ts
private async closeRuntimeDependencies(): Promise<void> {
  this.llmOauthRefreshWorker.stop();
  await this.githubWebhookWorker.stop();
  await this.sessionProcessWorker.stop();
  await this.routineTriggerWorker.stop();
  await this.workflowTriggerWorker.stop();
  await this.workflowTriggerQueueService.close();
  await this.githubWebhookQueueService.close();
  await this.database.close();
  await this.adminDatabase.close();
}
```

- Register `onClose` once and call the helper from there.
- Add public `stop()`:

```ts
async stop(): Promise<void> {
  if (this.stopPromise) {
    return this.stopPromise;
  }

  const startedAt = Date.now();
  this.isDraining = true;
  this.logger.getLogger().info({
    component: "api_server",
  }, "api server entering draining mode");

  this.stopPromise = this.app.close()
    .then(() => {
      this.logger.getLogger().info({
        component: "api_server",
        elapsedMilliseconds: Date.now() - startedAt,
      }, "api server stopped");
    });

  return this.stopPromise;
}
```

- Change `/health`:

```ts
this.app.get("/health", async (_request, reply) => {
  if (this.isDraining) {
    return reply.code(503).send({ status: "draining" });
  }

  return { status: "ok" };
});
```

Important: use `this.logger.getLogger()` only if `ApiLogger` has no direct `info()` method. Keep this consistent with existing `ApiLogger` usage.

**Step 4: Run focused tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/api_server.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/api/src/server/api_server.ts apps/api/tests/api_server.test.ts
git commit -m "feat(api): add graceful api server stop lifecycle"
```

## Task 4: Wire Process Signal Handling In main.ts

**Files:**

- Modify: `apps/api/src/main.ts`
- Test: `apps/api/tests/main_shutdown.test.ts`

**Step 1: Refactor `main.ts` for testability**

Create exported helpers in `main.ts`:

```ts
export type ShutdownSignal = "SIGINT" | "SIGTERM";

export async function startApiProcess(argv: string[] = process.argv): Promise<ApiServer> {
  const argumentsDocument = new ApiCli().parse(argv);
  const config = new Config(ConfigLoader.load(argumentsDocument.configPath, ConfigDocument));
  const container = new ApiContainer().build(config);
  await container.get(DbBootstrap).run();
  const server = container.get(ApiServer);
  await server.start();
  return server;
}

export function registerShutdownHandlers(server: Pick<ApiServer, "stop">, logger: Pick<pino.Logger, "error" | "info">): void {
  let shutdownPromise: Promise<void> | null = null;
  const shutdown = (signal: ShutdownSignal) => {
    logger.info({ signal }, "shutdown signal received");
    shutdownPromise ??= server.stop()
      .then(() => {
        logger.info({ signal }, "shutdown completed");
      })
      .catch((error) => {
        logger.error({ error, signal }, "shutdown failed");
        process.exitCode = 1;
      });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
```

Then keep top-level behavior:

```ts
try {
  const server = await startApiProcess(process.argv);
  registerShutdownHandlers(server, pino(ApiServer.createLoggerOptions(config)));
} catch (error) {
  ...
}
```

Adjust exact logger construction so `config` is available to the top-level logger. If keeping `startApiProcess()` as the config owner makes this awkward, return `{ config, server }`.

**Step 2: Write signal handler tests**

Create `apps/api/tests/main_shutdown.test.ts`.

Use `process.emit("SIGTERM")` with a mocked server and logger. The test must clean up listeners.

```ts
import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { registerShutdownHandlers } from "../src/main.ts";

afterEach(() => {
  process.removeAllListeners("SIGTERM");
  process.removeAllListeners("SIGINT");
});

test("registerShutdownHandlers stops the server once for repeated signals", async () => {
  const stop = vi.fn(async () => {});
  const info = vi.fn();
  const error = vi.fn();

  registerShutdownHandlers({ stop } as never, { info, error } as never);

  process.emit("SIGTERM");
  process.emit("SIGINT");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(stop.mock.calls.length, 1);
  assert.ok(info.mock.calls.some((call) => call[1] === "shutdown signal received"));
  assert.equal(error.mock.calls.length, 0);
});
```

Add a failure-path test:

```ts
test("registerShutdownHandlers sets exitCode when shutdown fails", async () => {
  const previousExitCode = process.exitCode;
  const stop = vi.fn(async () => {
    throw new Error("close failed");
  });
  const error = vi.fn();

  registerShutdownHandlers({ stop } as never, { info: vi.fn(), error } as never);
  process.emit("SIGTERM");
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(process.exitCode, 1);
  assert.ok(error.mock.calls.some((call) => call[1] === "shutdown failed"));
  process.exitCode = previousExitCode;
});
```

**Step 3: Run failing tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/main_shutdown.test.ts
```

Expected: fails because `registerShutdownHandlers` does not exist.

**Step 4: Implement signal handling**

Modify `apps/api/src/main.ts`:

- Export `startApiProcess()` and `registerShutdownHandlers()`.
- Register `SIGTERM` and `SIGINT` with `process.once`.
- Log received signal, success, and failure.
- Keep startup failures using the existing JSON error logger and `process.exit(1)`.
- Ensure tests importing `main.ts` do not start the server. Use a guard:

```ts
if (import.meta.url === `file://${process.argv[1]}`) {
  await runMain();
}
```

**Step 5: Run focused tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/main_shutdown.test.ts tests/api_server.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/main.ts apps/api/tests/main_shutdown.test.ts
git commit -m "feat(api): handle shutdown signals gracefully"
```

## Task 5: Add Shutdown Configuration Knobs

**Files:**

- Modify: `apps/api/src/config/schema.ts`
- Modify: `apps/api/config/local.yaml`
- Modify: `config/companyhelm-api/prod.yaml` in `companyhelm-infra` only if implementing infra config in the same PR.
- Modify relevant config fixtures in tests.

**Step 1: Write config validation tests**

If existing config schema tests exist, add:

```ts
test("ConfigDocument defaults shutdown drain logging settings", () => {
  const config = ConfigDocument.parse({
    ...minimalConfig,
    shutdown: undefined,
  });

  assert.deepEqual(config.shutdown, {
    drain_log_interval_milliseconds: 5000,
  });
});
```

If no schema test exists, add `apps/api/tests/config_schema.test.ts`.

**Step 2: Add schema field**

In `apps/api/src/config/schema.ts`:

```ts
shutdown: z.object({
  drain_log_interval_milliseconds: PositiveIntegerSchema.default(5_000),
}).default({
  drain_log_interval_milliseconds: 5_000,
}),
```

Pass `config.shutdown.drain_log_interval_milliseconds` into worker `stop()` or into worker constructors as needed.

Preferred narrow implementation: keep worker defaults at 5 seconds and skip plumbing config until product needs a different interval. If the team wants explicit config, add it here.

**Step 3: Run config tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/config_schema.test.ts
```

Expected: PASS.

**Step 4: Commit**

```bash
git add apps/api/src/config/schema.ts apps/api/config/local.yaml apps/api/tests/config_schema.test.ts
git commit -m "feat(api): configure shutdown drain logging"
```

## Task 6: Verification

**Files:**

- No new files unless fixes are needed.

**Step 1: Run focused tests**

Run:

```bash
npm exec -w @companyhelm/api -- vitest run tests/worker_drain.test.ts tests/session_process_worker.test.ts tests/api_server.test.ts tests/main_shutdown.test.ts
```

Expected: PASS.

**Step 2: Run API check**

Run:

```bash
npm run check -w @companyhelm/api
```

Expected: PASS.

**Step 3: Run full API test suite**

Run:

```bash
npm run test -w @companyhelm/api
```

Expected: PASS.

**Step 4: Manual local shutdown smoke test**

Run the API locally:

```bash
npm run dev:api
```

In another shell, find and terminate the Node process:

```bash
pgrep -fl "tsx watch.*src/main.ts"
kill -TERM <pid>
```

Expected logs:

- `shutdown signal received`
- `api server entering draining mode`
- zero or more `waiting for worker jobs to drain`
- `worker drained`
- `api server stopped`
- `shutdown completed`

**Step 5: Manual active-job drain smoke test**

Add a temporary local-only test or script that starts a mocked worker close promise with a delay. Do not commit temporary script unless it becomes a proper test.

Expected:

- drain progress logs appear every 5 seconds while the close promise is pending,
- active job count decreases when the mocked queue returns lower counts,
- no force close is used.

**Step 6: Commit final fixes**

If verification required additional edits:

```bash
git add <changed-files>
git commit -m "fix(api): stabilize graceful shutdown tests"
```

## Task 7: Deployment Checks After Merge

**Files:**

- No code changes.

**Step 1: Deploy to dev**

Deploy the API image to dev.

Expected:

- ECS starts the new task.
- Old task receives `SIGTERM`.
- Old task logs `shutdown signal received`.
- Old task logs drain progress if jobs are active.
- New task becomes healthy before old task exits.

**Step 2: Verify health behavior**

During shutdown, call `/health` on the draining task directly if possible through ECS Exec or task ENI.

Expected:

```json
{ "status": "draining" }
```

with HTTP 503.

**Step 3: Verify CloudWatch searchability**

Search CloudWatch logs for:

- `"shutdown signal received"`
- `"api server entering draining mode"`
- `"waiting for worker jobs to drain"`
- `"worker drained"`
- `"api server stopped"`

Confirm `activeJobs`, `elapsedMilliseconds`, `worker`, and `signal` fields are present.

**Step 4: Deploy to prod**

Deploy normally after dev checks pass.

Expected:

- No user-facing 5xx spike during deployment.
- Existing sessions continue or recover through durable queued state.
- No session queue rows remain stuck in `processing` after deployment.

## Out Of Scope For This Plan

- ECS task-definition `stopTimeout`.
- ALB target group health-check path/matcher changes.
- Splitting API and workers into separate ECS services.
- Stale `processing` row reconciler.

Those should be separate follow-up plans because they touch infra and queue recovery semantics beyond process lifecycle.
