# PTY Lifecycle Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move PTY management to an explicit durable lifecycle with `pty_create`, `pty_exec`, `pty_list`, and `pty_kill`, where PTYs are named by caller-supplied `pty_id` values and are never implicitly created or auto-garbage-collected.

**Architecture:** The tmux PTY provider becomes strict about PTY existence: creation happens only through a new create method, command execution requires an existing PTY, and kill is the only teardown path. The PI Mono terminal tool layer mirrors that model by switching every PTY-facing parameter and response from session-oriented naming to PTY-oriented naming.

**Tech Stack:** TypeScript, tmux-backed PTY provider, PI Mono tool definitions, Vitest, ESLint.

---

### Task 1: Convert the PTY provider contract to explicit named PTYs

**Files:**
- Modify: `apps/api/src/services/environments/providers/environment_interface.ts`
- Modify: `apps/api/src/services/environments/providers/pty_interface.ts`
- Modify: `apps/api/src/services/environments/session_environment.ts`
- Modify: `apps/api/src/services/environments/providers/tmux_pty.ts`
- Test: `apps/api/tests/agent_environment_tmux_pty.test.ts`
- Test: `apps/api/tests/session_environment.test.ts`

**Step 1:** Add provider-level PTY types and methods for `createPty`, `listPtys`, `readPtyOutput`, `resizePty`, `killPty`, and `ptyId`-based command execution.

**Step 2:** Remove implicit PTY id generation and the old auto-close logic from the tmux provider.

**Step 3:** Make `executeCommand` fail when the target PTY does not exist and add a dedicated create path.

**Step 4:** Update the PTY tests to reflect explicit creation, durable PTYs, and `pty_id` naming.

### Task 2: Align the PI Mono tool catalog with the new PTY lifecycle

**Files:**
- Create: `apps/api/src/services/agent/session/pi-mono/tools/terminal/pty_create.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/pty_exec.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/pty_list_sessions.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/pty_send_input.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/pty_read_output.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/pty_resize.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/pty_kill.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/provider.ts`
- Modify: `apps/api/src/services/agent/session/pi-mono/tools/terminal/result_formatter.ts`
- Test: `apps/api/tests/execute_command_tool.test.ts`
- Test: `apps/api/tests/exec_bash_tool.test.ts`
- Test: `apps/api/tests/pi_mono_tools_service.test.ts`
- Test: `apps/api/tests/pi_agent_session_manager_service.test.ts`
- Test: `apps/api/tests/pi_mono_session_event_handler.test.ts`

**Step 1:** Add `pty_create` with required `pty_id`.

**Step 2:** Rename `pty_list_sessions` to `pty_list` and switch PTY tool parameters/details to `pty_id`.

**Step 3:** Remove `keepSession`, creation-oriented width/height fields, and any session terminology from `pty_exec`.

**Step 4:** Update tool ordering and the event-handler expectations for the new tool names and payload shape.

### Task 3: Run focused verification and commit

**Files:**
- Verify: touched PTY/provider/tool files and tests

**Step 1:** Run focused ESLint on the modified API files and tests.

**Step 2:** Run focused Vitest coverage for the PTY provider, PTY tool definitions, and PI Mono tool catalog/session manager tests.

**Step 3:** Run `git diff --check`.

**Step 4:** Commit the validated change set.
