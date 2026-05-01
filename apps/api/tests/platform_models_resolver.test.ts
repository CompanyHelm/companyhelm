import assert from "node:assert/strict";
import { test } from "vitest";
import { agentSessions, agents, platformModelRoutes, platformModels } from "../src/db/schema.ts";
import { PlatformModelsQueryResolver } from "../src/graphql/resolvers/platform_models.ts";

/**
 * Models the platform-admin RLS boundary for platform model usage counts. Agent and session rows
 * are only visible after the resolver enables platform admin access on the active transaction.
 */
class PlatformModelsQueryResolverHarness {
  private platformAdminAccessEnabled = false;

  getContext() {
    return {
      isPlatformAdmin: true,
      authSession: {
        user: {
          id: "user-1",
        },
      },
      app_runtime_transaction_provider: {
        transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
          return callback(this.createTransaction());
        },
      },
    } as never;
  }

  private createTransaction() {
    return {
      execute: async () => {
        this.platformAdminAccessEnabled = true;
        return undefined;
      },
      select: () => ({
        from: (table: unknown) => ({
          where: async () => {
            if (table === platformModels) {
              return [{
                createdAt: new Date("2026-04-01T10:00:00.000Z"),
                description: "",
                id: "platform-model-1",
                isAvailable: true,
                isDefault: false,
                key: "companyhelm:gpt-5",
                modelId: "gpt-5",
                modelProvider: "companyhelm",
                name: "GPT-5",
                reasoningLevels: ["medium", "high"],
                reasoningSupported: true,
                updatedAt: new Date("2026-04-01T10:00:00.000Z"),
              }];
            }
            if (table === platformModelRoutes) {
              return [{ platformModelId: "platform-model-1" }];
            }
            if (table === agents) {
              return this.platformAdminAccessEnabled
                ? [{ defaultPlatformModelId: "platform-model-1" }]
                : [];
            }
            if (table === agentSessions) {
              return this.platformAdminAccessEnabled
                ? [{ currentPlatformModelId: "platform-model-1" }]
                : [];
            }

            return [];
          },
        }),
      }),
    };
  }
}

test("PlatformModelsQueryResolver counts agent and session usage with platform admin access", async () => {
  const resolver = new PlatformModelsQueryResolver();
  const harness = new PlatformModelsQueryResolverHarness();

  const models = await resolver.execute(null, null, harness.getContext());

  assert.equal(models[0]?.agentCount, 1);
  assert.equal(models[0]?.sessionCount, 1);
  assert.equal(models[0]?.routeCount, 1);
});
