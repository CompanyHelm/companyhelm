import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import {
  agents,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  taskStages,
} from "../src/db/schema.ts";
import { CompanyHelmLlmProviderService } from "../src/services/ai_providers/companyhelm_service.ts";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.ts";
import { CompanyBootstrapService } from "../src/services/bootstrap/company.ts";
import { CompanyHelmComputeProviderService } from "../src/services/compute_provider_definitions/companyhelm_service.ts";

type BaseDefinitionRow = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  provider: "e2b";
  updatedAt: Date;
};

type TaskStageRow = {
  companyId: string;
  createdAt: Date;
  name: string;
  updatedAt: Date;
};

type ModelProviderCredentialRow = {
  companyId: string;
  createdAt: Date;
  encryptedApiKey: string;
  id: string;
  isDefault: boolean;
  isManaged: boolean;
  modelProvider: "openai";
  name: string;
  type: "api_key";
  updatedAt: Date;
};

type ModelProviderCredentialModelRow = {
  companyId: string;
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  reasoningLevels: string[] | null;
  reasoningSupported: boolean;
};

type AgentRow = {
  companyId: string;
  created_at: Date;
  defaultComputeProviderDefinitionId: string;
  defaultEnvironmentTemplateId: string;
  defaultModelProviderCredentialModelId: string;
  default_reasoning_level: string | null;
  id: string;
  name: string;
  system_prompt: string | null;
  updated_at: Date;
};

/**
 * Provides the narrow database surface needed to verify company default seeding without a real
 * database connection.
 */
class CompanyBootstrapServiceTestHarness {
  private readonly agentRows: AgentRow[];
  private readonly baseDefinitions: BaseDefinitionRow[];
  private readonly companyHelmOpenAiApiKey: string | null;
  private readonly modelCredentialRows: ModelProviderCredentialRow[];
  private readonly modelRows: ModelProviderCredentialModelRow[];
  private readonly taskStageRows: TaskStageRow[];

  constructor(params?: {
    agentRows?: AgentRow[];
    baseDefinitions?: BaseDefinitionRow[];
    companyHelmOpenAiApiKey?: string | null;
    modelCredentialRows?: ModelProviderCredentialRow[];
    modelRows?: ModelProviderCredentialModelRow[];
    taskStageRows?: TaskStageRow[];
  }) {
    this.agentRows = [...(params?.agentRows ?? [])];
    this.baseDefinitions = [...(params?.baseDefinitions ?? [])];
    this.companyHelmOpenAiApiKey = params?.companyHelmOpenAiApiKey === undefined
      ? "sk-local-api-key"
      : params.companyHelmOpenAiApiKey;
    this.modelCredentialRows = [...(params?.modelCredentialRows ?? [])];
    this.modelRows = [...(params?.modelRows ?? [])];
    this.taskStageRows = [...(params?.taskStageRows ?? [])];
  }

  buildService(): CompanyBootstrapService {
    const companyHelmConfig: {
      e2b: {
        api_key: string;
      };
      llm?: {
        openai_api_key: string;
      };
    } = {
      e2b: {
        api_key: "e2b-local-api-key",
      },
    };
    if (this.companyHelmOpenAiApiKey) {
      companyHelmConfig.llm = {
        openai_api_key: this.companyHelmOpenAiApiKey,
      };
    }

    const config = {
      companyhelm: {
        ...companyHelmConfig,
      },
    } as Config;

    return new CompanyBootstrapService(
      new CompanyHelmComputeProviderService(config),
      new CompanyHelmLlmProviderService(config, new ModelRegistry()),
    );
  }

  buildTransaction() {
    const agentRows = this.agentRows;
    const baseDefinitions = this.baseDefinitions;
    const modelCredentialRows = this.modelCredentialRows;
    const modelRows = this.modelRows;
    const taskStageRows = this.taskStageRows;
    let modelCredentialSelectCount = 0;

    return {
      update(table: unknown) {
        return {
          set(value: Record<string, unknown>) {
            return {
              async where() {
                if (table === modelProviderCredentialModels) {
                  if (value.isDefault === false) {
                    modelRows.forEach((row) => {
                      row.isDefault = false;
                    });
                    return;
                  }
                  if (value.isDefault === true) {
                    const defaultModel = modelRows.find((row) => row.modelId === "gpt-5.4") ?? modelRows[0];
                    if (defaultModel) {
                      defaultModel.isDefault = true;
                    }
                    return;
                  }

                  const model = modelRows.find((row) => row.name === value.name || row.description === value.description);
                  if (model) {
                    model.description = value.description as string;
                    model.name = value.name as string;
                    model.reasoningLevels = value.reasoningLevels as string[] | null;
                    model.reasoningSupported = value.reasoningSupported as boolean;
                  }
                  return;
                }

                throw new Error("Unexpected update table.");
              },
            };
          },
        };
      },
      insert(table: unknown) {
        return {
          values(value: Record<string, unknown> | Array<Record<string, unknown>>) {
            if (table === computeProviderDefinitions) {
              if (Array.isArray(value)) {
                throw new Error("Unexpected compute provider definition batch insert.");
              }

              return {
                onConflictDoNothing() {
                  if (!baseDefinitions.some((row) => row.companyId === value.companyId && row.name === value.name)) {
                    baseDefinitions.push({
                      companyId: value.companyId as string,
                      createdAt: value.createdAt as Date,
                      description: value.description as string | null,
                      id: "companyhelm-definition-1",
                      isDefault: Boolean(value.isDefault),
                      name: value.name as string,
                      provider: value.provider as "e2b",
                      updatedAt: value.updatedAt as Date,
                    });
                  }

                  return this;
                },
              };
            }

            if (table === modelProviderCredentials) {
              if (Array.isArray(value)) {
                throw new Error("Unexpected model credential batch insert.");
              }

              return {
                onConflictDoNothing() {
                  const existingCredential = modelCredentialRows.find((row) =>
                    row.companyId === value.companyId && row.isManaged
                  );
                  if (!existingCredential) {
                    modelCredentialRows.push({
                      companyId: value.companyId as string,
                      createdAt: value.createdAt as Date,
                      encryptedApiKey: value.encryptedApiKey as string,
                      id: "companyhelm-model-credential-1",
                      isDefault: Boolean(value.isDefault),
                      isManaged: Boolean(value.isManaged),
                      modelProvider: value.modelProvider as "openai",
                      name: value.name as string,
                      type: value.type as "api_key",
                      updatedAt: value.updatedAt as Date,
                    });
                  }

                  return {
                    async returning() {
                      return modelCredentialRows.filter((row) => row.isManaged).slice(0, 1);
                    },
                  };
                },
              };
            }

            if (table === modelProviderCredentialModels) {
              const values = Array.isArray(value) ? value : [value];
              for (const modelValue of values) {
                if (modelRows.some((row) => {
                  return row.modelProviderCredentialId === modelValue.modelProviderCredentialId
                    && row.modelId === modelValue.modelId;
                })) {
                  continue;
                }

                modelRows.push({
                  companyId: modelValue.companyId as string,
                  description: modelValue.description as string,
                  id: `model-row-${modelRows.length + 1}`,
                  isDefault: Boolean(modelValue.isDefault),
                  modelId: modelValue.modelId as string,
                  modelProviderCredentialId: modelValue.modelProviderCredentialId as string,
                  name: modelValue.name as string,
                  reasoningLevels: modelValue.reasoningLevels as string[] | null,
                  reasoningSupported: modelValue.reasoningSupported as boolean,
                });
              }

              return {};
            }

            if (table === agents) {
              if (Array.isArray(value)) {
                throw new Error("Unexpected agent batch insert.");
              }

              agentRows.push({
                companyId: value.companyId as string,
                created_at: value.created_at as Date,
                defaultComputeProviderDefinitionId: value.defaultComputeProviderDefinitionId as string,
                defaultEnvironmentTemplateId: value.defaultEnvironmentTemplateId as string,
                defaultModelProviderCredentialModelId: value.defaultModelProviderCredentialModelId as string,
                default_reasoning_level: value.default_reasoning_level as string | null,
                id: `agent-row-${agentRows.length + 1}`,
                name: value.name as string,
                system_prompt: value.system_prompt as string | null,
                updated_at: value.updated_at as Date,
              });

              return {};
            }

            if (table === taskStages) {
              if (Array.isArray(value)) {
                throw new Error("Unexpected task stage batch insert.");
              }

              return {
                onConflictDoNothing() {
                  if (!taskStageRows.some((row) => {
                    return row.companyId === value.companyId
                      && row.name.toLowerCase() === String(value.name).toLowerCase();
                  })) {
                    taskStageRows.push({
                      companyId: value.companyId as string,
                      createdAt: value.createdAt as Date,
                      name: value.name as string,
                      updatedAt: value.updatedAt as Date,
                    });
                  }

                  return this;
                },
              };
            }

            throw new Error("Unexpected insert table.");
          },
        };
      },
      select() {
        return {
          from(table: unknown) {
            return {
              where(condition: unknown) {
                void condition;
                if (table === modelProviderCredentialModels) {
                  return Promise.resolve([...modelRows]);
                }

                return {
                  async limit() {
                    if (table === agents) {
                      return agentRows.filter((row) => row.name === "CEO").slice(0, 1);
                    }
                    if (table === computeProviderDefinitions) {
                      return [...baseDefinitions].slice(0, 1);
                    }
                    if (table === modelProviderCredentials) {
                      modelCredentialSelectCount += 1;
                      if (modelCredentialSelectCount % 2 === 1) {
                        return modelCredentialRows.filter((row) => row.isManaged).slice(0, 1);
                      }

                      return modelCredentialRows.filter((row) => row.isDefault).slice(0, 1);
                    }

                    return [];
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  listDefinitionNames(): string[] {
    return this.baseDefinitions.map((row) => row.name);
  }

  listTaskStageNames(): string[] {
    return this.taskStageRows.map((row) => row.name);
  }

  listModelCredentials(): ModelProviderCredentialRow[] {
    return this.modelCredentialRows;
  }

  listModels(): ModelProviderCredentialModelRow[] {
    return this.modelRows;
  }

  listAgents(): AgentRow[] {
    return this.agentRows;
  }

  loadDefaultDefinition(): BaseDefinitionRow | null {
    return this.baseDefinitions[0] ?? null;
  }
}

test("CompanyBootstrapService seeds the CompanyHelm definition and default task stages", async () => {
  const harness = new CompanyBootstrapServiceTestHarness();
  const service = harness.buildService();

  await service.ensureCompanyDefaults(
    harness.buildTransaction() as never,
    "company-1",
  );

  const defaultDefinition = harness.loadDefaultDefinition();
  assert.equal(defaultDefinition?.name, "CompanyHelm");
  assert.equal(defaultDefinition?.description, "Managed by CompanyHelm");
  assert.equal(defaultDefinition?.provider, "e2b");
  assert.equal(defaultDefinition?.isDefault, true);
  const [managedCredential] = harness.listModelCredentials();
  assert.equal(managedCredential?.name, "CompanyHelm");
  assert.equal(managedCredential?.modelProvider, "openai");
  assert.equal(managedCredential?.isManaged, true);
  assert.equal(managedCredential?.isDefault, true);
  assert.ok(harness.listModels().some((model) => model.modelId === "gpt-5.4" && model.isDefault));
  assert.deepEqual(harness.listTaskStageNames(), ["Backlog", "TODO", "Archive"]);
});

test("CompanyBootstrapService skips the CompanyHelm model provider when the OpenAI key is not configured", async () => {
  const harness = new CompanyBootstrapServiceTestHarness({
    companyHelmOpenAiApiKey: null,
  });

  await harness.buildService().ensureCompanyDefaults(
    harness.buildTransaction() as never,
    "company-1",
  );

  assert.deepEqual(harness.listDefinitionNames(), ["CompanyHelm"]);
  assert.deepEqual(harness.listModelCredentials(), []);
  assert.deepEqual(harness.listModels(), []);
  assert.deepEqual(harness.listAgents(), []);
  assert.deepEqual(harness.listTaskStageNames(), ["Backlog", "TODO", "Archive"]);
});

test("CompanyBootstrapService seeds the CEO agent for newly created companies", async () => {
  const harness = new CompanyBootstrapServiceTestHarness();

  await harness.buildService().ensureCompanyDefaults(
    harness.buildTransaction() as never,
    "company-1",
    {
      seedAgent: true,
    },
  );

  const [seedAgent] = harness.listAgents();
  const defaultDefinition = harness.loadDefaultDefinition();
  const [managedCredential] = harness.listModelCredentials();
  const defaultModel = harness.listModels().find((model) => model.isDefault);

  assert.equal(seedAgent?.companyId, "company-1");
  assert.equal(seedAgent?.name, "CEO");
  assert.equal(seedAgent?.defaultComputeProviderDefinitionId, defaultDefinition?.id);
  assert.equal(seedAgent?.defaultEnvironmentTemplateId, "medium");
  assert.equal(seedAgent?.defaultModelProviderCredentialModelId, defaultModel?.id);
  assert.equal(defaultModel?.modelProviderCredentialId, managedCredential?.id);
  assert.equal(seedAgent?.default_reasoning_level, "high");
  assert.equal(seedAgent?.system_prompt, null);
});

test("CompanyBootstrapService does not duplicate seeded defaults when rerun", async () => {
  const now = new Date("2026-04-03T18:00:00.000Z");
  const harness = new CompanyBootstrapServiceTestHarness({
    baseDefinitions: [{
      companyId: "company-1",
      createdAt: now,
      description: "Managed by CompanyHelm",
      id: "companyhelm-definition-1",
      isDefault: true,
      name: "CompanyHelm",
      provider: "e2b",
      updatedAt: now,
    }],
    modelCredentialRows: [{
      companyId: "company-1",
      createdAt: now,
      encryptedApiKey: "companyhelm-managed-openai-api-key",
      id: "companyhelm-model-credential-1",
      isDefault: true,
      isManaged: true,
      modelProvider: "openai",
      name: "CompanyHelm",
      type: "api_key",
      updatedAt: now,
    }],
    modelRows: [{
      companyId: "company-1",
      description: "Latest frontier agentic coding model.",
      id: "model-row-1",
      isDefault: true,
      modelId: "gpt-5.4",
      modelProviderCredentialId: "companyhelm-model-credential-1",
      name: "GPT-5.4",
      reasoningLevels: ["low", "medium", "high", "xhigh"],
      reasoningSupported: true,
    }],
    agentRows: [{
      companyId: "company-1",
      created_at: now,
      defaultComputeProviderDefinitionId: "companyhelm-definition-1",
      defaultEnvironmentTemplateId: "medium",
      defaultModelProviderCredentialModelId: "model-row-1",
      default_reasoning_level: "high",
      id: "agent-row-1",
      name: "CEO",
      system_prompt: null,
      updated_at: now,
    }],
    taskStageRows: [{
      companyId: "company-1",
      createdAt: now,
      name: "Backlog",
      updatedAt: now,
    }, {
      companyId: "company-1",
      createdAt: now,
      name: "TODO",
      updatedAt: now,
    }, {
      companyId: "company-1",
      createdAt: now,
      name: "Archive",
      updatedAt: now,
    }],
  });
  const service = harness.buildService();

  await service.ensureCompanyDefaults(
    harness.buildTransaction() as never,
    "company-1",
    {
      seedAgent: true,
    },
  );

  assert.deepEqual(harness.listDefinitionNames(), ["CompanyHelm"]);
  assert.equal(harness.listModelCredentials().length, 1);
  assert.equal(harness.listModels().filter((model) => model.modelId === "gpt-5.4").length, 1);
  assert.equal(harness.listAgents().filter((agent) => agent.name === "CEO").length, 1);
  assert.deepEqual(harness.listTaskStageNames(), ["Backlog", "TODO", "Archive"]);
});
