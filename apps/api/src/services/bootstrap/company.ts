import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import {
  agentSkills,
  agents,
  companies,
  companyMembers,
  companyModelProviderDefaults,
  companyOnboardings,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  platformModelRoutes,
  platformModels,
  taskStages,
  workflowDefinitionInputs,
  workflowDefinitions,
  workflowStepDefinitions,
} from "../../db/schema.ts";
import type { ComputeProvider } from "../environments/providers/provider_interface.ts";
import { ModelRegistry } from "../ai_providers/model_registry.ts";
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
  modelProvider: string;
};

type DefaultProviderSelectionRecord = {
  modelCredentialSource: "platform" | "user_provided";
  modelProviderCredentialId: string | null;
};

type ModelProviderCredentialModelRecord = {
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId?: string;
  reasoningLevels: string[] | null;
};

type PlatformModelRecord = {
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
    "Assume CompanyHelm-managed model access is active for the first conversation unless the user says otherwise.",
    "Treat GitHub access, custom LLM credentials, skill imports, agent creation, and task creation as just-in-time setup.",
    "Do not create agents, import skills, connect GitHub, or create tasks without explicit user confirmation. Explain what will happen before doing it.",
  ].join("\n");
  private static readonly SEED_ONBOARDING_WORKFLOW_INPUTS: Array<{
    defaultValue: string;
    description: string;
    isRequired: boolean;
    name: string;
  }> = [];
  private static readonly SEED_ONBOARDING_WORKFLOW_STEPS = [{
    instructions: [
      "Welcome the user to CompanyHelm as their CEO.",
      "Explain briefly that CompanyHelm-managed model access is already available for this setup conversation.",
      "Ask exactly one question: what does their business do, and what goal do they want to make progress on today?",
      "Use the answer as the working business context for later recommendations in this chat.",
      "Do not ask about GitHub, skills, agents, or tasks until the user has answered the business-and-goal question.",
    ].join("\n"),
    name: "Understand the business goal",
    stepId: "understand-business-goal",
  }, {
    instructions: [
      "Ask whether the user has a GitHub repository that matters for today's goal.",
      "If the user says yes, activate the Manage GitHub installations system skill and call github.installation.list.",
      "If no installation is connected, ask for confirmation before calling github.installation.start, then present the returned installationUrl.",
      "If GitHub is already connected, ask which repository should be inspected first.",
      "If the user says no or wants to skip GitHub, continue with goal-based setup without treating GitHub as required.",
    ].join("\n"),
    name: "Connect repo if useful",
    stepId: "connect-repo-if-useful",
  }, {
    instructions: [
      "Ask whether the user wants to create an Engineer agent for implementation work.",
      "Ask whether they already use particular engineering skills, playbooks, or development workflows.",
      "If they do not have a preference, propose a Superpowers-style development skill set for the Engineer and explain why it helps.",
      "Recommend a model before creating the Engineer: prefer GPT-5.5 with high reasoning for coding-heavy work, or GPT-5.5 with medium reasoning when speed and cost matter more.",
      "Ask for explicit confirmation before importing or creating skills, creating the Engineer agent, or attaching skills to it.",
      "After confirmation, activate Manage skills and Manage agents as needed, then use skill.list, skill.github.import or skill.create, agent.list, agent.create, and agent.skill.attach.",
      "Ask whether the user wants to create the first task and assign it to the Engineer.",
      "If confirmed, use create_task with assignedAgentId. Use status draft unless the user asks to start the task immediately, in which case use in_progress.",
    ].join("\n"),
    name: "Create engineer and first task",
    stepId: "create-engineer-and-first-task",
  }] as const;
  private readonly companyHelmComputeProviderService: CompanyHelmComputeProviderService;
  private readonly modelRegistry: ModelRegistry;
  private readonly systemSkillRegistry = new SystemSkillRegistry();

  constructor(
    @inject(CompanyHelmComputeProviderService)
    companyHelmComputeProviderService: CompanyHelmComputeProviderService,
    @inject(ModelRegistry)
    modelRegistry: ModelRegistry = new ModelRegistry(),
  ) {
    this.companyHelmComputeProviderService = companyHelmComputeProviderService;
    this.modelRegistry = modelRegistry;
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
  ): Promise<void> {
    await this.ensureCompanyHelmComputeProviderDefinition(transaction, companyId);
    await this.ensureCompanyModelProviderDefault(transaction, companyId);
    await this.ensureDefaultTaskStages(transaction, companyId);
  }

  async ensureOnboardingAssets(
    transaction: DatabaseTransactionInterface,
    input: {
      companyId: string;
      llmSetupStatus: "pending" | "third_party" | "company_managed" | "skipped";
    },
  ): Promise<void> {
    await this.ensureCompanyHelmComputeProviderDefinition(transaction, input.companyId);
    await this.ensureCompanyModelProviderDefault(transaction, input.companyId);
    await this.ensureCompanyOnboardingWorkflow(transaction, input.companyId);

    const computeProviderDefinition = await this.findCompanyHelmComputeProviderDefinition(transaction, input.companyId);
    if (!computeProviderDefinition) {
      throw new Error("Failed to resolve CompanyHelm compute provider definition for the CEO agent.");
    }

    const modelSelection = await this.resolveOnboardingAgentModelSelection(transaction, input);
    const seedAgent = await this.ensureCompanyHelmSeedAgent(
      transaction,
      input.companyId,
      computeProviderDefinition.id,
      modelSelection,
    );
    await this.ensureCompanyHelmSeedAgentSystemSkills(transaction, input.companyId, seedAgent.id);
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

  private async ensureCompanyHelmSeedAgent(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    computeProviderDefinitionId: string,
    modelSelection: {
      defaultModelCredentialSource: "platform" | "user_provided";
      defaultPlatformModelId: string | null;
      defaultModelProviderCredentialModelId: string | null;
      defaultReasoningLevel: string | null;
    },
  ): Promise<AgentRecord> {
    const existingAgent = await this.findCompanyHelmSeedAgent(transaction, companyId);
    if (existingAgent) {
      await (transaction as BootstrapUpdatableDatabase)
        .update(agents)
        .set({
          defaultComputeProviderDefinitionId: computeProviderDefinitionId,
          defaultModelCredentialSource: modelSelection.defaultModelCredentialSource,
          defaultPlatformModelId: modelSelection.defaultPlatformModelId,
          defaultModelProviderCredentialModelId: modelSelection.defaultModelProviderCredentialModelId,
          default_reasoning_level: modelSelection.defaultReasoningLevel,
          updated_at: new Date(),
        })
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, existingAgent.id),
        ));
      return existingAgent;
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
        defaultModelCredentialSource: modelSelection.defaultModelCredentialSource,
        defaultPlatformModelId: modelSelection.defaultPlatformModelId,
        defaultModelProviderCredentialModelId: modelSelection.defaultModelProviderCredentialModelId,
        default_reasoning_level: modelSelection.defaultReasoningLevel,
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
    const defaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider("companyhelm");
    if (defaultReasoningLevel && reasoningLevels.includes(defaultReasoningLevel)) {
      return defaultReasoningLevel;
    }

    return reasoningLevels[0] ?? null;
  }

  private async resolveOnboardingAgentModelSelection(
    transaction: DatabaseTransactionInterface,
    input: {
      companyId: string;
      llmSetupStatus: "pending" | "third_party" | "company_managed" | "skipped";
    },
  ): Promise<{
    defaultModelCredentialSource: "platform" | "user_provided";
    defaultPlatformModelId: string | null;
    defaultModelProviderCredentialModelId: string | null;
    defaultReasoningLevel: string | null;
  }> {
    const credentials = await this.listModelProviderCredentials(transaction, input.companyId);
    const defaultProviderSelection = await this.loadDefaultProviderSelection(transaction, input.companyId);
    if (input.llmSetupStatus !== "third_party") {
      const platformModel = await this.findPreferredPlatformModel(transaction);
      if (platformModel) {
        return {
          defaultModelCredentialSource: "platform",
          defaultPlatformModelId: platformModel.id,
          defaultModelProviderCredentialModelId: null,
          defaultReasoningLevel: this.resolveCompanyHelmDefaultReasoningLevel(platformModel.reasoningLevels ?? []),
        };
      }
    }

    const preferredCredential = this.selectPreferredCredential(credentials, defaultProviderSelection);
    if (preferredCredential) {
      const preferredModel = await this.findPreferredCredentialModel(
        transaction,
        input.companyId,
        preferredCredential.id,
      );
      if (preferredModel) {
        return {
          defaultModelCredentialSource: "user_provided",
          defaultPlatformModelId: null,
          defaultModelProviderCredentialModelId: preferredModel.id,
          defaultReasoningLevel: this.resolveCompanyHelmDefaultReasoningLevel(preferredModel.reasoningLevels ?? []),
        };
      }
    }

    const fallbackPlatformModel = await this.findPreferredPlatformModel(transaction);
    if (fallbackPlatformModel) {
      return {
        defaultModelCredentialSource: "platform",
        defaultPlatformModelId: fallbackPlatformModel.id,
        defaultModelProviderCredentialModelId: null,
        defaultReasoningLevel: this.resolveCompanyHelmDefaultReasoningLevel(fallbackPlatformModel.reasoningLevels ?? []),
      };
    }

    throw new Error("Company onboarding requires at least one synced model for the selected provider.");
  }

  private selectPreferredCredential(
    credentials: ModelProviderCredentialRecord[],
    defaultProviderSelection: DefaultProviderSelectionRecord | null,
  ): ModelProviderCredentialRecord | null {
    return credentials.find((credential) =>
      defaultProviderSelection?.modelCredentialSource === "user_provided"
      && defaultProviderSelection.modelProviderCredentialId === credential.id
    ) ?? credentials[0] ?? null;
  }

  private async findPreferredPlatformModel(
    transaction: DatabaseTransactionInterface,
  ): Promise<PlatformModelRecord | null> {
    const routeRecords = await transaction
      .select({
        platformModelId: platformModelRoutes.platformModelId,
      })
      .from(platformModelRoutes)
      .where(eq(platformModelRoutes.platformModelId, platformModelRoutes.platformModelId)) as unknown as Array<{
        platformModelId: string;
      }>;
    const platformModelIdsWithRoutes = new Set(routeRecords.map((routeRecord) => routeRecord.platformModelId));
    if (platformModelIdsWithRoutes.size === 0) {
      return null;
    }

    const models = await transaction
      .select({
        id: platformModels.id,
        isDefault: platformModels.isDefault,
        modelId: platformModels.modelId,
        reasoningLevels: platformModels.reasoningLevels,
      })
      .from(platformModels)
      .where(eq(platformModels.isAvailable, true)) as unknown as PlatformModelRecord[];
    const routedModels = models.filter((model) => platformModelIdsWithRoutes.has(model.id));

    return routedModels.find((model) => model.isDefault) ?? routedModels[0] ?? null;
  }

  private async listModelProviderCredentials(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<ModelProviderCredentialRecord[]> {
    return transaction
      .select({
        id: modelProviderCredentials.id,
        modelProvider: modelProviderCredentials.modelProvider,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.status, "active"),
      ))
      .limit(20) as Promise<ModelProviderCredentialRecord[]>;
  }

  private async loadDefaultProviderSelection(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<DefaultProviderSelectionRecord | null> {
    const [defaultProviderSelection] = await transaction
      .select({
        modelCredentialSource: companyModelProviderDefaults.modelCredentialSource,
        modelProviderCredentialId: companyModelProviderDefaults.modelProviderCredentialId,
      })
      .from(companyModelProviderDefaults)
      .where(eq(companyModelProviderDefaults.companyId, companyId))
      .limit(1) as DefaultProviderSelectionRecord[];

    return defaultProviderSelection ?? null;
  }

  private async ensureCompanyModelProviderDefault(
    transaction: DatabaseTransactionInterface,
    companyId: string,
  ): Promise<void> {
    const now = new Date();
    const insertOperation = (transaction as BootstrapInsertableDatabase)
      .insert(companyModelProviderDefaults)
      .values({
        companyId,
        createdAt: now,
        modelCredentialSource: "platform",
        modelProviderCredentialId: null,
        updatedAt: now,
      }) as BootstrapInsertOperation;
    await insertOperation.onConflictDoNothing();
  }

  private async findPreferredCredentialModel(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    credentialId: string,
  ): Promise<ModelProviderCredentialModelRecord | null> {
    const models = await (transaction
      .select({
        id: modelProviderCredentialModels.id,
        isDefault: modelProviderCredentialModels.isDefault,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, companyId),
        eq(modelProviderCredentialModels.modelProviderCredentialId, credentialId),
      )) as unknown as Promise<ModelProviderCredentialModelRecord[]>);

    return models.find((model) => model.isDefault) ?? models[0] ?? null;
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
