# Terminal Yielding And Timeouts

This document explains how `yield_time_ms` and command timeouts interact in the terminal execution stack.

The most important rule is:

- `yield_time_ms` is a wait budget for the API call.
- provider command timeouts are request budgets for the low-level helper commands that manage tmux.

They are related, but they are not the same thing.

## Short version

When an agent calls `execute_command`, the command does not run as one raw provider SDK call that blocks until completion. Instead, the command is launched inside a tmux session, and the API waits for up to `yield_time_ms` to see whether it finishes.

If the command finishes before the yield deadline:

- the tool returns `completed: true`
- `exitCode` is set
- output includes the command output captured so far

If the command does not finish before the yield deadline:

- the tool returns `completed: false`
- `exitCode` is `null`
- the command keeps running inside tmux
- later tool calls can reuse the same session id and read more output

That means `yield_time_ms` does not kill the command. It only controls when the current tool call gives control back to the model.

## Where `yield_time_ms` enters the system

The terminal tool surface exposes `yield_time_ms` in:

- `apps/api/src/services/agent/tools/terminal/execute_command.ts`
- `apps/api/src/services/agent/tools/terminal/send_input.ts`

It is part of `AgentEnvironmentCommandInput` in:

- `apps/api/src/services/agent/compute/environment_interface.ts`

From there, it flows through:

1. `AgentExecuteCommandTool` or `AgentSendTerminalInputTool`
2. `AgentSessionEnvironment`
3. `AgentEnvironmentTmuxPty`

The leased environment layer does not reinterpret it. `AgentSessionEnvironment` mostly passes it through unchanged.

## What tmux does with it

The main behavior lives in:

- `apps/api/src/services/agent/compute/tmux_pty.ts`

For `executeCommand(...)`, the tmux layer does this:

1. ensures tmux exists
2. creates or reuses a tmux session
3. writes a temporary command file into `/tmp/companyhelm`
4. sends a wrapper command into tmux
5. polls for an rc file that appears when the command exits
6. stops waiting when either:
   - the rc file appears, or
   - the `yield_time_ms` deadline expires
7. captures pane output since the command started

For `sendInput(...)`, the shape is similar, but the wait loop is different:

1. it sends raw terminal input into the existing tmux session
2. it waits up to `yield_time_ms`
3. it considers the interaction completed only if the tmux session itself disappears

That means `send_pty_input` is not really "wait until the foreground process becomes idle". It is "wait until the session exits or the yield deadline expires".

## What timeout means in this stack

There are three different timeout concepts in play.

### 1. Yield timeout: API wait budget

This is `yield_time_ms`.

It answers:

- how long should this tool call wait before returning to the model?

It does not answer:

- how long may the command continue running in tmux?

That distinction is the source of most confusion.

### 2. Remote helper timeout: low-level shell request budget

This is the `timeoutSeconds` value passed through `AgentEnvironmentShellInterface.executeCommand(...)`.

It applies to the low-level shell requests that tmux orchestration issues, such as:

- `tmux has-session`
- `tmux new-session`
- `tmux capture-pane`
- `tmux send-keys`
- rc-file polling
- temp file creation and deletion

It does not directly apply to the user command running inside tmux after the command has already been sent into the shell.

### 3. Provider lifecycle timeout

Some providers also have their own environment lifecycle timeout, separate from the terminal stack.

For example:

- `apps/api/src/services/agent/compute/e2b/e2b_provider.ts` sets a one-hour sandbox timeout for E2B sandbox lifecycle operations

That is not the same as the per-helper command timeout used by `execute_command`.

## How helper timeouts are derived from yield

`AgentEnvironmentTmuxPty` computes an interaction timeout like this:

```text
max(30 seconds, ceil(yield_time_ms / 1000) + 10 seconds)
```

So the helper timeout is always at least:

- 30 seconds minimum, and
- 10 seconds longer than the requested yield window when the yield is longer than 20 seconds

Examples:

- `yield_time_ms = 1_000` => helper timeout is `30s`
- `yield_time_ms = 15_000` => helper timeout is `30s`
- `yield_time_ms = 25_000` => helper timeout is `35s`
- `yield_time_ms = 120_000` => helper timeout is `130s`

This was added so the helper requests that support the waiting loop do not time out before the API has even reached its own yield deadline.

## Why long commands can keep running after the tool returns

The user command itself is started inside tmux by sending a wrapper command into the session. After that point, the command is owned by the remote shell inside tmux, not by the single helper request that launched it.

That is why this works:

1. `execute_command` runs `npm test`
2. the command does not finish within `yield_time_ms`
3. the tool returns `completed: false`
4. `npm test` keeps running in the tmux session
5. a later `read_pty_output` or `send_pty_input` call can continue interacting with it

If this were a single blocking provider SDK command instead of a tmux-backed session, that behavior would not be possible.

## Provider-specific details

The provider shell adapters are:

- `apps/api/src/services/agent/compute/e2b/e2b_shell.ts`

The adapter implements the same low-level shell contract:

- command string
- optional cwd
- optional environment
- optional timeout

### E2B

`AgentComputeE2bShell` maps `timeoutSeconds` to `timeoutMs` in `sandbox.commands.run(...)`.

This is why E2B error messages often mention `timeoutMs`. That field belongs to the provider SDK request, not to the public `execute_command` tool schema.

## Why a provider timeout can still happen even when yield is short

The tmux layer is chatty. One tool call can involve many provider shell requests:

- verify tmux
- verify session
- capture pane
- write command file
- send keys
- poll for rc file
- capture pane again
- delete temp files

If the provider is slow, suspended, or rate-limited, any one of those helper requests can hit its provider timeout.

That is why you can see timeout errors that mention provider request timeouts even though the agent only asked for a short `yield_time_ms`.

## Which terminal operations use yield-derived timeouts

Today, the yield-derived helper timeout is used by:

- `executeCommand(...)`
- `sendInput(...)`

Those are the operations that explicitly wait for a yield window.

Other PTY operations do not take `yield_time_ms`, so they use the default helper timeout instead. In practice, that means operations such as:

- `listSessions()`
- `readOutput()`
- `resizeSession()`
- `killSession()`

still run with the default remote helper timeout unless their internal call sites pass something different.

## Concrete examples

### Example 1: short yield, long command

Input:

```json
{
  "command": "sleep 20 && echo done",
  "yield_time_ms": 1000
}
```

Behavior:

- helper timeout resolves to `30s`
- tmux starts the command
- the API waits about `1s`
- the command is still running
- result returns with `completed: false`
- the command keeps running in tmux

Later, `read_pty_output` can fetch `done` after the command finishes.

### Example 2: long yield, helper timeout stretched above it

Input:

```json
{
  "command": "tail -f /tmp/server.log",
  "yield_time_ms": 120000
}
```

Behavior:

- helper timeout resolves to `130s`
- the API can legitimately wait for up to `120s`
- the helper requests supporting that wait will not time out first unless the provider is unusually slow
- if the session is still alive at `120s`, the tool returns `completed: false`

### Example 3: provider timeout is not command completion

Suppose a helper call such as `tmux capture-pane` or the rc-file polling command exceeds the provider timeout.

That does not necessarily mean:

- the user command failed

It means:

- the API-side attempt to manage or inspect the tmux session exceeded the provider request budget

This is an important debugging distinction.

## Practical debugging rules

When diagnosing terminal behavior:

1. If `completed: false` is returned, treat that as "the yield window elapsed", not "the command timed out".
2. If the error mentions E2B `timeoutMs` or provider request timeout, suspect a low-level helper request, not necessarily the user command itself.
3. If a long command should continue after the tool returns, inspect the tmux session with:
   - `list_pty_sessions`
   - `read_pty_output`
4. If the command should have finished but did not produce an rc file, inspect the tmux shell state rather than assuming the provider killed it.

## Current design intent

The current design intentionally separates:

- command lifetime inside tmux
- API wait lifetime
- provider shell request lifetime

That separation is what allows CompanyHelm agents to:

- return quickly from long-running commands,
- keep shell state alive across tool calls,
- work the same way across E2B environments,
- and avoid coupling the public tool API to provider-specific timeout parameters such as E2B `timeoutMs`.
