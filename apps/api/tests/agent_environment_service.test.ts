import assert from "node:assert/strict";
import { test } from "vitest";
import { agentEnvironments, agentSessions } from "../src/db/schema.ts";
import { AgentEnvironmentService } from "../src/services/agent/environment_service.ts";

type AgentEnvironmentRow = {
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
  providerEnvironmentId: string;
  status: string;
  updatedAt: Date;
};

class AgentEnvironmentServiceTestHarness {
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

  static createEnvironmentRow(overrides?: Partial<AgentEnvironmentRow>): AgentEnvironmentRow {
    return {
      agentId: "agent-1",
      companyId: "company-1",
      cpuCount: 2,
      createdAt: new Date("2026-03-26T10:00:00.000Z"),
      currentSessionId: "session-1",
      diskSpaceGb: 20,
      id: "environment-1",
      lastUsedAt: new Date("2026-03-26T10:05:00.000Z"),
      leaseExpiresAt: new Date("2099-03-26T10:20:00.000Z"),
      memoryGb: 4,
      provider: "daytona",
      providerEnvironmentId: "provider-environment-1",
      status: "running",
      updatedAt: new Date("2026-03-26T10:05:00.000Z"),
      ...overrides,
    };
  }
}

test("AgentEnvironmentService refreshes the environment already leased to the session", async () => {
  const harness = AgentEnvironmentServiceTestHarness.create();
  const leasedEnvironment = AgentEnvironmentServiceTestHarness.createEnvironmentRow();
  const refreshedEnvironment = AgentEnvironmentServiceTestHarness.createEnvironmentRow({
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
      rows: [leasedEnvironment],
      table: agentEnvironments,
    },
  );
  harness.updatePlans.push({
    rows: [refreshedEnvironment],
    table: agentEnvironments,
  });
  const service = new AgentEnvironmentService();

  const environment = await service.materializeEnvironmentForSession(
    harness.transactionProvider as never,
    "session-1",
    "agent-1",
    "daytona",
    async () => {
      throw new Error("provision callback should not run");
    },
  );

  assert.equal(environment.id, "environment-1");
  assert.equal(harness.updatedValues.length, 1);
  assert.equal(harness.updatedValues[0]?.currentSessionId, "session-1");
  assert.ok(harness.updatedValues[0]?.leaseExpiresAt instanceof Date);
});

test("AgentEnvironmentService reclaims an expired provider environment for the agent before creating a new one", async () => {
  const harness = AgentEnvironmentServiceTestHarness.create();
  const reusableEnvironment = AgentEnvironmentServiceTestHarness.createEnvironmentRow({
    currentSessionId: "other-session",
    id: "environment-2",
    leaseExpiresAt: new Date("2020-03-26T10:20:00.000Z"),
  });
  const claimedEnvironment = AgentEnvironmentServiceTestHarness.createEnvironmentRow({
    currentSessionId: "session-1",
    id: "environment-2",
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
      table: agentEnvironments,
    },
    {
      rows: [reusableEnvironment],
      table: agentEnvironments,
    },
  );
  harness.updatePlans.push({
    rows: [claimedEnvironment],
    table: agentEnvironments,
  });
  const service = new AgentEnvironmentService();

  const environment = await service.materializeEnvironmentForSession(
    harness.transactionProvider as never,
    "session-1",
    "agent-1",
    "daytona",
    async () => {
      throw new Error("provision callback should not run");
    },
  );

  assert.equal(environment.id, "environment-2");
  assert.equal(harness.updatedValues.length, 1);
  assert.equal(harness.updatedValues[0]?.currentSessionId, "session-1");
});

test("AgentEnvironmentService provisions and persists a new provider environment when nothing reusable exists", async () => {
  const harness = AgentEnvironmentServiceTestHarness.create();
  const createdEnvironment = AgentEnvironmentServiceTestHarness.createEnvironmentRow({
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
      table: agentEnvironments,
    },
    {
      rows: [],
      table: agentEnvironments,
    },
  );
  harness.insertPlans.push({
    rows: [createdEnvironment],
    table: agentEnvironments,
  });
  const provisionEnvironment = async (context: {
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
      providerEnvironmentId: "provider-environment-created",
      status: "running" as const,
    };
  };
  const service = new AgentEnvironmentService();

  const environment = await service.materializeEnvironmentForSession(
    harness.transactionProvider as never,
    "session-1",
    "agent-1",
    "daytona",
    provisionEnvironment,
  );

  assert.equal(environment.providerEnvironmentId, "provider-environment-1");
  assert.equal(harness.insertedValues.length, 1);
  assert.equal(harness.insertedValues[0]?.agentId, "agent-1");
  assert.equal(harness.insertedValues[0]?.companyId, "company-1");
  assert.equal(harness.insertedValues[0]?.currentSessionId, "session-1");
  assert.equal(harness.insertedValues[0]?.provider, "daytona");
  assert.equal(harness.insertedValues[0]?.providerEnvironmentId, "provider-environment-created");
});

test("AgentEnvironmentService updates persisted environment runtime state generically", async () => {
  const harness = AgentEnvironmentServiceTestHarness.create();
  const updatedEnvironment = AgentEnvironmentServiceTestHarness.createEnvironmentRow({
    cpuCount: 4,
    diskSpaceGb: 30,
    memoryGb: 8,
    status: "stopped",
  });
  harness.updatePlans.push({
    rows: [updatedEnvironment],
    table: agentEnvironments,
  });
  const service = new AgentEnvironmentService();

  const environment = await service.updateEnvironmentRuntimeState(
    harness.transactionProvider as never,
    "environment-1",
    {
      cpuCount: 4,
      diskSpaceGb: 30,
      memoryGb: 8,
      status: "stopped",
    },
  );

  assert.equal(environment.cpuCount, 4);
  assert.equal(environment.diskSpaceGb, 30);
  assert.equal(environment.memoryGb, 8);
  assert.equal(environment.status, "stopped");
  assert.equal(harness.updatedValues.length, 1);
});

test("AgentEnvironmentService releases the environment lease for the completed session", async () => {
  const harness = AgentEnvironmentServiceTestHarness.create();
  harness.updatePlans.push({
    rows: [],
    table: agentEnvironments,
  });
  const service = new AgentEnvironmentService();

  await service.releaseEnvironmentForSession(
    harness.transactionProvider as never,
    "environment-1",
    "session-1",
  );

  assert.equal(harness.updatedValues.length, 1);
  assert.equal(harness.updatedValues[0]?.currentSessionId, null);
  assert.equal(harness.updatedValues[0]?.leaseExpiresAt, null);
  assert.ok(harness.updatedValues[0]?.updatedAt instanceof Date);
});
