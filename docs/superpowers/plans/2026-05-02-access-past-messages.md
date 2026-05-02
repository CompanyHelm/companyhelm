# Access Past Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a system skill that lets an agent read its own persisted `session_messages` with pagination, content inclusion/type filters, individual message lookup, and fuzzy text search.

**Architecture:** Add a read service for agent-owned session messages, a system-command wrapper for input parsing/serialization, and register a new `access_past_messages` system skill with three commands. Access is scoped to `agent_sessions.agent_id = current agent` and `company_id = current company`.

**Tech Stack:** TypeScript, Drizzle ORM, Vitest, CompanyHelm system command catalog.

---

### Task 1: Register the system skill and command surface

**Files:**
- Modify: `apps/api/src/services/skills/system_registry.ts`
- Modify: `apps/api/src/services/skills/system_command_catalog.ts`
- Test: `apps/api/tests/system_command_service.test.ts`
- Test: existing skill catalog tests that enumerate system skills

- [ ] Add `Access past messages` with key `access_past_messages`.
- [ ] Add command definitions: `past_messages.list`, `past_messages.get`, and `past_messages.search`.
- [ ] Verify inactive commands are rejected before dispatch.

### Task 2: Add message read service

**Files:**
- Create: `apps/api/src/services/session_messages/access_service.ts`
- Test: `apps/api/tests/session_message_access_service.test.ts`

- [ ] Implement agent-owned list pagination using `(created_at, id)` opaque cursors.
- [ ] Implement get-by-id with agent ownership check.
- [ ] Implement fuzzy text search against `message_contents.text` using `ILIKE` and the same agent ownership scope.
- [ ] Include message contents only when requested, filtered by `message_contents.type` when provided.

### Task 3: Wire the system command handler

**Files:**
- Create: `apps/api/src/services/system_commands/access_past_messages.ts`
- Modify: `apps/api/src/services/system_command_service.ts`
- Test: `apps/api/tests/access_past_messages_system_command_service.test.ts`

- [ ] Parse loose JSON inputs into narrow service inputs.
- [ ] Serialize dates and nested contents for tool output.
- [ ] Route the new skill key in `SystemCommandService`.

### Task 4: Verify locally and prepare PR

- [ ] Run focused Vitest tests for new and affected command/skill tests.
- [ ] Run local-dev enough to exercise the real app/tool surface.
- [ ] Record a short local demo video and upload it.
- [ ] Commit, push, and open a PR.
