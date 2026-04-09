import assert from "node:assert/strict";
import { test } from "vitest";
import { AddAgentMutation } from "../src/graphql/mutations/add_agent.ts";

test("AddAgentMutation attaches skill groups and skills after creating the agent", async () => {
  const secretCalls: Array<{ agentId: string; companyId: string; secretId: string; userId: string }> = [];
  const skillGroupCalls: Array<{ agentId: string; companyId: string; skillGroupId: string; userId: string }> = [];
  const skillCalls: Array<{ agentId: string; companyId: string; skillId: string; userId: string }> = [];
  const insertedValues: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;
  const mutation = new AddAgentMutation(
    {
      async attachSecretToAgent(_transactionProvider, input) {
        secretCalls.push({
          agentId: input.agentId,
          companyId: input.companyId,
          secretId: input.secretId,
          userId: String(input.userId),
        });

        return {
          companyId: input.companyId,
          createdAt: new Date("2026-04-09T00:00:00.000Z"),
          description: "Secret",
          envVarName: "TOKEN",
          id: input.secretId,
          name: "Token",
          updatedAt: new Date("2026-04-09T00:00:00.000Z"),
        };
      },
    } as never,
    {
      async attachSkillGroupToAgent(_transactionProvider, input) {
        skillGroupCalls.push({
          agentId: input.agentId,
          companyId: input.companyId,
          skillGroupId: input.skillGroupId,
          userId: String(input.userId),
        });

        return {
          companyId: input.companyId,
          id: input.skillGroupId,
          name: "Research",
        };
      },
      async attachSkillToAgent(_transactionProvider, input) {
        skillCalls.push({
          agentId: input.agentId,
          companyId: input.companyId,
          skillId: input.skillId,
          userId: String(input.userId),
        });

        return {
          companyId: input.companyId,
          description: "Skill",
          fileList: [],
          id: input.skillId,
          instructions: "Instructions",
          name: "Browser research",
          repository: null,
          skillDirectory: null,
          skillGroupId: null,
        };
      },
    } as never,
    {
      async resolveTemplateForProvider(_transactionProvider, input) {
        return {
          computerUse: true,
          cpuCount: 2,
          diskSpaceGb: 20,
          memoryGb: 4,
          name: "Desktop",
          templateId: input.templateId,
        };
      },
    } as never,
  );

  const result = await mutation.execute(
    null,
    {
      input: {
        defaultComputeProviderDefinitionId: "compute-provider-definition-1",
        defaultEnvironmentTemplateId: "e2b/desktop",
        modelProviderCredentialId: "credential-1",
        modelProviderCredentialModelId: "model-row-1",
        name: "Research Agent",
        reasoningLevel: "high",
        secretIds: ["secret-1", "secret-1"],
        skillGroupIds: ["group-1", "group-1"],
        skillIds: ["skill-1", "skill-1"],
        systemPrompt: "You are concise.",
      },
    },
    {
      app_runtime_transaction_provider: {
        async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
          return callback({
            insert() {
              return {
                values(value: Record<string, unknown>) {
                  insertedValues.push(value);
                  return {
                    async returning() {
                      return [{
                        createdAt: new Date("2026-04-09T00:00:00.000Z"),
                        defaultComputeProviderDefinitionId: String(value.defaultComputeProviderDefinitionId),
                        defaultEnvironmentTemplateId: String(value.defaultEnvironmentTemplateId),
                        defaultModelProviderCredentialModelId: String(value.defaultModelProviderCredentialModelId),
                        defaultReasoningLevel: value.default_reasoning_level ?? null,
                        id: "agent-1",
                        name: String(value.name),
                        systemPrompt: value.system_prompt ?? null,
                        updatedAt: new Date("2026-04-09T00:00:00.000Z"),
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
                          id: "credential-1",
                          modelProvider: "openai",
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
                        return [{
                          id: "model-row-1",
                          modelProviderCredentialId: "credential-1",
                          name: "GPT-5.4",
                          reasoningLevels: ["low", "medium", "high"],
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
                        return [{
                          id: "compute-provider-definition-1",
                          name: "Primary E2B",
                          provider: "e2b",
                        }];
                      },
                    };
                  },
                };
              }

              throw new Error(`Unexpected select call: ${selectCallCount}`);
            },
          });
        },
      } as never,
      authSession: {
        company: {
          id: "company-123",
          name: "Example Org",
        },
        token: "jwt-token",
        user: {
          email: "user@example.com",
          firstName: "User",
          id: "user-123",
          lastName: "Example",
          provider: "clerk",
          providerSubject: "user_clerk_123",
        },
      },
    },
  );

  assert.equal(insertedValues.length, 1);
  assert.equal(result.id, "agent-1");
  assert.deepEqual(secretCalls, [{
    agentId: "agent-1",
    companyId: "company-123",
    secretId: "secret-1",
    userId: "user-123",
  }]);
  assert.deepEqual(skillGroupCalls, [{
    agentId: "agent-1",
    companyId: "company-123",
    skillGroupId: "group-1",
    userId: "user-123",
  }]);
  assert.deepEqual(skillCalls, [{
    agentId: "agent-1",
    companyId: "company-123",
    skillId: "skill-1",
    userId: "user-123",
  }]);
});
