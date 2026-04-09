import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentCreateAgentTool } from "../src/services/agent/session/pi-mono/tools/agents/create_agent.ts";
import { AgentListAgentsTool } from "../src/services/agent/session/pi-mono/tools/agents/list_agents.ts";
import { AgentManagementToolProvider } from "../src/services/agent/session/pi-mono/tools/agents/provider.ts";
import { AgentManagementToolService } from "../src/services/agent/session/pi-mono/tools/agents/service.ts";
import { AgentUpdateAgentTool } from "../src/services/agent/session/pi-mono/tools/agents/update_agent.ts";

type AgentToolExecutionResult = {
  content: Array<{
    text?: string;
  }>;
  details?: {
    agentCount?: number;
    agentId?: string;
    currentAgentId?: string;
  };
};

const sampleAgent = {
  companyId: "company-1",
  createdAt: new Date("2026-04-04T18:00:00.000Z"),
  defaultComputeProvider: "e2b" as const,
  defaultComputeProviderDefinitionId: "compute-1",
  defaultComputeProviderDefinitionName: "CompanyHelm",
  defaultEnvironmentTemplateId: "e2b/desktop",
  environmentTemplate: {
    computerUse: true,
    cpuCount: 2,
    diskSpaceGb: 20,
    memoryGb: 4,
    name: "Desktop",
    templateId: "e2b/desktop",
  },
  id: "agent-1",
  isCurrentAgent: true,
  modelDescription: "Fast reasoning model",
  modelId: "gpt-5.4",
  modelName: "GPT-5.4",
  modelProvider: "openai" as const,
  modelProviderCredentialId: "credential-1",
  modelProviderCredentialLabel: "OpenAI",
  modelProviderCredentialModelId: "model-1",
  name: "Operator",
  reasoningLevel: "medium",
  secrets: [{
    companyId: "company-1",
    createdAt: new Date("2026-04-04T18:00:00.000Z"),
    description: "Deploy token",
    envVarName: "DEPLOY_TOKEN",
    id: "secret-1",
    name: "Deploy token",
    updatedAt: new Date("2026-04-04T18:00:00.000Z"),
  }],
  supportedReasoningLevels: ["low", "medium", "high"],
  systemPrompt: "Keep the deploy pipeline healthy.",
  updatedAt: new Date("2026-04-04T18:05:00.000Z"),
};

test("AgentManagementToolProvider contributes the agent management tools", () => {
  const provider = new AgentManagementToolProvider({
    async createAgent() {
      throw new Error("agent creation is lazy");
    },
    async listAgents() {
      throw new Error("agent listing is lazy");
    },
    async updateAgent() {
      throw new Error("agent updates are lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_agents", "create_agent", "update_agent"],
  );
});

test("AgentListAgentsTool renders full agent management state", async () => {
  const tool = new AgentListAgentsTool({
    async listAgents() {
      return {
        agents: [sampleAgent],
        availableComputeProviderDefinitions: [{
          companyId: "company-1",
          createdAt: new Date("2026-04-04T18:00:00.000Z"),
          description: "Managed provider",
          e2b: {
            hasApiKey: true,
          },
          id: "compute-1",
          name: "CompanyHelm",
          provider: "e2b" as const,
          templates: [{
            computerUse: true,
            cpuCount: 2,
            diskSpaceGb: 20,
            memoryGb: 4,
            name: "Desktop",
            templateId: "e2b/desktop",
          }],
          updatedAt: new Date("2026-04-04T18:00:00.000Z"),
        }],
        availableSecrets: sampleAgent.secrets,
        currentAgentId: "agent-1",
        providerOptions: [{
          defaultModelId: "gpt-5.4",
          defaultReasoningLevel: "medium",
          id: "credential-1",
          label: "OpenAI",
          modelProvider: "openai" as const,
          models: [{
            description: "Fast reasoning model",
            id: "model-1",
            modelId: "gpt-5.4",
            name: "GPT-5.4",
            reasoningSupported: true,
            reasoningLevels: ["low", "medium", "high"],
          }],
        }],
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {},
    undefined,
    undefined,
    undefined,
  );

  assert.equal(result.details?.agentCount, 1);
  assert.equal(result.details?.currentAgentId, "agent-1");
  assert.match(result.content[0]?.text ?? "", /currentAgentId: agent-1/);
  assert.match(result.content[0]?.text ?? "", /availableComputeProviderDefinitions:/);
  assert.match(result.content[0]?.text ?? "", /defaultSecrets:/);
});

test("AgentCreateAgentTool returns the created agent summary", async () => {
  const tool = new AgentCreateAgentTool({
    async createAgent() {
      return sampleAgent;
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {
      defaultComputeProviderDefinitionId: "compute-1",
      defaultEnvironmentTemplateId: "e2b/desktop",
      modelProviderCredentialModelId: "model-1",
      name: "Operator",
    },
    undefined,
    undefined,
    undefined,
  );

  assert.equal(result.details?.agentId, "agent-1");
  assert.match(result.content[0]?.text ?? "", /name: Operator/);
  assert.match(result.content[0]?.text ?? "", /isCurrentAgent: true/);
});

test("AgentUpdateAgentTool returns the updated agent summary", async () => {
  const tool = new AgentUpdateAgentTool({
    async updateAgent() {
      return {
        ...sampleAgent,
        name: "Operator Prime",
      };
    },
  } as never);

  const execute = tool.createDefinition().execute as (...args: unknown[]) => Promise<AgentToolExecutionResult>;
  const result = await execute(
    "tool-call-1",
    {
      id: "agent-1",
      name: "Operator Prime",
    },
    undefined,
    undefined,
    undefined,
  );

  assert.equal(result.details?.agentId, "agent-1");
  assert.match(result.content[0]?.text ?? "", /name: Operator Prime/);
  assert.match(result.content[0]?.text ?? "", /defaultComputeProviderDefinitionName: CompanyHelm/);
});

test("AgentManagementToolService replaceAgentSecrets routes changes through SecretService propagation", async () => {
  const attachCalls: Array<Record<string, unknown>> = [];
  const detachCalls: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;
  const service = new AgentManagementToolService(
    {} as never,
    "company-1",
    "agent-1",
    {
      async attachSecretToAgent(
        transactionProvider: unknown,
        input: Record<string, unknown>,
      ) {
        attachCalls.push({
          ...input,
          transactionProvider,
        });
        return sampleAgent.secrets[0];
      },
      async detachSecretFromAgent(
        transactionProvider: unknown,
        companyId: string,
        agentId: string,
        secretId: string,
      ) {
        detachCalls.push({
          agentId,
          companyId,
          secretId,
          transactionProvider,
        });
        return sampleAgent.secrets[0];
      },
      async listSecrets() {
        return [];
      },
    } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  const database = {
    select() {
      selectCallCount += 1;
      if (selectCallCount === 1) {
        return {
          from() {
            return {
              async where() {
                return [{ id: "secret-2" }];
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
                return [{ secretId: "secret-1" }];
              },
            };
          },
        };
      }

      throw new Error("Unexpected select call.");
    },
  };
  const transactionProvider = {
    marker: "tx",
  };

  await (service as never).replaceAgentSecrets(
    "agent-1",
    ["secret-2"],
    transactionProvider,
    database,
  );

  assert.deepEqual(detachCalls, [{
    agentId: "agent-1",
    companyId: "company-1",
    secretId: "secret-1",
    transactionProvider,
  }]);
  assert.deepEqual(attachCalls, [{
    agentId: "agent-1",
    companyId: "company-1",
    secretId: "secret-2",
    transactionProvider,
    userId: null,
  }]);
});
