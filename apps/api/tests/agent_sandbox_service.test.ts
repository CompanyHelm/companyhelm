import assert from "node:assert/strict";
import { test } from "vitest";
import { agentSandboxes, agentSessions } from "../src/db/schema.ts";
import { AgentSandboxService } from "../src/services/agent/sandbox_service.ts";

type AgentSandboxRow = {
  agentId: string;
  companyId: string;
  cpuCount: number;
  createdAt: Date;
  currentSessionId: string | null;
  diskSpaceGb: number;
  id: string;
  lastUsedAt: Date | null;
  leaseExpiresAt: Date | null;
  memoryGb: number;
  provider: string;
  providerSandboxId: string;
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
      diskSpaceGb: 20,
      id: "sandbox-1",
      lastUsedAt: new Date("2026-03-26T10:05:00.000Z"),
      leaseExpiresAt: new Date("2099-03-26T10:20:00.000Z"),
      memoryGb: 4,
      provider: "daytona",
      providerSandboxId: "provider-sandbox-1",
      status: "running",
      updatedAt: new Date("2026-03-26T10:05:00.000Z"),
      ...overrides,
    };
  }
}

test("AgentSandboxService refreshes the sandbox already leased to the session", async () => {
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
  const service = new AgentSandboxService();

  const sandbox = await service.materializeSandboxForSession(
    harness.transactionProvider as never,
    "session-1",
    "agent-1",
    "daytona",
    async () => {
      throw new Error("provision callback should not run");
    },
  );

  assert.equal(sandbox.id, "sandbox-1");
  assert.equal(harness.updatedValues.length, 1);
  assert.equal(harness.updatedValues[0]?.currentSessionId, "session-1");
  assert.ok(harness.updatedValues[0]?.leaseExpiresAt instanceof Date);
});

test("AgentSandboxService reclaims an expired provider sandbox for the agent before creating a new one", async () => {
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
  const service = new AgentSandboxService();

  const sandbox = await service.materializeSandboxForSession(
    harness.transactionProvider as never,
    "session-1",
    "agent-1",
    "daytona",
    async () => {
      throw new Error("provision callback should not run");
    },
  );

  assert.equal(sandbox.id, "sandbox-2");
  assert.equal(harness.updatedValues.length, 1);
  assert.equal(harness.updatedValues[0]?.currentSessionId, "session-1");
});

test("AgentSandboxService provisions and persists a new provider sandbox when nothing reusable exists", async () => {
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
  const provisionSandbox = async (context: {
    agentId: string;
    companyId: string;
    sessionId: string;
  }) => {
    assert.deepEqual(context, {
      agentId: "agent-1",
      companyId: "company-1",
      sessionId: "session-1",
    });

    return {
      cpuCount: 2,
      diskSpaceGb: 20,
      memoryGb: 4,
      providerSandboxId: "provider-sandbox-created",
      status: "running" as const,
    };
  };
  const service = new AgentSandboxService();

  const sandbox = await service.materializeSandboxForSession(
    harness.transactionProvider as never,
    "session-1",
    "agent-1",
    "daytona",
    provisionSandbox,
  );

  assert.equal(sandbox.providerSandboxId, "provider-sandbox-1");
  assert.equal(harness.insertedValues.length, 1);
  assert.equal(harness.insertedValues[0]?.agentId, "agent-1");
  assert.equal(harness.insertedValues[0]?.companyId, "company-1");
  assert.equal(harness.insertedValues[0]?.currentSessionId, "session-1");
  assert.equal(harness.insertedValues[0]?.provider, "daytona");
  assert.equal(harness.insertedValues[0]?.providerSandboxId, "provider-sandbox-created");
});

test("AgentSandboxService updates persisted sandbox runtime state generically", async () => {
  const harness = AgentSandboxServiceTestHarness.create();
  const updatedSandbox = AgentSandboxServiceTestHarness.createSandboxRow({
    cpuCount: 4,
    diskSpaceGb: 30,
    memoryGb: 8,
    status: "stopped",
  });
  harness.updatePlans.push({
    rows: [updatedSandbox],
    table: agentSandboxes,
  });
  const service = new AgentSandboxService();

  const sandbox = await service.updateSandboxRuntimeState(
    harness.transactionProvider as never,
    "sandbox-1",
    {
      cpuCount: 4,
      diskSpaceGb: 30,
      memoryGb: 8,
      status: "stopped",
    },
  );

  assert.equal(sandbox.cpuCount, 4);
  assert.equal(sandbox.diskSpaceGb, 30);
  assert.equal(sandbox.memoryGb, 8);
  assert.equal(sandbox.status, "stopped");
  assert.equal(harness.updatedValues.length, 1);
});
