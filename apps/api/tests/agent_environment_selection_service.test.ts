import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentEnvironmentSelectionService } from "../src/services/agent/environment/selection_service.ts";

test("AgentEnvironmentSelectionService skips unhealthy environments and falls back to the next reusable lease-history candidate", async () => {
  const getEnvironmentStatus = vi.fn(async (_transactionProvider, environment: { id: string }) => {
    return environment.id === "environment-1" ? "unhealthy" : "stopped";
  });
  const service = new AgentEnvironmentSelectionService(
    {
      async loadEnvironmentsByIds() {
        return [{
          agentId: "agent-1",
          companyId: "company-1",
          cpuCount: 2,
          createdAt: new Date("2026-03-27T20:00:00.000Z"),
          diskSpaceGb: 20,
          displayName: null,
          id: "environment-1",
          lastSeenAt: null,
          memoryGb: 4,
          metadata: {},
          platform: "linux",
          provider: "daytona",
          providerEnvironmentId: "daytona-environment-1",
          updatedAt: new Date("2026-03-27T20:00:00.000Z"),
        }, {
          agentId: "agent-1",
          companyId: "company-1",
          cpuCount: 2,
          createdAt: new Date("2026-03-27T20:00:00.000Z"),
          diskSpaceGb: 20,
          displayName: null,
          id: "environment-2",
          lastSeenAt: null,
          memoryGb: 4,
          metadata: {},
          platform: "linux",
          provider: "daytona",
          providerEnvironmentId: "daytona-environment-2",
          updatedAt: new Date("2026-03-27T20:00:00.000Z"),
        }];
      },
    } as never,
    {
      async listAgentLeaseHistory() {
        return [{
          environmentId: "environment-1",
        }, {
          environmentId: "environment-2",
        }];
      },
      async listOpenLeasesForEnvironments() {
        return [];
      },
      async listSessionLeaseHistory() {
        return [{
          environmentId: "environment-1",
        }];
      },
    } as never,
    {
      getEnvironmentStatus,
    } as never,
  );

  const environment = await service.findReusableEnvironmentForAgentSession(
    {} as never,
    "agent-1",
    "daytona",
    "session-1",
  );

  assert.equal(environment?.id, "environment-2");
  assert.deepEqual(getEnvironmentStatus.mock.calls.map((call) => call[1]?.id), [
    "environment-1",
    "environment-1",
    "environment-2",
  ]);
});
