import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentComputeDaytonaProvider } from "../src/services/agent/compute/daytona/daytona_provider.ts";
import { AgentSandboxService } from "../src/services/agent/sandbox_service.ts";

test("AgentComputeDaytonaProvider returns a lazy sandbox handle without materializing Daytona immediately", async () => {
  const transactionProvider = {} as never;
  const materializeSandboxForSession = vi.fn();
  const agentSandboxService = {
    materializeSandboxForSession,
  } as unknown as AgentSandboxService;
  const provider = new AgentComputeDaytonaProvider({
    daytona: {
      api_key: "daytona-api-key",
    },
  } as never, agentSandboxService);

  const sandbox = await provider.getSandboxForSession(transactionProvider, "agent-1", "session-1");

  assert.equal(materializeSandboxForSession.mock.calls.length, 0);
  assert.deepEqual(sandbox.listTools().map((tool) => tool.name), [
    "execute_command",
    "send_pty_input",
    "read_pty_output",
    "resize_pty",
    "kill_session",
    "close_session",
  ]);
});
