import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentEnvironmentRequirementsService } from "../src/services/agent/environment/requirements_service.ts";

test("AgentEnvironmentRequirementsService falls back to the default minimum compute shape when the agent has no persisted requirements", async () => {
  let selectCallCount = 0;
  const service = new AgentEnvironmentRequirementsService();

  const requirements = await service.getRequirements({
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback({
        select() {
          selectCallCount += 1;
          if (selectCallCount === 1) {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      id: "agent-1",
                    }];
                  },
                };
              },
            };
          }

          if (selectCallCount === 2) {
            return {
              from() {
                return {
                  async where() {
                    return [];
                  },
                };
              },
            };
          }

          throw new Error(`Unexpected select call: ${selectCallCount}`);
        },
      });
    },
  } as never, "company-1", "agent-1");

  assert.deepEqual(requirements, {
    minCpuCount: 1,
    minDiskSpaceGb: 10,
    minMemoryGb: 3,
  });
});

test("AgentEnvironmentRequirementsService creates requirements on the first update", async () => {
  const insertedValues: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;
  const service = new AgentEnvironmentRequirementsService();

  const requirements = await service.updateRequirements({
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback({
        insert() {
          return {
            values(value: Record<string, unknown>) {
              insertedValues.push(value);
              return {
                async returning() {
                  return [{
                    ...value,
                    createdAt: value.createdAt,
                    id: "requirements-1",
                    updatedAt: value.updatedAt,
                  }];
                },
              };
            },
          };
        },
        select() {
          selectCallCount += 1;
          if (selectCallCount === 1) {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      id: "agent-1",
                    }];
                  },
                };
              },
            };
          }

          if (selectCallCount === 2) {
            return {
              from() {
                return {
                  async where() {
                    return [];
                  },
                };
              },
            };
          }

          throw new Error(`Unexpected select call: ${selectCallCount}`);
        },
        update() {
          throw new Error("update should not be used for the first write");
        },
      });
    },
  } as never, {
    agentId: "agent-1",
    companyId: "company-1",
    minCpuCount: 6,
    minDiskSpaceGb: 120,
    minMemoryGb: 24,
  });

  assert.deepEqual(requirements, {
    minCpuCount: 6,
    minDiskSpaceGb: 120,
    minMemoryGb: 24,
  });
  assert.equal(insertedValues.length, 1);
  assert.equal(insertedValues[0]?.minCpuCount, 6);
});
