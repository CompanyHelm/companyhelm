import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaProvider } from "../src/services/agent/compute/daytona/daytona_provider.ts";
import { AgentEnvironmentService } from "../src/services/agent/environment_service.ts";

test("AgentComputeDaytonaProvider returns a lazy sandbox handle without materializing Daytona immediately", async () => {
  const transactionProvider = {} as never;
  const materializeEnvironmentForSession = vi.fn();
  const agentEnvironmentService = {
    materializeEnvironmentForSession,
  } as unknown as AgentEnvironmentService;
  const provider = new AgentComputeDaytonaProvider({
    daytona: {
      api_key: "daytona-api-key",
    },
  } as never, agentEnvironmentService);

  const sandbox = await provider.getSandboxForSession(transactionProvider, "agent-1", "session-1");

  assert.equal(materializeEnvironmentForSession.mock.calls.length, 0);
  assert.deepEqual(sandbox.listTools().map((tool) => tool.name), [
    "list_pty_sessions",
    "execute_command",
    "send_pty_input",
    "read_pty_output",
    "resize_pty",
    "kill_session",
    "close_session",
  ]);
});
