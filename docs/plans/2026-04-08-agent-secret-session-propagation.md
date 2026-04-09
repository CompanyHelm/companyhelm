# Agent Secret Session Propagation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When a secret is added to or removed from an agent, propagate that change to all existing sessions for that agent.

**Architecture:** Centralize the propagation rule in `SecretService` so GraphQL mutations and other callers share one implementation. Update the PI Mono `update_agent` secret replacement path to reuse those service methods instead of editing `agent_default_secrets` directly.

**Tech Stack:** TypeScript, Drizzle ORM query helpers, Vitest

---

### Task 1: Fan out agent secret changes to agent sessions

**Files:**
- Modify: `apps/api/src/services/secrets/service.ts`
- Modify: `apps/api/src/graphql/mutations/attach_secret_to_agent.ts`
- Modify: `apps/api/src/graphql/mutations/detach_secret_from_agent.ts`

**Step 1: Propagate attach**

After attaching a secret to `agent_default_secrets`, add the same secret to every existing session for that agent unless the session already has it.

**Step 2: Propagate detach**

After removing a secret from `agent_default_secrets`, remove it from every existing session for that agent.

**Step 3: Update comments**

Make the mutation/service comments match the new behavior instead of claiming existing sessions remain untouched.

### Task 2: Reuse the propagation path from PI Mono agent management

**Files:**
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/agents/service.ts`

**Step 1: Replace direct table edits**

Have `replaceAgentSecrets` call `SecretService.attachSecretToAgent` and `SecretService.detachSecretFromAgent` through the scoped transaction provider so the same fan-out logic runs there too.

### Task 3: Add focused tests

**Files:**
- Create: `apps/api/tests/secret_service.test.ts`

**Step 1: Test attach propagation**

Assert that attaching a secret to an agent creates the default attachment and missing session attachments for that agent’s existing sessions.

**Step 2: Test detach propagation**

Assert that detaching a secret from an agent removes the default attachment and the propagated session attachments.
