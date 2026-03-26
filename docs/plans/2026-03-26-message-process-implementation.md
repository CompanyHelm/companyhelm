# Message Process Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace in-request PI Mono prompting with BullMQ-backed queued session execution while keeping Postgres as the source of truth and centralizing all queue/channel names in one session-process naming class.

**Architecture:** API mutations should only validate, persist queued work into `sessionQueuedMessages`, and enqueue one BullMQ wake job per session. A dedicated queue worker should acquire a Redis lease, drive the process-local PI Mono runtime for that session, react to Redis steer nudges by rereading Postgres, and delete processed queued rows after successful delivery. All BullMQ queue names, Redis pub/sub channels, Redis patterns, and Redis lease key fragments should come from one central class so there are no more hardcoded coordination strings.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL, Redis, BullMQ, ioredis, Inversify, Fastify, Mercurius, Vitest

---

### Task 1: Add BullMQ Dependencies And Central Coordination Names

**Files:**
- Modify: `apps/api/package.json`
- Modify: `package-lock.json`
- Create: `apps/api/src/services/agent/session/process/names.ts`
- Test: `apps/api/tests/session_process_names.test.ts`

**Step 1: Write the failing test**

Create `apps/api/tests/session_process_names.test.ts` with expectations for the exact names the rest of the implementation will use:

```ts
import { describe, expect, it } from "vitest";
import { SessionProcessNames } from "../src/services/agent/session/process/names.ts";

describe("SessionProcessNames", () => {
  it("returns the BullMQ wake queue name and job id", () => {
    const names = new SessionProcessNames();
    expect(names.getWakeQueueName()).toBe("agent-session-process");
    expect(names.getWakeJobName()).toBe("wake");
    expect(names.getWakeJobId("company-1", "session-1")).toBe("company:company-1:session:session-1:wake");
  });

  it("returns the Redis channel fragments and patterns", () => {
    const names = new SessionProcessNames();
    expect(names.getSessionUpdateChannel("session-1")).toBe("session:session-1:update");
    expect(names.getSessionUpdatePattern()).toBe("session:*:update");
    expect(names.getSessionMessageUpdateChannel("session-1", "message-1")).toBe("session:session-1:message:message-1:update");
    expect(names.getSessionMessageUpdatePattern("session-1")).toBe("session:session-1:message:*:update");
    expect(names.getSessionSteerChannel("session-1")).toBe("session:session-1:steer");
    expect(names.getSessionLeaseKey("session-1")).toBe("session:session-1:lease");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run tests/session_process_names.test.ts`

Expected: FAIL because `SessionProcessNames` does not exist.

**Step 3: Write minimal implementation**

Install BullMQ and ioredis:

Run: `npm install -w @companyhelm/api bullmq ioredis`

Create `apps/api/src/services/agent/session/process/names.ts`:

```ts
import { injectable } from "inversify";

/**
 * Centralizes all queue, job, channel, pattern, and Redis key fragment names used by the
 * session-processing flow so the rest of the code never hardcodes coordination strings.
 */
@injectable()
export class SessionProcessNames {
  getWakeQueueName(): string {
    return "agent-session-process";
  }

  getWakeJobName(): string {
    return "wake";
  }

  getWakeJobId(companyId: string, sessionId: string): string {
    return `company:${companyId}:session:${sessionId}:wake`;
  }

  getSessionUpdateChannel(sessionId: string): string {
    return `session:${sessionId}:update`;
  }

  getSessionUpdatePattern(): string {
    return "session:*:update";
  }

  getSessionMessageUpdateChannel(sessionId: string, messageId: string): string {
    return `session:${sessionId}:message:${messageId}:update`;
  }

  getSessionMessageUpdatePattern(sessionId: string): string {
    return `session:${sessionId}:message:*:update`;
  }

  getSessionSteerChannel(sessionId: string): string {
    return `session:${sessionId}:steer`;
  }

  getSessionLeaseKey(sessionId: string): string {
    return `session:${sessionId}:lease`;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run tests/session_process_names.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/package.json package-lock.json apps/api/src/services/agent/session/process/names.ts apps/api/tests/session_process_names.test.ts
git commit -m "Add session process naming registry"
```

### Task 2: Add Queued Session Status And Queued Message Repository

**Files:**
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle/0026_session_process_status.sql`
- Modify: `apps/api/drizzle/meta/_journal.json`
- Modify: `apps/api/drizzle/meta/0025_snapshot.json`
- Create: `apps/api/drizzle/meta/0026_snapshot.json`
- Create: `apps/api/src/services/agent/session/process/queued_messages.ts`
- Test: `apps/api/tests/session_queued_message_service.test.ts`
- Test: `apps/api/tests/agent_session_status_migration.test.ts`

**Step 1: Write the failing tests**

Create `apps/api/tests/session_queued_message_service.test.ts` covering:

- enqueueing a queued message with `shouldSteer = false`
- enqueueing a queued message with `shouldSteer = true`
- loading pending messages ordered by `createdAt`
- loading pending steer messages only
- marking rows `processing`
- deleting processed rows and images together
- `hasPendingMessages(sessionId)` returning true or false

Extend `apps/api/tests/agent_session_status_migration.test.ts` to expect `queued` to be part of the enum migration.

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run tests/session_queued_message_service.test.ts tests/agent_session_status_migration.test.ts`

Expected: FAIL because the service and `queued` status do not exist.

**Step 3: Write minimal implementation**

Update `apps/api/src/db/schema.ts`:

```ts
export const agentSessionStatusEnum = pgEnum("agent_session_status", ["queued", "running", "stopped", "archived"]);
```

Create `apps/api/src/services/agent/session/process/queued_messages.ts` with one class:

```ts
@injectable()
export class SessionQueuedMessageService {
  async enqueue(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      sessionId: string;
      text: string;
      shouldSteer: boolean;
      images?: Array<{ base64EncodedImage: string; mimeType: string }>;
    },
  ): Promise<{ id: string }> { /* insert queued row + image rows */ }

  async listPending(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> { /* order by createdAt asc */ }

  async listPendingSteer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<QueuedSessionMessageRecord[]> { /* shouldSteer = true */ }

  async markProcessing(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    ids: string[],
  ): Promise<void> { /* update status */ }

  async deleteProcessed(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    ids: string[],
  ): Promise<void> { /* delete queued rows, cascade images */ }

  async hasPendingMessages(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<boolean> { /* exists pending rows */ }
}
```

Add the drizzle migration for the `queued` enum value.

**Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx vitest run tests/session_queued_message_service.test.ts tests/agent_session_status_migration.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/db/schema.ts apps/api/drizzle apps/api/src/services/agent/session/process/queued_messages.ts apps/api/tests/session_queued_message_service.test.ts apps/api/tests/agent_session_status_migration.test.ts
git commit -m "Add queued session message repository"
```

### Task 3: Add BullMQ Queue Service

**Files:**
- Create: `apps/api/src/services/agent/session/process/queue.ts`
- Test: `apps/api/tests/session_process_queue.test.ts`

**Step 1: Write the failing test**

Create `apps/api/tests/session_process_queue.test.ts` covering:

- queue name comes from `SessionProcessNames`
- wake jobs use job name `wake`
- wake jobs dedupe on `companyId + sessionId`
- enqueue payload includes `companyId` and `sessionId`

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run tests/session_process_queue.test.ts`

Expected: FAIL because `SessionProcessQueueService` does not exist.

**Step 3: Write minimal implementation**

Create `apps/api/src/services/agent/session/process/queue.ts`:

```ts
import { Queue } from "bullmq";
import IORedis from "ioredis";

@injectable()
export class SessionProcessQueueService {
  private readonly queue: Queue<SessionWakeJobPayload>;

  constructor(
    @inject(Config) config: Config,
    @inject(SessionProcessNames) names: SessionProcessNames,
  ) {
    const connection = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      username: config.redis.username || undefined,
      password: config.redis.password || undefined,
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue(names.getWakeQueueName(), { connection });
  }

  async enqueueSessionWake(companyId: string, sessionId: string): Promise<void> {
    await this.queue.add(
      this.names.getWakeJobName(),
      { companyId, sessionId },
      { jobId: this.names.getWakeJobId(companyId, sessionId) },
    );
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run tests/session_process_queue.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/agent/session/process/queue.ts apps/api/tests/session_process_queue.test.ts
git commit -m "Add BullMQ session wake queue service"
```

### Task 4: Add Redis Lease Service

**Files:**
- Create: `apps/api/src/services/agent/session/process/lease.ts`
- Test: `apps/api/tests/session_lease_service.test.ts`

**Step 1: Write the failing test**

Create `apps/api/tests/session_lease_service.test.ts` covering:

- acquire returns owner token when lease is free
- second acquire returns `null` while lease is held
- heartbeat succeeds only for the same token
- release deletes only the matching token
- expired lease can be reacquired

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run tests/session_lease_service.test.ts`

Expected: FAIL because `SessionLeaseService` does not exist.

**Step 3: Write minimal implementation**

Create `apps/api/src/services/agent/session/process/lease.ts`:

```ts
@injectable()
export class SessionLeaseService {
  private static readonly LEASE_TTL_MILLISECONDS = 30_000;

  async acquire(companyId: string, sessionId: string): Promise<SessionLeaseHandle | null> {
    const token = randomUUID();
    const result = await client.set(scopedLeaseKey, token, {
      NX: true,
      PX: SessionLeaseService.LEASE_TTL_MILLISECONDS,
    });
    return result === "OK" ? { companyId, sessionId, token } : null;
  }

  async heartbeat(handle: SessionLeaseHandle): Promise<boolean> { /* compare token, then pExpire */ }

  async release(handle: SessionLeaseHandle): Promise<void> { /* compare token, then del */ }
}
```

Use `SessionProcessNames.getSessionLeaseKey(sessionId)` for the key fragment and keep the actual
company scoping inside the lease service.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run tests/session_lease_service.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/agent/session/process/lease.ts apps/api/tests/session_lease_service.test.ts
git commit -m "Add Redis session lease service"
```

### Task 5: Move PI Mono Runtime Control Behind An Execution Service

**Files:**
- Modify: `apps/api/src/services/agent/session/pi-mono/session_manager_service.ts`
- Create: `apps/api/src/services/agent/session/process/execution.ts`
- Create: `apps/api/src/workers/session_queue.ts`
- Test: `apps/api/tests/pi_agent_session_manager_service.test.ts`
- Test: `apps/api/tests/session_execution_service.test.ts`

**Step 1: Write the failing tests**

Create `apps/api/tests/session_execution_service.test.ts` covering:

- acquired lease executes the oldest pending non-steer message
- active steer pub/sub causes pending steer rows to be reloaded and combined
- processed queued rows are deleted
- pending rows enqueue another wake before release
- lease miss acknowledges with no work

Extend `apps/api/tests/pi_agent_session_manager_service.test.ts` to expect:

- `ensureSession(...)` does not recreate an existing runtime
- `steer(sessionId, text)` delegates to PI Mono
- a turn-completion waiter resolves on `turn_end`

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run tests/pi_agent_session_manager_service.test.ts tests/session_execution_service.test.ts`

Expected: FAIL because the runtime manager and execution service do not expose these behaviors.

**Step 3: Write minimal implementation**

Refactor `apps/api/src/services/agent/session/pi-mono/session_manager_service.ts`:

- rename `create(...)` semantics to `ensureSession(...)`
- keep one runtime session per session id in-process
- add `steer(sessionId, message: string): Promise<void>`
- add `waitForTurnEnd(sessionId): Promise<void>`
- keep `prompt(sessionId, message: string): Promise<void>`

Create `apps/api/src/services/agent/session/process/execution.ts`:

```ts
@injectable()
export class SessionExecutionService {
  async execute(companyId: string, sessionId: string): Promise<void> {
    const lease = await this.sessionLeaseService.acquire(companyId, sessionId);
    if (!lease) {
      return;
    }

    try {
      await this.piMonoSessionManagerService.ensureSession(/* session config */);
      const steerSubscription = await this.redisCompanyScopedService.subscribe(
        this.sessionProcessNames.getSessionSteerChannel(sessionId),
        () => { this.hasSteerSignal = true; },
      );

      // loop:
      // 1. load oldest pending prompt row
      // 2. mark processing
      // 3. prompt
      // 4. wait for turn end
      // 5. if steer signaled, load pending steer rows, combine, steer, wait for turn end
      // 6. delete processed rows
      // 7. if more pending rows remain, enqueue wake before exit
    } finally {
      await this.sessionLeaseService.release(lease);
    }
  }
}
```

Create `apps/api/src/workers/session_queue.ts` as the BullMQ worker wrapper:

```ts
@injectable()
export class SessionQueueWorker {
  start(): void { /* create BullMQ Worker and process wake jobs */ }
  async stop(): Promise<void> { /* close worker */ }
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx vitest run tests/pi_agent_session_manager_service.test.ts tests/session_execution_service.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/agent/session/pi-mono/session_manager_service.ts apps/api/src/services/agent/session/process/execution.ts apps/api/src/workers/session_queue.ts apps/api/tests/pi_agent_session_manager_service.test.ts apps/api/tests/session_execution_service.test.ts
git commit -m "Add queued session execution worker"
```

### Task 6: Refactor API Ingress To Queue Work Instead Of Prompting Inline

**Files:**
- Modify: `apps/api/src/services/agent/session/session_manager_service.ts`
- Modify: `apps/api/src/graphql/mutations/create_session.ts`
- Create: `apps/api/src/graphql/mutations/prompt_session.ts`
- Modify: `apps/api/src/graphql/graphql_application.ts`
- Modify: `apps/api/src/graphql/schema/schema.graphql`
- Test: `apps/api/tests/session_manager_service.test.ts`
- Test: `apps/api/tests/create_session_mutation.test.ts`
- Create: `apps/api/tests/prompt_session_mutation.test.ts`

**Step 1: Write the failing tests**

Update `apps/api/tests/session_manager_service.test.ts` so it expects:

- `createSession(...)` inserts the session with status `queued`
- `createSession(...)` does not call `piMonoSessionManagerService.prompt(...)`
- `createSession(...)` enqueues a queued message row and BullMQ wake
- `prompt(...)` inserts a queued message row and BullMQ wake
- `prompt(..., shouldSteer = true)` also publishes the steer channel

Update `apps/api/tests/create_session_mutation.test.ts` so it expects the returned session status to be `queued`.

Create `apps/api/tests/prompt_session_mutation.test.ts` covering:

- authentication
- required `sessionId`
- required `message`
- optional `shouldSteer`

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run tests/session_manager_service.test.ts tests/create_session_mutation.test.ts tests/prompt_session_mutation.test.ts`

Expected: FAIL because `SessionManagerService` still prompts inline and the mutation does not exist.

**Step 3: Write minimal implementation**

Refactor `apps/api/src/services/agent/session/session_manager_service.ts`:

- inject `SessionQueuedMessageService`
- inject `SessionProcessQueueService`
- inject `SessionProcessNames`
- create session row with `status: "queued"`
- enqueue the first queued message instead of calling `piMonoSessionManagerService.prompt(...)`
- make `prompt(...)` real and queue-only

Add `apps/api/src/graphql/mutations/prompt_session.ts`:

```ts
type PromptSessionMutationArguments = {
  input: {
    sessionId: string;
    message: string;
    shouldSteer?: boolean | null;
  };
};
```

Wire it into `graphql_application.ts` and `schema.graphql`.

**Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx vitest run tests/session_manager_service.test.ts tests/create_session_mutation.test.ts tests/prompt_session_mutation.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/agent/session/session_manager_service.ts apps/api/src/graphql/mutations/create_session.ts apps/api/src/graphql/mutations/prompt_session.ts apps/api/src/graphql/graphql_application.ts apps/api/src/graphql/schema/schema.graphql apps/api/tests/session_manager_service.test.ts apps/api/tests/create_session_mutation.test.ts apps/api/tests/prompt_session_mutation.test.ts
git commit -m "Queue session messages from API ingress"
```

### Task 7: Replace Hardcoded Coordination Strings With SessionProcessNames

**Files:**
- Modify: `apps/api/src/services/agent/session/session_manager_service.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/session_event_handler.ts`
- Modify: `apps/api/src/graphql/resolvers/session_updated.ts`
- Modify: `apps/api/src/graphql/resolvers/session_message_updated.ts`
- Test: `apps/api/tests/pi_mono_session_event_handler.test.ts`
- Test: `apps/api/tests/session_subscription_resolvers.test.ts`

**Step 1: Write the failing tests**

Update the event-handler and subscription-resolver tests so they assert name generation through
`SessionProcessNames`, not hardcoded literals.

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx vitest run tests/pi_mono_session_event_handler.test.ts tests/session_subscription_resolvers.test.ts`

Expected: FAIL because hardcoded strings are still in use.

**Step 3: Write minimal implementation**

Replace:

- `` `session:${this.sessionId}:update` ``
- `` `session:${this.sessionId}:message:${messageId}:update` ``
- `"session:*:update"`
- `` `session:${sessionId}:message:*:update` ``

with `SessionProcessNames` method calls everywhere.

**Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx vitest run tests/pi_mono_session_event_handler.test.ts tests/session_subscription_resolvers.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/services/agent/session/session_manager_service.ts apps/api/src/services/agent/session/pi-mono/session_event_handler.ts apps/api/src/graphql/resolvers/session_updated.ts apps/api/src/graphql/resolvers/session_message_updated.ts apps/api/tests/pi_mono_session_event_handler.test.ts apps/api/tests/session_subscription_resolvers.test.ts
git commit -m "Use central session process names"
```

### Task 8: Start And Stop The Queue Worker With The API

**Files:**
- Modify: `apps/api/src/server/api_server.ts`
- Modify: `apps/api/server.ts`
- Test: `apps/api/tests/api_server.test.ts`

**Step 1: Write the failing test**

Extend `apps/api/tests/api_server.test.ts` so it expects:

- `SessionQueueWorker.start()` is called once on startup
- `SessionQueueWorker.stop()` is called on shutdown
- worker startup is not duplicated between `server.ts` and `ApiServer.start()`

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx vitest run tests/api_server.test.ts`

Expected: FAIL because the queue worker is not wired and worker startup is currently split.

**Step 3: Write minimal implementation**

Modify `apps/api/src/server/api_server.ts`:

- inject `SessionQueueWorker`
- start it in `start()`
- stop it in the `onClose` hook

Modify `apps/api/server.ts`:

- remove direct worker start calls that should belong to `ApiServer`
- keep bootstrap and `ApiServer.start()` as the only startup path

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx vitest run tests/api_server.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/server/api_server.ts apps/api/server.ts apps/api/tests/api_server.test.ts
git commit -m "Start session queue worker with API server"
```

### Task 9: Run Full Verification

**Files:**
- No code changes expected

**Step 1: Run focused API tests**

Run:

```bash
cd apps/api && npx vitest run \
  tests/session_process_names.test.ts \
  tests/session_queued_message_service.test.ts \
  tests/session_process_queue.test.ts \
  tests/session_lease_service.test.ts \
  tests/session_execution_service.test.ts \
  tests/session_manager_service.test.ts \
  tests/create_session_mutation.test.ts \
  tests/prompt_session_mutation.test.ts \
  tests/pi_mono_session_event_handler.test.ts \
  tests/session_subscription_resolvers.test.ts \
  tests/api_server.test.ts
```

Expected: PASS

**Step 2: Run lint**

Run: `cd apps/api && npm run lint`

Expected: PASS

**Step 3: Run full API test suite**

Run: `cd apps/api && npm test`

Expected: PASS

**Step 4: Run migration command**

Run: `cd apps/api && npm run db:migrate`

Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "Verify BullMQ session message processing"
```

