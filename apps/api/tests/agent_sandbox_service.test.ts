import assert from "node:assert/strict";
import { beforeEach, test, vi } from "vitest";
import { agentSandboxes, agentSessions } from "../src/db/schema.ts";
import { AgentSandboxService } from "../src/services/agent/sandbox_service.ts";

const daytonaMocks = vi.hoisted(() => ({
  configs: [] as Array<Record<string, unknown>>,
  createMock: vi.fn(),
  deleteMock: vi.fn(async () => undefined),
  getMock: vi.fn(),
  refreshDataMock: vi.fn(async () => undefined),
  startMock: vi.fn(async () => undefined),
}));

vi.mock("@daytonaio/sdk", () => ({
  Daytona: class MockDaytona {
    constructor(config: Record<string, unknown>) {
      daytonaMocks.configs.push(config);
    }

    create = daytonaMocks.createMock;
    get = daytonaMocks.getMock;
  },
}));

type AgentSandboxRow = {
  agentId: string;
  companyId: string;
  cpuCount: number;
  createdAt: Date;
  currentSessionId: string | null;
  daytonaSandboxId: string;
  diskSpaceGb: number;
  id: string;
  lastUsedAt: Date | null;
  leaseExpiresAt: Date | null;
  memoryGb: number;
  status: string;
  updatedAt: Date;
};

class AgentSandboxServiceTestHarness {
  static create() {
    const selectPlans: Array<{ rows: Array<Record<string, unknown>>; table: unknown }> = [];
    const updatePlans: Array<{ rows: Array<Record<string, unknown>>; table: unknown }> = [];
    const insertPlans: Array<{ rows: Array<Record<string, unknown>>; table: unknown }> = [];
    const updatedValues: Array<Record<string, unknown>> = [];
    const insertedValues: Array<Record<string, unknown>> = [];

    return {
      insertPlans,
      insertedValues,
      selectPlans,
      transactionProvider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            insert(table: unknown) {
              const plan = insertPlans.shift();
              assert.ok(plan);
              assert.equal(table, plan.table);
              return {
                values(value: Record<string, unknown>) {
                  insertedValues.push(value);
                  return {
                    async returning() {
                      return plan.rows;
                    },
                  };
                },
              };
            },
            select() {
              return {
                from(table: unknown) {
                  const plan = selectPlans.shift();
                  assert.ok(plan);
                  assert.equal(table, plan.table);
                  return {
                    async where() {
                      return plan.rows;
                    },
                  };
                },
              };
            },
            update(table: unknown) {
              const plan = updatePlans.shift();
              assert.ok(plan);
              assert.equal(table, plan.table);
              return {
                set(value: Record<string, unknown>) {
                  updatedValues.push(value);
                  return {
                    where() {
                      return {
                        async returning() {
                          return plan.rows;
                        },
                      };
                    },
                  };
                },
              };
            },
          });
        },
      },
      updatePlans,
      updatedValues,
    };
  }

  static createSandboxRow(overrides?: Partial<AgentSandboxRow>): AgentSandboxRow {
    return {
      agentId: "agent-1",
      companyId: "company-1",
      cpuCount: 2,
      createdAt: new Date("2026-03-26T10:00:00.000Z"),
      currentSessionId: "session-1",
      daytonaSandboxId: "daytona-1",
      diskSpaceGb: 20,
      id: "sandbox-1",
      lastUsedAt: new Date("2026-03-26T10:05:00.000Z"),
      leaseExpiresAt: new Date("2099-03-26T10:20:00.000Z"),
      memoryGb: 4,
      status: "running",
      updatedAt: new Date("2026-03-26T10:05:00.000Z"),
      ...overrides,
    };
  }
}

beforeEach(() => {
  daytonaMocks.configs.length = 0;
  daytonaMocks.createMock.mockReset();
  daytonaMocks.deleteMock.mockReset();
  daytonaMocks.getMock.mockReset();
  daytonaMocks.refreshDataMock.mockReset();
  daytonaMocks.startMock.mockReset();
});

test("AgentSandboxService refreshes and returns the sandbox already leased to the session", async () => {
  const harness = AgentSandboxServiceTestHarness.create();
  const leasedSandbox = AgentSandboxServiceTestHarness.createSandboxRow();
  const refreshedSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    leaseExpiresAt: new Date("2099-03-26T10:35:00.000Z"),
    updatedAt: new Date("2026-03-26T10:20:00.000Z"),
  });
  harness.selectPlans.push(
    {
      rows: [{
        agentId: "agent-1",
        companyId: "company-1",
        id: "session-1",
      }],
      table: agentSessions,
    },
    {
      rows: [leasedSandbox],
      table: agentSandboxes,
    },
  );
  harness.updatePlans.push({
    rows: [refreshedSandbox],
    table: agentSandboxes,
  });
  const service = new AgentSandboxService({
    daytona: {
      api_key: "daytona-api-key",
    },
  } as never);

  const sandbox = await service.getSandboxForSession(harness.transactionProvider as never, "session-1", "agent-1");

  assert.equal(sandbox.id, "sandbox-1");
  assert.equal(daytonaMocks.createMock.mock.calls.length, 0);
  assert.equal(daytonaMocks.getMock.mock.calls.length, 0);
  assert.equal(harness.updatedValues.length, 1);
  assert.equal(harness.updatedValues[0]?.currentSessionId, "session-1");
  assert.ok(harness.updatedValues[0]?.leaseExpiresAt instanceof Date);
});

test("AgentSandboxService reclaims an expired running sandbox for the agent before creating a new one", async () => {
  const harness = AgentSandboxServiceTestHarness.create();
  const reusableSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    currentSessionId: "other-session",
    id: "sandbox-2",
    leaseExpiresAt: new Date("2020-03-26T10:20:00.000Z"),
  });
  const claimedSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    currentSessionId: "session-1",
    id: "sandbox-2",
    leaseExpiresAt: new Date("2099-03-26T10:40:00.000Z"),
  });
  harness.selectPlans.push(
    {
      rows: [{
        agentId: "agent-1",
        companyId: "company-1",
        id: "session-1",
      }],
      table: agentSessions,
    },
    {
      rows: [],
      table: agentSandboxes,
    },
    {
      rows: [reusableSandbox],
      table: agentSandboxes,
    },
  );
  harness.updatePlans.push({
    rows: [claimedSandbox],
    table: agentSandboxes,
  });
  const service = new AgentSandboxService({
    daytona: {
      api_key: "daytona-api-key",
    },
  } as never);

  const sandbox = await service.getSandboxForSession(harness.transactionProvider as never, "session-1", "agent-1");

  assert.equal(sandbox.id, "sandbox-2");
  assert.equal(daytonaMocks.createMock.mock.calls.length, 0);
  assert.equal(daytonaMocks.getMock.mock.calls.length, 0);
  assert.equal(harness.updatedValues.length, 1);
  assert.equal(harness.updatedValues[0]?.currentSessionId, "session-1");
});

test("AgentSandboxService starts a claimed stopped sandbox before returning it", async () => {
  const harness = AgentSandboxServiceTestHarness.create();
  const stoppedSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    currentSessionId: null,
    id: "sandbox-3",
    leaseExpiresAt: null,
    status: "stopped",
  });
  const claimedStoppedSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    currentSessionId: "session-1",
    id: "sandbox-3",
    leaseExpiresAt: new Date("2099-03-26T10:40:00.000Z"),
    status: "stopped",
  });
  const runningSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    currentSessionId: "session-1",
    cpuCount: 4,
    diskSpaceGb: 30,
    id: "sandbox-3",
    memoryGb: 8,
    status: "running",
  });
  harness.selectPlans.push(
    {
      rows: [{
        agentId: "agent-1",
        companyId: "company-1",
        id: "session-1",
      }],
      table: agentSessions,
    },
    {
      rows: [],
      table: agentSandboxes,
    },
    {
      rows: [stoppedSandbox],
      table: agentSandboxes,
    },
  );
  harness.updatePlans.push(
    {
      rows: [claimedStoppedSandbox],
      table: agentSandboxes,
    },
    {
      rows: [runningSandbox],
      table: agentSandboxes,
    },
  );
  daytonaMocks.getMock.mockResolvedValue({
    cpu: 4,
    disk: 30,
    memory: 8,
    refreshData: daytonaMocks.refreshDataMock,
    start: daytonaMocks.startMock,
  });
  const service = new AgentSandboxService({
    daytona: {
      api_key: "daytona-api-key",
    },
  } as never);

  const sandbox = await service.getSandboxForSession(harness.transactionProvider as never, "session-1", "agent-1");

  assert.equal(sandbox.status, "running");
  assert.deepEqual(daytonaMocks.getMock.mock.calls, [["daytona-1"]]);
  assert.equal(daytonaMocks.startMock.mock.calls.length, 1);
  assert.equal(daytonaMocks.refreshDataMock.mock.calls.length, 1);
  assert.equal(harness.updatedValues.length, 2);
  assert.equal(harness.updatedValues[1]?.status, "running");
  assert.equal(harness.updatedValues[1]?.cpuCount, 4);
});

test("AgentSandboxService creates and persists a new Daytona sandbox when nothing reusable exists", async () => {
  const harness = AgentSandboxServiceTestHarness.create();
  const createdSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    currentSessionId: "session-1",
  });
  harness.selectPlans.push(
    {
      rows: [{
        agentId: "agent-1",
        companyId: "company-1",
        id: "session-1",
      }],
      table: agentSessions,
    },
    {
      rows: [],
      table: agentSandboxes,
    },
    {
      rows: [],
      table: agentSandboxes,
    },
  );
  harness.insertPlans.push({
    rows: [createdSandbox],
    table: agentSandboxes,
  });
  daytonaMocks.createMock.mockResolvedValue({
    cpu: 2,
    delete: daytonaMocks.deleteMock,
    disk: 20,
    id: "daytona-created",
    memory: 4,
  });
  const service = new AgentSandboxService({
    daytona: {
      api_key: "daytona-api-key",
    },
  } as never);

  const sandbox = await service.getSandboxForSession(harness.transactionProvider as never, "session-1", "agent-1");

  assert.equal(sandbox.daytonaSandboxId, "daytona-1");
  assert.equal(daytonaMocks.configs.length, 1);
  assert.deepEqual(daytonaMocks.configs[0], {
    apiKey: "daytona-api-key",
  });
  assert.deepEqual(daytonaMocks.createMock.mock.calls, [[{
    image: "node:20-slim",
    resources: {
      cpu: 2,
      disk: 20,
      memory: 4,
    },
  }]]);
  assert.equal(harness.insertedValues.length, 1);
  assert.equal(harness.insertedValues[0]?.agentId, "agent-1");
  assert.equal(harness.insertedValues[0]?.companyId, "company-1");
  assert.equal(harness.insertedValues[0]?.currentSessionId, "session-1");
  assert.equal(harness.insertedValues[0]?.daytonaSandboxId, "daytona-created");
});
