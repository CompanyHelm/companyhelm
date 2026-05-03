import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { EnvironmentQueryResolver } from "../src/graphql/resolvers/environment.ts";
import { AgentEnvironmentDetailService } from "../src/services/environments/detail_service.ts";

test("EnvironmentQueryResolver returns unknown status plus an error message when live status lookup fails", async () => {
  const detailService = new AgentEnvironmentDetailService(
    {
      async loadEnvironmentById() {
        return {
          agentId: "agent-1",
          companyId: "company-123",
          cpuCount: 4,
          cpuUsedPct: null,
          createdAt: new Date("2026-03-26T09:00:00.000Z"),
          diskSpaceGb: 120,
          diskUsedBytes: null,
          displayName: "Research Ubuntu Box",
          id: "env-1",
          lastSeenAt: new Date("2026-03-27T15:00:00.000Z"),
          memoryGb: 16,
          memUsedBytes: null,
          metadata: {},
          metricsSampledAt: null,
          platform: "linux" as const,
          provider: "e2b" as const,
          providerDefinitionId: "definition-1",
          providerEnvironmentId: "e2b-env-1",
          templateId: "e2b/desktop",
          updatedAt: new Date("2026-03-27T15:00:00.000Z"),
        };
      },
    } as never,
    {
      async loadDefinitionById() {
        return {
          description: null,
          e2b: {
            hasApiKey: true,
          },
          id: "definition-1",
          isDefault: true,
          name: "E2B Shared",
        };
      },
    } as never,
    {
      get() {
        return {
          async getEnvironmentStatus() {
            throw new Error("E2B request timed out.");
          },
        };
      },
    } as never,
  );
  const resolver = new EnvironmentQueryResolver(detailService);

  const result = await resolver.execute(
    null,
    {
      id: "env-1",
    },
    {
      app_runtime_transaction_provider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            select() {
              return {
                from() {
                  return {
                    where() {
                      return {
                        async orderBy() {
                          return [{
                            name: "Research Agent",
                          }];
                        },
                      };
                    },
                  };
                },
              };
            },
          });
        },
      } as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
      },
    } as never,
  );

  assert.equal(result.id, "env-1");
  assert.equal(result.status, "unknown");
  assert.equal(result.statusErrorMessage, "E2B request timed out.");
  assert.equal(result.providerDefinitionName, "E2B Shared");
  assert.equal(result.agentName, "Research Agent");
});
