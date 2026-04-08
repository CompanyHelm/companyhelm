import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentEnvironmentTemplateService } from "../src/services/agent/environment/template_service.ts";

test("AgentEnvironmentTemplateService resolves the persisted agent template selection against provider templates", async () => {
  const service = new AgentEnvironmentTemplateService({
    get(provider: string) {
      assert.equal(provider, "e2b");
      return {
        async getTemplates() {
          return [{
            computerUse: true,
            cpuCount: 4,
            diskSpaceGb: 20,
            memoryGb: 8,
            name: "Desktop",
            templateId: "e2b/desktop",
          }];
        },
      };
    },
  } as never);

  const selection = await service.getAgentTemplateSelection(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select(selection: Record<string, unknown>) {
            return {
              from() {
                return {
                  async where() {
                    if ("defaultComputeProviderDefinitionId" in selection) {
                      return [{
                        defaultComputeProviderDefinitionId: "compute-provider-definition-1",
                        defaultEnvironmentTemplateId: "e2b/desktop",
                        id: "agent-1",
                      }];
                    }

                    return [{
                      id: "compute-provider-definition-1",
                      provider: "e2b",
                    }];
                  },
                };
              },
            };
          },
        });
      },
    } as never,
    "company-1",
    "agent-1",
  );

  assert.deepEqual(selection, {
    provider: "e2b",
    providerDefinitionId: "compute-provider-definition-1",
    template: {
      computerUse: true,
      cpuCount: 4,
      diskSpaceGb: 20,
      memoryGb: 8,
      name: "Desktop",
      templateId: "e2b/desktop",
    },
  });
});
