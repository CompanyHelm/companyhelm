# Read Secret Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a session-scoped `read_secret` PI Mono tool that can return one attached secret’s plaintext value while discouraging routine use in favor of environment variables.

**Architecture:** Reuse the existing session secret attachment and environment-variable resolution flow in the secret tool service. Keep plaintext out of transcript content by returning only a warning/summary in `content` and placing the raw value in tool `details`.

**Tech Stack:** TypeScript, PI Mono tool definitions, Vitest

---

### Task 1: Add session-scoped plaintext secret lookup

**Files:**
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/secrets/service.ts`
- Create: `apps/api/src/services/agent/session/pi-mono/tools/secrets/read.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/secrets/provider.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/secrets/result_formatter.ts`

**Step 1: Add a service method for one attached secret**

Expose `readAssignedSecret(envVarName)` using existing session attachment metadata plus decrypted environment variable resolution.

**Step 2: Add the tool definition**

Create `read_secret` with a required `envVarName` parameter and prompt guidance that strongly prefers using secrets through `pty_exec`, `bash_exec`, or `gh_exec`.

**Step 3: Keep transcript content non-sensitive**

Return a short warning/summary in `content` and the actual plaintext value only in `details`.

### Task 2: Update catalog tests

**Files:**
- Modify: `apps/api/tests/agent_secret_tools.test.ts`
- Modify: `apps/api/tests/pi_mono_tools_service.test.ts`
- Modify: `apps/api/tests/pi_agent_session_manager_service.test.ts`

**Step 1: Add focused tool coverage**

Assert the provider exposes `read_secret` and that the tool keeps plaintext out of `content`.

**Step 2: Update tool-order expectations**

Insert `read_secret` into the secret tool section of the PI Mono catalog expectations.
