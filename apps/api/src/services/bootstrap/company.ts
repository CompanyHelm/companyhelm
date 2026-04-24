import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import {
  agentSkills,
  agents,
  companies,
  companyMembers,
  companyOnboardings,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  taskStages,
  workflowDefinitionInputs,
  workflowDefinitions,
  workflowStepDefinitions,
} from "../../db/schema.ts";
import type { ComputeProvider } from "../environments/providers/provider_interface.ts";
import { CompanyHelmLlmProviderService } from "../ai_providers/companyhelm_service.ts";
import { CompanyHelmComputeProviderService } from "../compute_provider_definitions/companyhelm_service.ts";
import { SystemSkillRegistry } from "../skills/system_registry.ts";
import { TaskStageService } from "../task_stage_service.ts";

type CompanyRecord = {
  id: string;
  clerk_organization_id: string | null;
  deletion_status: "active" | "deletion_requested";
  name: string;
  wasCreated: boolean;
};

type ComputeProviderDefinitionRecord = {
  companyId: string;
  description: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  provider: ComputeProvider;
};

type ModelProviderCredentialRecord = {
  id: string;
  isManaged: boolean;
  modelProvider: string;
};

type ModelProviderCredentialModelRecord = {
  id: string;
  isDefault: boolean;
  modelId: string;
  reasoningLevels: string[] | null;
};

type AgentRecord = {
  id: string;
};

type BootstrapInsertableDatabase = DatabaseTransactionInterface & {
  insert(table: unknown): {
    values(value: Record<string, unknown> | Array<Record<string, unknown>>): {
      onConflictDoNothing(): {
        returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
      };
      returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

type BootstrapInsertOperation = {
  onConflictDoNothing(): {
    returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
  };
};

type BootstrapUpdatableDatabase = DatabaseTransactionInterface & {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

type BootstrapMutableDatabase = BootstrapUpdatableDatabase & {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

/**
 * Owns the company-side provisioning steps that must exist before company-scoped API features can
 * run. That includes the company row itself, membership links, and the idempotent default catalog
 * records that requests expect to find after first sign-in.
 */
@injectable()
export class CompanyBootstrapService {
  static readonly DEFAULT_TASK_STAGE_NAME = TaskStageService.DEFAULT_TASK_STAGE_NAME;
  static readonly SEEDED_TASK_STAGE_NAMES = [CompanyBootstrapService.DEFAULT_TASK_STAGE_NAME, "TODO", "Archive"] as const;
  static readonly SEED_AGENT_NAME = "CEO";
  static readonly SEED_ONBOARDING_WORKFLOW_NAME = "Company onboarding";
  private static readonly SEED_AGENT_ENVIRONMENT_TEMPLATE_ID = "medium";
  private static readonly SEED_ONBOARDING_WORKFLOW_DESCRIPTION =
    "Guides a new company through repository discovery, skill options, and first agent recommendations.";
  private static readonly SEED_ONBOARDING_WORKFLOW_INSTRUCTIONS = [
    "Run this workflow in the CEO onboarding chat for newly created companies.",
    "Keep the conversation focused and ask only one question at a time.",
    "Use chat for intent gathering, and use system commands or product tools for durable setup actions.",
    "Use the static onboarding inputs as ground truth for mission capture, GitHub setup, and model provider readiness.",
    "Do not create agents or import skills without user confirmation. Explain to the user what you will do before doing it.",
  ].join("\n");
  private static readonly SEED_ONBOARDING_WORKFLOW_INPUTS = [{
    defaultValue: "",
    description: "Mission or goals captured during static onboarding. Empty means the user skipped it.",
    isRequired: false,
    name: "companyMission",
  }, {
    defaultValue: "pending",
    description: "Whether GitHub was connected, skipped, or left pending during static onboarding.",
    isRequired: true,
    name: "githubSetupStatus",
  }, {
    defaultValue: "pending",
    description: "Whether LLM provider setup was completed with third-party credentials, CompanyHelm-managed access, or skipped.",
    isRequired: true,
    name: "llmSetupStatus",
  }] as const;
  private static readonly SEED_ONBOARDING_WORKFLOW_STEPS = [{
    instructions: [
      "Welcome the user to CompanyHelm as their CEO and explicitly reference the static onboarding inputs.",
      "Summarize the current setup state using companyMission, githubSetupStatus, and llmSetupStatus.",
      "If companyMission is non-empty, reflect it back in one or two sentences and ask one question: whether the user wants to configure additional agents now.",
      "If companyMission is empty, ask the user for the short mission or near-term goal that should guide the first agent team before proposing any setup.",
      "Explain that the next steps are repository inspection, skill options, and a concrete agent recommendation set.",
    ].join("\n"),
    name: "Frame the onboarding goals",
    stepId: "frame-onboarding-goals",
  }, {
    instructions: [
      "Use githubSetupStatus to decide the next question.",
      "If githubSetupStatus is completed, ask which connected repositories the CEO should inspect first and whether the user wants those repos pulled into the workspace for review.",
      "If githubSetupStatus is skipped, explain the limitation clearly and ask whether the user wants to continue with goal-based agent planning only.",
      "Ask specifically about importing or mirroring useful agent and skill patterns from public references such as msitarzewski/agency-agents, obra/superpowers, and bmad-code-org/BMAD-METHOD.",
      "If the user wants skill help, activate the Manage skills system skill and inspect public repositories before proposing imports. Only call skill.github.import after you know the exact directories to import and the user approves it.",
      "If the user wants repository access but GitHub is still not connected, explain that they should return to the static onboarding step or repositories page to connect it before the CEO can inspect private repos.",
    ].join("\n"),
    name: "Inspect repos and skill options",
    stepId: "inspect-repos-and-skills",
  }, {
    instructions: [
      "Propose a small first team of 3 to 5 agents based on the company mission, repository context if available, and the user's stated priorities.",
      "Give the user options, not just one answer. Include at least one conservative setup and one more ambitious setup.",
      "Ask which additional agents the user wants to create now versus later, then tie the options to that answer.",
      "For each proposed agent include name, responsibility, why it exists, model or compute assumptions, useful skills, and the first task it should own.",
      "When repositories are available, tailor the recommendation to the actual stack and call out which repos the team should check out first.",
      "Discuss whether Superpowers-style development skills, BMAD-style role specialization, or imported public skill packages would make those agents more effective.",
      "Ask for confirmation before creating agents. After approval, activate the Manage agents system skill and use agent.create plus agent.skill.attach or agent.skill_group.attach as needed.",
    ].join("\n"),
    name: "Recommend the first agent team",
    stepId: "propose-starter-agents",
  }] as const;
  private readonly companyHelmComputeProviderService: CompanyHelmComputeProviderService;
  private readonly companyHelmLlmProviderService: CompanyHelmLlmProviderService;
  private readonly systemSkillRegistry = new SystemSkillRegistry();

  constructor(
    @inject(CompanyHelmComputeProviderService)
    companyHelmComputeProviderService: CompanyHelmComputeProviderService,
    @inject(CompanyHelmLlmProviderService)
    companyHelmLlmProviderService: CompanyHelmLlmProviderService,
  ) {
    this.companyHelmComputeProviderService = companyHelmComputeProviderService;
    this.companyHelmLlmProviderService = companyHelmLlmProviderService;
  }

  async findOrCreateCompany(
    transaction: DatabaseTransactionInterface,
    params: {
      providerSubject: string;
      name: string;
    },
  ): Promise<CompanyRecord> {
    const existingCompany = await this.findCompanyByClerkOrganizationId(
      transaction,
      params.providerSubject,
    );
    if (existingCompany) {
      this.assertCompanyCanAuthenticate(existingCompany);
      return existingCompany;
    }

    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(companies)
      .values({
        clerkOrganizationId: params.providerSubject,
        name: params.name,
        plan: "free",
      }) as BootstrapInsertOperation;
    const insertResult = insertOperation
      .onConflictDoNothing()
      .returning?.({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        deletion_status: companies.deletionStatus,
        name: companies.name,
      });
    const createdRows = insertResult ? await insertResult as CompanyRecord[] : [];
    const createdCompany = createdRows[0];
    if (!createdCompany) {
      const concurrentCompany = await this.findCompanyByClerkOrganizationId(
        transaction,
        params.providerSubject,
      );
      if (!concurrentCompany) {
        throw new Error("Failed to provision Clerk company.");
      }

      this.assertCompanyCanAuthenticate(concurrentCompany);
      return concurrentCompany;
    }

    return {
      ...createdCompany,
      wasCreated: true,
    };
  }

  async ensureMembership(
    transaction: DatabaseTransactionInterface,
    params: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(companyMembers)
      .values({
        companyId: params.companyId,
        userId: params.userId,
      }) as BootstrapInsertOperation;
    await insertOperation.onConflictDoNothing();
  }

  async ensureCompanyDefaults(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    options: {
      seedAgent?: boolean;
    } = {},
  ): Promise<void> {
    await this.ensureCompanyHelmComputeProviderDefinition(transaction, companyId);
    let modelProviderCredential: ModelProviderCredentialRecord | null = null;
    if (this.companyHelmLlmProviderService.hasRuntimeApiKey()) {
      modelProviderCredential = await this.ensureCompanyHelmLlmProviderCredential(transaction, companyId);
    }
    await this.ensureDefaultTaskStages(transaction, companyId);
    if (options.seedAgent) {
      await this.ensureCompanyOnboardingWorkflow(transaction, companyId);
      await this.ensureCompanyOnboardingState(transaction, companyId);
    }
    if (options.seedAgent && modelProviderCredential) {
      const computeProviderDefinition = await this.findCompanyHelmComputeProviderDefinition(transaction, companyId);
      if (!computeProviderDefinition) {
        throw new Error("Failed to resolve CompanyHelm compute provider definition for the seed agent.");
      }

      const seedAgent = await this.ensureCompanyHelmSeedAgent(
        transaction,
        companyId,
        computeProviderDefinition.id,
        modelProviderCredential.id,
      );
      await this.ensureCompanyHelmSeedAgentSystemSkills(transaction, companyId, seedAgent.id);
      return;
    }

    if (options.seedAgent) {
      const existingSeedAgent = await this.findCompanyHelmSeedAgent(transaction, companyId);
      if (existingSeedAgent) {
        await this.ensureCompanyHelmSeedAgentSystemSkills(transaction, companyId, existingSeedAgent.id);
      }
    }
  }

  private async findCompanyByClerkOrganizationId(
    transaction: DatabaseTransactionInterface,
    providerSubject: string,
  ): Promise<CompanyRecord | null> {
    const [existingCompany] = await transaction
      .select({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
        deletion_status: companies.deletionStatus,
        name: companies.name,
      })
      .from(companies)
      .where(eq(companies.clerkOrganizationId, providerSubject))
      .limit(1) as CompanyRecord[];

    return existingCompany
      ? {
        ...existingCompany,
        wasCreated: false,
      }
      : null;
  }

  private assertCompanyCanAuthenticate(company: CompanyRecord): void {
    if (company.deletion_status !== "active") {
      throw new Error("Company deletion has already been requested.");
    }
  }

  private async ensureCompanyHelmComputeProviderDefinition(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const [existingDefinition] = await transaction
      .select({
        companyId: computeProviderDefinitions.companyId,
        description: computeProviderDefinitions.description,
        id: computeProviderDefinitions.id,
        isDefault: computeProviderDefinitions.isDefault,
        name: computeProviderDefinitions.name,
        provider: computeProviderDefinitions.provider,
      })
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, companyId),
        eq(computeProviderDefinitions.name, this.companyHelmComputeProviderService.getDefinitionName()),
      ))
      .limit(1) as ComputeProviderDefinitionRecord[];
    if (existingDefinition) {
      if (!this.companyHelmComputeProviderService.matchesDefinition(existingDefinition)) {
        throw new Error("Reserved CompanyHelm compute provider name is assigned to another provider.");
      }

      return;
    }

    const [existingDefaultDefinition] = await transaction
      .select({
        id: computeProviderDefinitions.id,
      })
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, companyId),
        eq(computeProviderDefinitions.isDefault, true),
      ))
      .limit(1);
    const now = new Date();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(computeProviderDefinitions)
      .values({
        companyId,
        createdAt: now,
        createdByUserId: null,
        description: this.companyHelmComputeProviderService.getDefinitionDescription(),
        isDefault: !existingDefaultDefinition,
        name: this.companyHelmComputeProviderService.getDefinitionName(),
        provider: this.companyHelmComputeProviderService.getProvider(),
        updatedAt: now,
        updatedByUserId: null,
      }) as BootstrapInsertOperation;
    await insertOperation.onConflictDoNothing();
  }

  private async ensureCompanyHelmLlmProviderCredential(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<ModelProviderCredentialRecord> {
    const updatableDatabase = transaction as BootstrapUpdatableDatabase;
    const [existingCredential] = await transaction
      .select({
        id: modelProviderCredentials.id,
        isManaged: modelProviderCredentials.isManaged,
        modelProvider: modelProviderCredentials.modelProvider,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.isManaged, true),
      ))
      .limit(1) as ModelProviderCredentialRecord[];
    if (existingCredential) {
      if (!this.companyHelmLlmProviderService.matchesCredential(existingCredential)) {
        await updatableDatabase
          .update(modelProviderCredentials)
          .set({
            accessTokenExpiresAt: null,
            baseUrl: null,
            encryptedApiKey: this.companyHelmLlmProviderService.getStoredApiKeySentinel(),
            errorMessage: null,
            modelProvider: this.companyHelmLlmProviderService.getModelProvider(),
            name: this.companyHelmLlmProviderService.getCredentialName(),
            refreshedAt: null,
            refreshToken: null,
            status: "active",
            type: "api_key",
            updatedAt: new Date(),
          })
          .where(and(
            eq(modelProviderCredentials.companyId, companyId),
            eq(modelProviderCredentials.id, existingCredential.id),
          ));
      }
      await this.ensureCompanyHelmLlmProviderModels(transaction, companyId, existingCredential.id);
      return existingCredential;
    }

    const [existingDefaultCredential] = await transaction
      .select({
        id: modelProviderCredentials.id,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.isDefault, true),
      ))
      .limit(1);
    const now = new Date();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(modelProviderCredentials)
      .values({
        accessTokenExpiresAt: null,
        companyId,
        createdAt: now,
        encryptedApiKey: this.companyHelmLlmProviderService.getStoredApiKeySentinel(),
        errorMessage: null,
        isDefault: !existingDefaultCredential,
        isManaged: true,
        modelProvider: this.companyHelmLlmProviderService.getModelProvider(),
        name: this.companyHelmLlmProviderService.getCredentialName(),
        refreshedAt: null,
        refreshToken: null,
        status: "active",
        type: "api_key",
        updatedAt: now,
      }) as BootstrapInsertOperation;
    const createdRows = await insertOperation
      .onConflictDoNothing()
      .returning?.({
        id: modelProviderCredentials.id,
        isManaged: modelProviderCredentials.isManaged,
        modelProvider: modelProviderCredentials.modelProvider,
      }) as ModelProviderCredentialRecord[] | undefined;
    const credential = createdRows?.[0]
      ?? await this.findCompanyHelmLlmProviderCredential(transaction, companyId);
    if (!credential) {
      throw new Error("Failed to provision CompanyHelm model provider credential.");
    }

    await this.ensureCompanyHelmLlmProviderModels(transaction, companyId, credential.id);
    return credential;
  }

  private async findCompanyHelmComputeProviderDefinition(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<ComputeProviderDefinitionRecord | null> {
    const [existingDefinition] = await transaction
      .select({
        companyId: computeProviderDefinitions.companyId,
        description: computeProviderDefinitions.description,
        id: computeProviderDefinitions.id,
        isDefault: computeProviderDefinitions.isDefault,
        name: computeProviderDefinitions.name,
        provider: computeProviderDefinitions.provider,
      })
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, companyId),
        eq(computeProviderDefinitions.name, this.companyHelmComputeProviderService.getDefinitionName()),
      ))
      .limit(1) as ComputeProviderDefinitionRecord[];

    return existingDefinition ?? null;
  }

  private async findCompanyHelmLlmProviderCredential(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<ModelProviderCredentialRecord | null> {
    const [existingCredential] = await transaction
      .select({
        id: modelProviderCredentials.id,
        isManaged: modelProviderCredentials.isManaged,
        modelProvider: modelProviderCredentials.modelProvider,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.isManaged, true),
      ))
      .limit(1) as ModelProviderCredentialRecord[];

    return existingCredential ?? null;
  }

  private async ensureCompanyHelmLlmProviderModels(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    credentialId: string,
  ): Promise<void> {
    const existingModels = await (transaction
      .select({
        id: modelProviderCredentialModels.id,
        isDefault: modelProviderCredentialModels.isDefault,
        modelId: modelProviderCredentialModels.modelId,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
      )) as unknown as Promise<ModelProviderCredentialModelRecord[]>);
    const existingModelsByModelId = new Map(existingModels.map((model) => [model.modelId, model]));
    const seedModels = this.companyHelmLlmProviderService.getSeedModels();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const updatableDatabase = transaction as BootstrapUpdatableDatabase;

    for (const seedModel of seedModels) {
      const existingModel = existingModelsByModelId.get(seedModel.modelId);
      if (!existingModel) {
        await insertableDatabase
          .insert(modelProviderCredentialModels)
          .values({
            companyId,
            description: seedModel.description,
            isDefault: false,
            modelId: seedModel.modelId,
            modelProviderCredentialId: credentialId,
            name: seedModel.name,
            reasoningLevels: seedModel.reasoningLevels,
            reasoningSupported: seedModel.reasoningSupported,
          });
        continue;
      }

      await updatableDatabase
        .update(modelProviderCredentialModels)
        .set({
          description: seedModel.description,
          name: seedModel.name,
          reasoningLevels: seedModel.reasoningLevels,
          reasoningSupported: seedModel.reasoningSupported,
        })
        .where(and(
          eq(modelProviderCredentialModels.companyId, companyId),
          eq(modelProviderCredentialModels.id, existingModel.id),
        ));
    }

    const defaultModelId = this.resolveCompanyHelmDefaultModelId(seedModels.map((model) => model.modelId));
    await updatableDatabase
      .update(modelProviderCredentialModels)
      .set({
        isDefault: false,
      })
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
      ));
    if (defaultModelId) {
      await updatableDatabase
        .update(modelProviderCredentialModels)
        .set({
          isDefault: true,
        })
        .where(and(
          eq(modelProviderCredentialModels.companyId, companyId),
          eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
          eq(modelProviderCredentialModels.modelId, defaultModelId),
        ));
    }
  }

  private resolveCompanyHelmDefaultModelId(modelIds: string[]): string | null {
    const configuredDefaultModelId = this.companyHelmLlmProviderService.getDefaultModelId();
    if (configuredDefaultModelId && modelIds.includes(configuredDefaultModelId)) {
      return configuredDefaultModelId;
    }

    return modelIds[0] ?? null;
  }

  private async ensureCompanyHelmSeedAgent(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    computeProviderDefinitionId: string,
    modelProviderCredentialId: string,
  ): Promise<AgentRecord> {
    const existingAgent = await this.findCompanyHelmSeedAgent(transaction, companyId);
    if (existingAgent) {
      return existingAgent;
    }

    const defaultModel = await this.findCompanyHelmDefaultModel(
      transaction,
      companyId,
      modelProviderCredentialId,
    );
    if (!defaultModel) {
      throw new Error("Failed to resolve CompanyHelm default model for the seed agent.");
    }

    const now = new Date();
    const seedAgentId = randomUUID();
    await (transaction as BootstrapInsertableDatabase)
      .insert(agents)
      .values({
        companyId,
        created_at: now,
        defaultComputeProviderDefinitionId: computeProviderDefinitionId,
        defaultEnvironmentTemplateId: CompanyBootstrapService.SEED_AGENT_ENVIRONMENT_TEMPLATE_ID,
        defaultModelProviderCredentialModelId: defaultModel.id,
        default_reasoning_level: this.resolveCompanyHelmDefaultReasoningLevel(defaultModel.reasoningLevels ?? []),
        id: seedAgentId,
        name: CompanyBootstrapService.SEED_AGENT_NAME,
        system_prompt: null,
        updated_at: now,
      });

    return { id: seedAgentId };
  }

  private async findCompanyHelmSeedAgent(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<AgentRecord | null> {
    const [existingAgent] = await transaction
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.name, CompanyBootstrapService.SEED_AGENT_NAME),
      ))
      .limit(1) as AgentRecord[];

    return existingAgent ?? null;
  }

  private async ensureCompanyHelmSeedAgentSystemSkills(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    agentId: string,
  ): Promise<void> {
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const now = new Date();

    for (const systemSkill of this.systemSkillRegistry.listSkills(companyId)) {
      if (!systemSkill.systemKey) {
        continue;
      }

      const insertOperation = insertableDatabase
        .insert(agentSkills)
        .values({
          agentId,
          companyId,
          createdAt: now,
          createdByUserId: null,
          skillId: null,
          systemSkillKey: systemSkill.systemKey,
        }) as BootstrapInsertOperation;
      await insertOperation.onConflictDoNothing();
    }
  }

  private async ensureCompanyOnboardingWorkflow(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const [existingWorkflow] = await transaction
      .select({
        id: workflowDefinitions.id,
      })
      .from(workflowDefinitions)
      .where(and(
        eq(workflowDefinitions.companyId, companyId),
        eq(workflowDefinitions.name, CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_NAME),
      ))
      .limit(1) as Array<{ id: string }>;

    const now = new Date();
    const workflowDefinitionId = existingWorkflow?.id ?? randomUUID();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const mutableDatabase = transaction as BootstrapMutableDatabase;
    if (existingWorkflow) {
      await mutableDatabase
        .update(workflowDefinitions)
        .set({
          description: CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_DESCRIPTION,
          instructions_template: CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_INSTRUCTIONS,
          isEnabled: true,
          updatedAt: now,
        })
        .where(and(
          eq(workflowDefinitions.companyId, companyId),
          eq(workflowDefinitions.id, workflowDefinitionId),
        ));
      await mutableDatabase
        .delete(workflowDefinitionInputs)
        .where(and(
          eq(workflowDefinitionInputs.companyId, companyId),
          eq(workflowDefinitionInputs.workflowDefinitionId, workflowDefinitionId),
        ));
      await mutableDatabase
        .delete(workflowStepDefinitions)
        .where(eq(workflowStepDefinitions.workflowDefinitionId, workflowDefinitionId));
    } else {
      await insertableDatabase
        .insert(workflowDefinitions)
        .values({
          companyId,
          createdAt: now,
          createdByAgentId: null,
          createdByUserId: null,
          description: CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_DESCRIPTION,
          id: workflowDefinitionId,
          instructions_template: CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_INSTRUCTIONS,
          isEnabled: true,
          name: CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_NAME,
          updatedAt: now,
        });
    }
    for (const input of CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_INPUTS) {
      await insertableDatabase
        .insert(workflowDefinitionInputs)
        .values({
          companyId,
          createdAt: now,
          defaultValue: input.defaultValue,
          description: input.description,
          isRequired: input.isRequired,
          name: input.name,
          workflowDefinitionId,
        });
    }
    for (const [index, step] of CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_STEPS.entries()) {
      await insertableDatabase
        .insert(workflowStepDefinitions)
        .values({
          createdAt: now,
          instructions_template: step.instructions,
          name: step.name,
          ordinal: index + 1,
          stepId: step.stepId,
          workflowDefinitionId,
        });
    }
  }

  private async ensureCompanyOnboardingState(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const now = new Date();
    const insertOperation = (transaction as BootstrapInsertableDatabase)
      .insert(companyOnboardings)
      .values({
        agentId: null,
        companyId,
        completedAt: null,
        createdAt: now,
        sessionId: null,
        skippedAt: null,
        skippedByUserId: null,
        startedAt: null,
        status: "not_started",
        updatedAt: now,
        workflowRunId: null,
      }) as BootstrapInsertOperation;
    await insertOperation.onConflictDoNothing();
  }

  private async findCompanyHelmDefaultModel(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    credentialId: string,
  ): Promise<ModelProviderCredentialModelRecord | null> {
    const models = await (transaction
      .select({
        id: modelProviderCredentialModels.id,
        isDefault: modelProviderCredentialModels.isDefault,
        modelId: modelProviderCredentialModels.modelId,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
      )) as unknown as Promise<ModelProviderCredentialModelRecord[]>);

    return models.find((model) => model.isDefault) ?? null;
  }

  private resolveCompanyHelmDefaultReasoningLevel(reasoningLevels: string[]): string | null {
    const defaultReasoningLevel = this.companyHelmLlmProviderService.getDefaultReasoningLevel();
    if (defaultReasoningLevel && reasoningLevels.includes(defaultReasoningLevel)) {
      return defaultReasoningLevel;
    }

    return reasoningLevels[0] ?? null;
  }

  private async ensureDefaultTaskStages(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const updatableDatabase = transaction as BootstrapUpdatableDatabase;
    for (const stageName of CompanyBootstrapService.SEEDED_TASK_STAGE_NAMES) {
      const now = new Date();
      const insertOperation = insertableDatabase
        .insert(taskStages)
        .values({
          companyId,
          createdAt: now,
          isDefault: false,
          name: stageName,
          updatedAt: now,
        }) as BootstrapInsertOperation;
      await insertOperation.onConflictDoNothing();
    }

    // Backlog is the durable intake lane for tasks created without an explicit stage. Resetting
    // before marking it default keeps repeated bootstrap calls valid even after manual data edits.
    await updatableDatabase
      .update(taskStages)
      .set({
        isDefault: false,
      })
      .where(eq(taskStages.companyId, companyId));
    await updatableDatabase
      .update(taskStages)
      .set({
        isDefault: true,
      })
      .where(and(
        eq(taskStages.companyId, companyId),
        eq(taskStages.name, CompanyBootstrapService.DEFAULT_TASK_STAGE_NAME),
      ));
  }
}
