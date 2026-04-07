import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentEnvironmentTemplateService } from "../src/services/agent/environment/template_service.ts";

test("AgentEnvironmentTemplateService resolves the persisted agent template against provider templates", async () => {
  const service = new AgentEnvironmentTemplateService({
    get(provider) {
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

  const template = await service.getAgentTemplate(
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          select() {
            return {
              from() {
                return {
                  async where() {
                    return [{
                      defaultComputeProviderDefinitionId: "compute-provider-definition-1",
                      defaultEnvironmentTemplateId: "e2b/desktop",
                      id: "agent-1",
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

  assert.deepEqual(template, {
    computerUse: true,
    cpuCount: 4,
    diskSpaceGb: 20,
    memoryGb: 8,
    name: "Desktop",
    templateId: "e2b/desktop",
  });
});
