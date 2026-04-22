import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import {
  agentSkills,
  agents,
  companies,
  companyMembers,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  taskStages,
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
    "Guides a new company through mission capture, GitHub setup, codebase discovery, and first agent recommendations.";
  private static readonly SEED_ONBOARDING_WORKFLOW_INSTRUCTIONS = [
    "Run this workflow in the CEO onboarding chat for newly created companies.",
    "Keep the conversation focused and ask only one question at a time.",
    "Use chat for intent gathering, and use system commands or product tools for durable setup actions.",
    "Do not create agents or import skills without user confirmation.",
  ].join("\n");
  private static readonly SEED_ONBOARDING_WORKFLOW_STEPS = [{
    instructions: [
      "Ask one quick question: \"What is this company's mission, and what goals should its first agents help with?\"",
      "After the user answers, activate the Manage artifacts system skill.",
      "Call system_command with id \"artifact.markdown.create\" and input that creates an active company-scoped markdown artifact named \"Company mission and goals\".",
      "The artifact content should include short sections for Mission, Near-term goals, Constraints, and Open questions.",
      "Keep the saved document concise. Do not ask follow-up questions unless the answer is too vague to preserve.",
    ].join("\n"),
    name: "Capture company intent",
    stepId: "capture-company-intent",
  }, {
    instructions: [
      "Explain that GitHub is foundational for CompanyHelm because repository access lets agents clone code, understand the stack, make changes, open pull requests, and keep future agents grounded in real implementation context.",
      "Ask whether the user has GitHub repositories for this company.",
      "If yes, activate the Manage GitHub installations system skill and call system_command with id \"github.installation.start\".",
      "Show the returned installationUrl to the user and wait for the GitHub callback or user confirmation before continuing.",
      "If the user says they do not use GitHub, explain that codebase discovery and pull request workflows will be limited, then ask whether to skip the GitHub-dependent steps.",
    ].join("\n"),
    name: "Connect GitHub",
    stepId: "connect-github",
  }, {
    instructions: [
      "After GitHub setup completes, activate the Manage GitHub installations system skill and call system_command with id \"github.installation.list\".",
      "Clone every non-archived repository returned by the installation list with clone_github_repository, using the repository fullName and installationId from the list output.",
      "Explore each checkout for manifests, lockfiles, README files, package manager config, Dockerfiles, deployment files, CI config, database migrations, API boundaries, frontend frameworks, and test/build commands.",
      "Activate the Manage artifacts system skill. Call artifact.list for scopeType \"company\" first so you do not duplicate an existing tech stack document.",
      "Create or update an active company-scoped markdown artifact named \"Tech stack\" summarizing repositories scanned, languages, frameworks, runtime services, data stores, infrastructure, deployment path, important commands, and notable gaps.",
      "If cloning fails for any repository, include the failure and continue with the repositories that are available.",
    ].join("\n"),
    name: "Map the tech stack",
    stepId: "map-tech-stack",
  }, {
    instructions: [
      "Look for connected repositories whose names or descriptions match Agency Agents, agency-agents, agents, or GStack/gstack. If the exact repositories are not visible, ask the user for the owner/name values or for expanded GitHub App repository access.",
      "Clone the Agency Agents and GStack repositories when available and inspect their agent definitions, skills, prompts, setup docs, and examples.",
      "Activate the Manage skills system skill. If the user approves importing Superpowers-style development skills, call system_command with id \"skill.github.import\" using repository \"obra/superpowers\", branchName \"main\", and selected skillDirectory values such as \"skills/using-superpowers\", \"skills/systematic-debugging\", \"skills/writing-plans\", \"skills/executing-plans\", \"skills/using-git-worktrees\", \"skills/test-driven-development\", and \"skills/verification-before-completion\".",
      "Propose a small first team of 3 to 5 agents based on the mission and tech stack. For each proposed agent include name, responsibility, model/compute assumptions, useful skills, and the first task it should own.",
      "Ask for confirmation before creating agents. After approval, activate the Manage agents system skill and use agent.create plus agent.skill.attach or agent.skill_group.attach as needed.",
    ].join("\n"),
    name: "Propose starter agents",
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
      return existingCompany;
    }

    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(companies)
      .values({
        clerkOrganizationId: params.providerSubject,
        name: params.name,
      }) as BootstrapInsertOperation;
    const insertResult = insertOperation
      .onConflictDoNothing()
      .returning?.({
        id: companies.id,
        clerk_organization_id: companies.clerkOrganizationId,
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
    const [existingCredential] = await transaction
      .select({
        id: modelProviderCredentials.id,
        isManaged: modelProviderCredentials.isManaged,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, companyId),
        eq(modelProviderCredentials.isManaged, true),
      ))
      .limit(1) as ModelProviderCredentialRecord[];
    if (existingCredential) {
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
    if (existingWorkflow) {
      return;
    }

    const now = new Date();
    const workflowDefinitionId = randomUUID();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
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
    await insertableDatabase
      .insert(workflowStepDefinitions)
      .values(CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_STEPS.map((step, index) => ({
        createdAt: now,
        instructions_template: step.instructions,
        name: step.name,
        ordinal: index + 1,
        stepId: step.stepId,
        workflowDefinitionId,
      })));
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
