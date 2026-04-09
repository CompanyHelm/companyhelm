import assert from "node:assert/strict";
import { test } from "vitest";
import { agentDefaultSecrets, agentSessionSecrets } from "../src/db/schema.ts";
import { SecretService } from "../src/services/secrets/service.ts";

test("SecretService attachSecretToAgent copies the secret to existing agent sessions", async () => {
  const insertedAgentDefaultValues: Array<Record<string, unknown>> = [];
  const insertedSessionValues: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;
  const transaction = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              async where() {
                return [{ id: "agent-1" }];
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
                return [{
                  companyId: "company-1",
                  createdAt: new Date("2026-04-08T18:00:00.000Z"),
                  description: "Deploy token",
                  envVarName: "DEPLOY_TOKEN",
                  id: "secret-1",
                  name: "Deploy token",
                  updatedAt: new Date("2026-04-08T18:00:00.000Z"),
                }];
              },
            };
          },
        };
      }

      if (selectCallCount === 3) {
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

      if (selectCallCount === 4) {
        return {
          from() {
            return {
              async where() {
                return [{ id: "session-1" }, { id: "session-2" }];
              },
            };
          },
        };
      }

      if (selectCallCount === 5) {
        return {
          from() {
            return {
              async where() {
                return [{ sessionId: "session-1" }];
              },
            };
          },
        };
      }

      throw new Error("Unexpected select call.");
    },
    insert(table: unknown) {
      return {
        async values(value: Record<string, unknown>) {
          if (table === agentDefaultSecrets) {
            insertedAgentDefaultValues.push(value);
            return undefined;
          }
          if (table === agentSessionSecrets) {
            insertedSessionValues.push(value);
            return undefined;
          }

          throw new Error("Unexpected insert table.");
        },
      };
    },
  };
  const service = new SecretService({} as never);

  const secret = await service.attachSecretToAgent({
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback(transaction);
    },
  } as never, {
    agentId: "agent-1",
    companyId: "company-1",
    secretId: "secret-1",
    userId: "user-1",
  });

  assert.equal(secret.id, "secret-1");
  assert.deepEqual(insertedAgentDefaultValues, [{
    agentId: "agent-1",
    companyId: "company-1",
    createdAt: insertedAgentDefaultValues[0]?.createdAt,
    createdByUserId: "user-1",
    secretId: "secret-1",
  }]);
  assert.deepEqual(insertedSessionValues, [{
    companyId: "company-1",
    createdAt: insertedSessionValues[0]?.createdAt,
    createdByUserId: "user-1",
    secretId: "secret-1",
    sessionId: "session-2",
  }]);
});

test("SecretService detachSecretFromAgent removes the secret from existing agent sessions", async () => {
  const deleteTables: unknown[] = [];
  let selectCallCount = 0;
  const transaction = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              async where() {
                return [{ id: "agent-1" }];
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
                return [{
                  companyId: "company-1",
                  createdAt: new Date("2026-04-08T18:00:00.000Z"),
                  description: "Deploy token",
                  envVarName: "DEPLOY_TOKEN",
                  id: "secret-1",
                  name: "Deploy token",
                  updatedAt: new Date("2026-04-08T18:00:00.000Z"),
                }];
              },
            };
          },
        };
      }

      if (selectCallCount === 3) {
        return {
          from() {
            return {
              async where() {
                return [{ id: "session-1" }, { id: "session-2" }];
              },
            };
          },
        };
      }

      throw new Error("Unexpected select call.");
    },
    delete(table: unknown) {
      deleteTables.push(table);
      return {
        where() {
          return {
            async returning() {
              if (table === agentDefaultSecrets) {
                return [{ secretId: "secret-1" }];
              }

              return [];
            },
          };
        },
      };
    },
  };
  const service = new SecretService({} as never);

  const secret = await service.detachSecretFromAgent({
    async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
      return callback(transaction);
    },
  } as never, "company-1", "agent-1", "secret-1");

  assert.equal(secret.id, "secret-1");
  assert.deepEqual(deleteTables, [agentDefaultSecrets, agentSessionSecrets]);
});
