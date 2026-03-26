# Message Process Proposal

## Goal

Move message execution out of the API request path and into BullMQ-backed workers while keeping
Postgres as the source of truth. Redis remains an ephemeral coordination layer for queueing hints,
leases, and steer notifications.

This proposal is based on the current implementation in:

- `apps/api/src/services/agent/session/session_manager_service.ts`
- `apps/api/src/services/agent/session/pi-mono/session_manager_service.ts`
- `apps/api/src/services/agent/session/pi-mono/session_event_handler.ts`
- `apps/api/src/services/agent/session/read_service.ts`
- `apps/api/src/services/redis/service.ts`
- `apps/api/src/services/redis/company_scoped_service.ts`

## Current State

Today the API creates the `agent_sessions` row, creates a PI Mono runtime session immediately, and
then prompts that live session directly from `SessionManagerService.createSession(...)`. The PI Mono
runtime is managed by `PiMonoSessionManagerService`, which stores sessions in a process-local map
and creates them with `SessionManager.inMemory()`.

That means the current runtime model has two important properties:

1. Session execution is coupled to the process that handled the API request.
2. A different process cannot safely continue the same PI Mono session, because runtime session
   state is not durably shared across API instances.

This is the main constraint that shapes the queue design.

## Recommended Approach

Use BullMQ for wake jobs, Postgres for durable queued messages, and Redis for ephemeral coordination.
Do not let the BullMQ job itself be the source of truth for message data.

The important adjustment from the initial idea is this:

- Do not use a turn-scoped lease as the primary design.
- Use a session-scoped lease with heartbeat while a worker owns a live PI Mono session.

Why: with the current PI Mono integration, releasing the lease at the end of every turn would allow
the next message for the same session to land on another worker instance that does not have the
runtime PI Mono session in memory. That breaks continuity.

BullMQ should answer: "which session may have work?"

Postgres should answer: "what exact work still needs to be processed?"

Redis should answer:

- "which worker currently owns this session?"
- "should the active owner wake up and check for steer?"

## Data Model

Use the new queued-message tables for inbound work instead of reusing `session_messages`.

Current implemented tables:

- `sessionQueuedMessages` / `session_queued_messages`
- `sessionQueuedMessageImages` / `session_queued_message_images`

Current `sessionQueuedMessages` columns:

- `id`
- `companyId`
- `sessionId`
- `text`
- `shouldSteer`
- `status` enum: `pending`, `processing`
- `createdAt`
- `updatedAt`

Current `sessionQueuedMessageImages` columns:

- `id`
- `companyId`
- `sessionQueuedMessageId`
- `base64EncodedImage`
- `mimeType`
- `createdAt`
- `updatedAt`

Why use these tables:

- `session_messages` represents transcript/output state persisted from PI Mono events.
- queued inbound work is a different concern from transcript state
- keeping them separate avoids mixing "message waiting to be processed" with "message emitted by the
  agent runtime"

With the current schema, all queued rows are user-authored messages and `shouldSteer` determines
whether the worker delivers them with `session.prompt(...)` or `session.steer(...)`.

Chosen policy for processed queued rows:

- keep only live queue state in `sessionQueuedMessages`
- delete processed rows instead of persisting `completed` / `failed` terminal states

Because ownership is session-scoped, lease metadata belongs on `agentSessions`, not on individual
queued rows. The current `agentSessions` table does not yet have lease columns, so if you want
durable lease visibility beyond Redis, add them there instead:

- `leaseOwner`
- `leaseExpiresAt`
- optionally `leasedAt`

If you keep the lease purely in Redis, then no additional queued-message fields are needed for
ownership tracking.

Also add a new `queued` value to `agent_sessions.status`.

That gives the lifecycle:

- `queued`
- `running`
- `stopped`
- `archived`

## Class Layout

### `apps/api/src/services/agent/session/queued-message/service.ts`

Class: `SessionQueuedMessageService`

Responsibilities:

- persist inbound queued work into `sessionQueuedMessages`
- create the first queued row when a session is created
- append later user messages
- append steer messages
- mark rows `processing`
- delete processed rows after successful delivery
- load pending queued rows ordered by `createdAt`
- combine multiple pending steer rows into one effective steer payload

This class owns the Postgres-side source of truth for inbound work.

### `apps/api/src/services/agent/session/queue/service.ts`

Class: `SessionQueueService`

Responsibilities:

- own BullMQ queue creation
- enqueue one wake job per session
- use deterministic job ids such as `company:{companyId}:session:{sessionId}:wake`
- expose methods like `enqueueSessionWake(...)`

BullMQ uses `ioredis`, while the current `RedisService` uses `redis`. Keep them separate instead of
trying to force BullMQ onto the existing Redis client.

### `apps/api/src/services/agent/session/lease/service.ts`

Class: `SessionLeaseService`

Responsibilities:

- atomically acquire a session lease in Redis
- heartbeat the lease while the worker owns the session
- release the lease only if the owner token still matches
- expose the owner token to other services

Key pattern:

- `company:{companyId}:session:{sessionId}:lease`

Value:

- random owner token

This class prevents multiple workers from driving the same live session concurrently.

### `apps/api/src/services/agent/session/runtime/service.ts`

Class: `SessionRuntimeService`

Responsibilities:

- wrap PI Mono runtime session creation and lookup
- replace the current in-process `PiMonoSessionManagerService` role
- create one runtime session for one CompanyHelm session id
- send `prompt(...)`
- send `steer(...)`
- dispose the runtime session when ownership ends

This class can still keep a process-local map, but only the lease owner may touch it.

### `apps/api/src/services/agent/session/execution/service.ts`

Class: `SessionExecutionService`

Responsibilities:

- orchestrate one leased session end to end
- ensure a runtime session exists for the leased session
- subscribe to `session:{id}:steer`
- drain pending queued user messages from Postgres
- react to steer wake events by reloading pending queued steer messages from Postgres
- re-enqueue a wake job if more pending work exists before lease release

This is the central workflow coordinator.

### `apps/api/src/services/agent/session/state/service.ts`

Class: `SessionStateService`

Responsibilities:

- update `agent_sessions.status`
- publish `session:{id}:update`
- keep status transitions consistent across API ingress and worker execution

This removes status-setting responsibilities from unrelated services.

### `apps/api/src/workers/session_queue_worker.ts`

Class: `SessionQueueWorker`

Responsibilities:

- own the BullMQ worker lifecycle
- receive wake jobs
- try to acquire the lease
- if lease acquisition fails, acknowledge the job and exit
- if lease acquisition succeeds, delegate to `SessionExecutionService`

This should not extend the current polling `WorkerBase`. BullMQ already provides the worker loop.

## Workflow

### Create Session

1. API creates the `agent_sessions` row with status `queued`.
2. API inserts one `sessionQueuedMessages` row for the first user message with `shouldSteer = false`.
3. API enqueues the BullMQ wake job for the session.
4. API publishes `session:{id}:update`.
5. API returns immediately.

### Send Message

1. API inserts a new `sessionQueuedMessages` row for the user message with `shouldSteer = false`.
2. API enqueues the BullMQ wake job for the session.
3. API publishes `session:{id}:update` only if session-level metadata changed.

### Send Steer

1. API inserts a new `sessionQueuedMessages` row for the steer message with `shouldSteer = true`.
2. API enqueues the BullMQ wake job for the session.
3. API publishes `session:{id}:steer`.

The Redis publish is only a low-latency nudge. The actual steer content still comes from Postgres.

### Worker Processing

1. BullMQ delivers a wake job for one session.
2. `SessionQueueWorker` tries to acquire the session lease.
3. If the lease is already held:
   - acknowledge the BullMQ job
   - do nothing else
4. If the lease is acquired:
   - heartbeat the lease
   - ensure the PI Mono runtime session exists
   - subscribe to `session:{id}:steer`
   - load pending queued messages from Postgres
   - send the next pending queued row with `shouldSteer = false` as a prompt
   - while the turn is active, if a steer pub/sub signal arrives, reload pending queued rows with
     `shouldSteer = true`,
     combine them, and send one steer call
   - delete processed queued rows
   - on idle, recheck Postgres for pending work
   - if pending work remains, enqueue one more wake job before releasing the lease
   - unsubscribe steer
   - dispose the runtime session only if ownership is ending

## Corner Cases

### Wake Job Picked By The Wrong Worker

If another worker picks a BullMQ wake job for a session already leased elsewhere, that worker should
acknowledge the job and exit. The active lease owner is responsible for draining pending Postgres
rows.

This is safe only because:

- the lease has a TTL
- the owner heartbeats it
- the owner rechecks Postgres before releasing it

### Missed Redis Pub/Sub Event

This must not lose work.

Because `steer` rows are inserted into Postgres first, a missed Redis event only delays processing.
The active worker will still find those pending steer rows during the next explicit Postgres check.

### Duplicate Wake Jobs

This is expected.

Use deterministic BullMQ job ids so multiple API writes collapse into one wake job per session. Even
if duplicates still happen, the lease makes them harmless.

### Worker Crash Mid-Turn

This is the hardest case.

If the worker dies:

- the lease heartbeat stops
- the lease expires
- pending `sessionQueuedMessages` rows remain in Postgres

However, with the current PI Mono integration, the runtime session itself is still process-local.
That means a different worker instance cannot safely continue the exact same live PI Mono session
unless session continuity is made durable separately.

Because of that, phase 1 should explicitly accept one of these behaviors:

- mark the session failed/stopped and require a new user message to restart the conversation, or
- rebuild the PI Mono runtime from persisted state in a follow-up phase

What should not happen is silently handing the session to another worker and assuming continuity.

### Lease Split-Brain

Use owner tokens and compare-and-delete semantics on release. Never delete the lease key by session
id alone.

If a worker loses the lease and continues running, all writes after that point should be treated as
stale and rejected by the coordination layer.

### Steer Storm

If many steer rows arrive while a turn is active:

- load all pending steer rows
- combine them into one steer text payload
- send one `session.steer(...)`
- delete those steer rows after delivery

This avoids one Redis event turning into many steer API calls.

### API Multi-Instance

This design is safe for multi-instance API ingress because:

- API instances only write Postgres rows and enqueue BullMQ wake jobs
- they do not assume local session ownership
- Redis is used only for ephemeral coordination

The only multi-instance limitation that remains is the PI Mono runtime session itself, which is
still process-local in the current code.

## Why Not The Simpler Turn-Scoped Lease

At first glance, turn-scoped leasing looks simpler:

- acquire lease
- prompt
- release lease

That would be correct only if any worker could reconstruct the same runtime session for the next
turn. The current code cannot do that. `PiMonoSessionManagerService` creates PI sessions with
`SessionManager.inMemory()` and stores them in a local map, which means turn-by-turn worker
migration is not safe yet.

So the recommended implementation is:

- BullMQ wake queue
- Postgres `sessionQueuedMessages`
- Redis session-scoped lease + steer nudge
- one active worker owner per live runtime session

## Suggested Implementation Order

1. Add `bullmq` and `ioredis`.
2. Extend `sessionQueuedMessages` with the missing fields needed for steering and completion.
3. Implement `SessionQueuedMessageService`.
4. Implement `SessionQueueService`.
5. Implement `SessionLeaseService`.
6. Refactor session creation so API only persists input + enqueues wake.
7. Introduce `SessionQueueWorker`.
8. Introduce `SessionExecutionService`.
9. Move PI runtime prompting out of the request path.
10. Add tests for lease contention, duplicate wake jobs, steer coalescing, and crash recovery.
