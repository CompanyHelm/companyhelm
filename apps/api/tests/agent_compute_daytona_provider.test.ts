import assert from "node:assert/strict";
import { test, vi } from "vitest";
import type { AgentSandboxRecord } from "../src/services/agent/sandbox_service.ts";
import { AgentComputeDaytonaProvider } from "../src/services/agent/compute/daytona/daytona_provider.ts";
import { AgentSandboxService } from "../src/services/agent/sandbox_service.ts";

test("AgentComputeDaytonaProvider returns a sandbox interface for the leased Daytona sandbox", async () => {
  const transactionProvider = {} as never;
  const sandboxRecord: AgentSandboxRecord = {
    agentId: "agent-1",
    companyId: "company-1",
    cpuCount: 2,
    createdAt: new Date("2026-03-27T18:00:00.000Z"),
    currentSessionId: "session-1",
    daytonaSandboxId: "daytona-1",
    diskSpaceGb: 20,
    id: "sandbox-1",
    lastUsedAt: new Date("2026-03-27T18:05:00.000Z"),
    leaseExpiresAt: new Date("2026-03-27T18:20:00.000Z"),
    memoryGb: 4,
    status: "running",
    updatedAt: new Date("2026-03-27T18:05:00.000Z"),
  };
  const getSandboxForSession = vi.fn(async (
    receivedTransactionProvider: unknown,
    receivedSessionId: string,
    receivedAgentId: string,
  ) => {
    assert.equal(receivedTransactionProvider, transactionProvider);
    assert.equal(receivedSessionId, "session-1");
    assert.equal(receivedAgentId, "agent-1");
    return sandboxRecord;
  });
  const agentSandboxService = {
    getSandboxForSession,
  } as unknown as AgentSandboxService;
  const provider = new AgentComputeDaytonaProvider(agentSandboxService);

  const sandbox = await provider.getSandboxForSession(transactionProvider, "agent-1", "session-1");

  assert.equal(getSandboxForSession.mock.calls.length, 1);
  assert.equal(sandbox.getId(), "sandbox-1");
  assert.equal(sandbox.getRuntimeId(), "daytona-1");
  assert.equal(sandbox.getStatus(), "running");
});
