import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import {
  agentSkills,
  agents,
  companyOnboardings,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  taskStages,
  workflowDefinitions,
  workflowStepDefinitions,
} from "../src/db/schema.ts";
import { CompanyHelmLlmProviderService } from "../src/services/ai_providers/companyhelm_service.ts";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.ts";
import { CompanyBootstrapService } from "../src/services/bootstrap/company.ts";
import { CompanyHelmComputeProviderService } from "../src/services/compute_provider_definitions/companyhelm_service.ts";

const expectedSystemSkillKeys = [
  "company_directory",
  "execute_workflows",
  "manage_agents",
  "manage_artifacts",
  "manage_github_installations",
  "manage_skills",
  "manage_workflows",
];

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
  isDefault?: boolean;
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

type AgentSkillRow = {
  agentId: string;
  companyId: string;
  createdAt: Date;
  createdByUserId: string | null;
  skillId: string | null;
  systemSkillKey: string | null;
};

type WorkflowDefinitionRow = {
  companyId: string;
  createdAt: Date;
  createdByAgentId: string | null;
  createdByUserId: string | null;
  description: string | null;
  id: string;
  instructions_template: string | null;
  isEnabled: boolean;
  name: string;
  updatedAt: Date;
};

type WorkflowStepDefinitionRow = {
  createdAt: Date;
  instructions_template: string | null;
  name: string;
  ordinal: number;
  stepId: string;
  workflowDefinitionId: string;
};

type CompanyOnboardingRow = {
  agentId: string | null;
  companyId: string;
  completedAt: Date | null;
  createdAt: Date;
  sessionId: string | null;
  skippedAt: Date | null;
  skippedByUserId: string | null;
  startedAt: Date | null;
  status: "not_started" | "in_progress" | "completed" | "skipped";
  updatedAt: Date;
  workflowRunId: string | null;
};

/**
 * Provides the narrow database surface needed to verify company default seeding without a real
 * database connection.
 */
class CompanyBootstrapServiceTestHarness {
  private readonly agentSkillRows: AgentSkillRow[];
  private readonly agentRows: AgentRow[];
  private readonly baseDefinitions: BaseDefinitionRow[];
  private readonly companyOnboardingRows: CompanyOnboardingRow[];
  private readonly companyHelmOpenAiApiKey: string | null;
  private readonly modelCredentialRows: ModelProviderCredentialRow[];
  private readonly modelRows: ModelProviderCredentialModelRow[];
  private readonly taskStageRows: TaskStageRow[];
  private readonly workflowDefinitionRows: WorkflowDefinitionRow[];
  private readonly workflowStepDefinitionRows: WorkflowStepDefinitionRow[];

  constructor(params?: {
    agentSkillRows?: AgentSkillRow[];
    agentRows?: AgentRow[];
    baseDefinitions?: BaseDefinitionRow[];
    companyOnboardingRows?: CompanyOnboardingRow[];
    companyHelmOpenAiApiKey?: string | null;
    modelCredentialRows?: ModelProviderCredentialRow[];
    modelRows?: ModelProviderCredentialModelRow[];
    taskStageRows?: TaskStageRow[];
    workflowDefinitionRows?: WorkflowDefinitionRow[];
    workflowStepDefinitionRows?: WorkflowStepDefinitionRow[];
  }) {
    this.agentSkillRows = [...(params?.agentSkillRows ?? [])];
    this.agentRows = [...(params?.agentRows ?? [])];
    this.baseDefinitions = [...(params?.baseDefinitions ?? [])];
    this.companyOnboardingRows = [...(params?.companyOnboardingRows ?? [])];
    this.companyHelmOpenAiApiKey = params?.companyHelmOpenAiApiKey === undefined
      ? "sk-local-api-key"
      : params.companyHelmOpenAiApiKey;
    this.modelCredentialRows = [...(params?.modelCredentialRows ?? [])];
    this.modelRows = [...(params?.modelRows ?? [])];
    this.taskStageRows = [...(params?.taskStageRows ?? [])];
    this.workflowDefinitionRows = [...(params?.workflowDefinitionRows ?? [])];
    this.workflowStepDefinitionRows = [...(params?.workflowStepDefinitionRows ?? [])];
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
    const agentSkillRows = this.agentSkillRows;
    const agentRows = this.agentRows;
    const baseDefinitions = this.baseDefinitions;
    const companyOnboardingRows = this.companyOnboardingRows;
    const modelCredentialRows = this.modelCredentialRows;
    const modelRows = this.modelRows;
    const taskStageRows = this.taskStageRows;
    const workflowDefinitionRows = this.workflowDefinitionRows;
    const workflowStepDefinitionRows = this.workflowStepDefinitionRows;
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

                if (table === taskStages) {
                  if (value.isDefault === false) {
                    taskStageRows.forEach((row) => {
                      row.isDefault = false;
                    });
                    return;
                  }
                  if (value.isDefault === true) {
                    const defaultStage = taskStageRows.find((row) => row.name === "Backlog");
                    if (defaultStage) {
                      defaultStage.isDefault = true;
                    }
                    return;
                  }
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
                id: value.id as string,
                name: value.name as string,
                system_prompt: value.system_prompt as string | null,
                updated_at: value.updated_at as Date,
              });

              return {};
            }

            if (table === agentSkills) {
              if (Array.isArray(value)) {
                throw new Error("Unexpected agent skill batch insert.");
              }

              return {
                onConflictDoNothing() {
                  if (!agentSkillRows.some((row) => {
                    return row.agentId === value.agentId
                      && row.companyId === value.companyId
                      && row.systemSkillKey === value.systemSkillKey;
                  })) {
                    agentSkillRows.push({
                      agentId: value.agentId as string,
                      companyId: value.companyId as string,
                      createdAt: value.createdAt as Date,
                      createdByUserId: value.createdByUserId as string | null,
                      skillId: value.skillId as string | null,
                      systemSkillKey: value.systemSkillKey as string | null,
                    });
                  }

                  return this;
                },
              };
            }

            if (table === workflowDefinitions) {
              if (Array.isArray(value)) {
                throw new Error("Unexpected workflow definition batch insert.");
              }

              workflowDefinitionRows.push({
                companyId: value.companyId as string,
                createdAt: value.createdAt as Date,
                createdByAgentId: value.createdByAgentId as string | null,
                createdByUserId: value.createdByUserId as string | null,
                description: value.description as string | null,
                id: value.id as string,
                instructions_template: value.instructions_template as string | null,
                isEnabled: Boolean(value.isEnabled),
                name: value.name as string,
                updatedAt: value.updatedAt as Date,
              });

              return {};
            }

            if (table === workflowStepDefinitions) {
              const values = Array.isArray(value) ? value : [value];
              for (const stepValue of values) {
                workflowStepDefinitionRows.push({
                  createdAt: stepValue.createdAt as Date,
                  instructions_template: stepValue.instructions_template as string | null,
                  name: stepValue.name as string,
                  ordinal: stepValue.ordinal as number,
                  stepId: stepValue.stepId as string,
                  workflowDefinitionId: stepValue.workflowDefinitionId as string,
                });
              }

              return {};
            }

            if (table === companyOnboardings) {
              if (Array.isArray(value)) {
                throw new Error("Unexpected company onboarding batch insert.");
              }

              return {
                onConflictDoNothing() {
                  if (!companyOnboardingRows.some((row) => row.companyId === value.companyId)) {
                    companyOnboardingRows.push({
                      agentId: value.agentId as string | null,
                      companyId: value.companyId as string,
                      completedAt: value.completedAt as Date | null,
                      createdAt: value.createdAt as Date,
                      sessionId: value.sessionId as string | null,
                      skippedAt: value.skippedAt as Date | null,
                      skippedByUserId: value.skippedByUserId as string | null,
                      startedAt: value.startedAt as Date | null,
                      status: value.status as "not_started",
                      updatedAt: value.updatedAt as Date,
                      workflowRunId: value.workflowRunId as string | null,
                    });
                  }

                  return this;
                },
              };
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
                      isDefault: Boolean(value.isDefault),
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
                    if (table === workflowDefinitions) {
                      return workflowDefinitionRows
                        .filter((row) => row.name === CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_NAME)
                        .slice(0, 1);
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

  listAgentSystemSkillKeys(): string[] {
    return this.agentSkillRows
      .flatMap((row) => row.systemSkillKey ? [row.systemSkillKey] : [])
      .sort((left, right) => left.localeCompare(right));
  }

  listWorkflowDefinitions(): WorkflowDefinitionRow[] {
    return this.workflowDefinitionRows;
  }

  listWorkflowSteps(): WorkflowStepDefinitionRow[] {
    return [...this.workflowStepDefinitionRows].sort((left, right) => left.ordinal - right.ordinal);
  }

  listCompanyOnboardings(): CompanyOnboardingRow[] {
    return this.companyOnboardingRows;
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
  assert.deepEqual(harness.listAgentSystemSkillKeys(), expectedSystemSkillKeys);

  const [workflow] = harness.listWorkflowDefinitions();
  assert.equal(workflow?.companyId, "company-1");
  assert.equal(workflow?.name, CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_NAME);
  assert.equal(workflow?.isEnabled, true);
  assert.match(workflow?.description ?? "", /GitHub setup/);

  const workflowSteps = harness.listWorkflowSteps();
  assert.deepEqual(workflowSteps.map((step) => step.name), [
    "Capture company intent",
    "Connect GitHub",
    "Map the tech stack",
    "Propose starter agents",
  ]);
  assert.match(workflowSteps[0]?.instructions_template ?? "", /artifact\.markdown\.create/);
  assert.match(workflowSteps[1]?.instructions_template ?? "", /github\.installation\.start/);
  assert.match(workflowSteps[1]?.instructions_template ?? "", /Connect GitHub card/);
  assert.doesNotMatch(workflowSteps[1]?.instructions_template ?? "", /Show the returned installationUrl/);
  assert.match(workflowSteps[2]?.instructions_template ?? "", /clone_github_repository/);
  assert.match(workflowSteps[3]?.instructions_template ?? "", /skill\.github\.import/);
  assert.match(workflowSteps[3]?.instructions_template ?? "", /public repositories/);
  assert.match(workflowSteps[3]?.instructions_template ?? "", /plain git clone/);

  const [onboarding] = harness.listCompanyOnboardings();
  assert.equal(onboarding?.companyId, "company-1");
  assert.equal(onboarding?.status, "not_started");
  assert.equal(onboarding?.sessionId, null);
  assert.equal(onboarding?.workflowRunId, null);
});

test("CompanyBootstrapService does not duplicate seeded defaults when rerun", async () => {
  const now = new Date("2026-04-03T18:00:00.000Z");
  const harness = new CompanyBootstrapServiceTestHarness({
    agentSkillRows: expectedSystemSkillKeys.map((systemSkillKey) => ({
      agentId: "agent-row-1",
      companyId: "company-1",
      createdAt: now,
      createdByUserId: null,
      skillId: null,
      systemSkillKey,
    })),
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
    workflowDefinitionRows: [{
      companyId: "company-1",
      createdAt: now,
      createdByAgentId: null,
      createdByUserId: null,
      description: "Guides a new company through mission capture, GitHub setup, codebase discovery, and first agent recommendations.",
      id: "workflow-1",
      instructions_template: "Run this workflow in the CEO onboarding chat for newly created companies.",
      isEnabled: true,
      name: CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_NAME,
      updatedAt: now,
    }],
    workflowStepDefinitionRows: [{
      createdAt: now,
      instructions_template: "Ask for mission.",
      name: "Capture company intent",
      ordinal: 1,
      stepId: "capture-company-intent",
      workflowDefinitionId: "workflow-1",
    }, {
      createdAt: now,
      instructions_template: "Connect GitHub.",
      name: "Connect GitHub",
      ordinal: 2,
      stepId: "connect-github",
      workflowDefinitionId: "workflow-1",
    }, {
      createdAt: now,
      instructions_template: "Map stack.",
      name: "Map the tech stack",
      ordinal: 3,
      stepId: "map-tech-stack",
      workflowDefinitionId: "workflow-1",
    }, {
      createdAt: now,
      instructions_template: "Propose agents.",
      name: "Propose starter agents",
      ordinal: 4,
      stepId: "propose-starter-agents",
      workflowDefinitionId: "workflow-1",
    }],
    companyOnboardingRows: [{
      agentId: null,
      companyId: "company-1",
      completedAt: null,
      createdAt: now,
      sessionId: null,
      skippedAt: null,
      skippedByUserId: null,
      startedAt: null,
      status: "not_started",
      updatedAt: now,
      workflowRunId: null,
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
  assert.deepEqual(harness.listAgentSystemSkillKeys(), expectedSystemSkillKeys);
  assert.equal(harness.listWorkflowDefinitions().length, 1);
  assert.equal(harness.listWorkflowSteps().length, 4);
  assert.equal(harness.listCompanyOnboardings().length, 1);
  assert.deepEqual(harness.listTaskStageNames(), ["Backlog", "TODO", "Archive"]);
});
