import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import {
  agentSkills,
  agents,
  companyMembers,
  companyModelProviderDefaults,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  taskStages,
} from "../../db/schema.ts";
import type { ComputeProvider } from "../environments/providers/provider_interface.ts";
import { CompanyHelmComputeProviderService } from "../compute_provider_definitions/companyhelm_service.ts";
import { SystemSkillRegistry } from "../skills/system_registry.ts";
import { TaskStageService } from "../task_stage_service.ts";

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
  modelProviderCredentialId: string;
};

type ModelProviderCredentialModelRecord = {
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId?: string;
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
  private static readonly SEED_AGENT_REASONING_LEVEL = "medium";
  private readonly companyHelmComputeProviderService: CompanyHelmComputeProviderService;
  private readonly systemSkillRegistry = new SystemSkillRegistry();

  constructor(
    @inject(CompanyHelmComputeProviderService)
    companyHelmComputeProviderService: CompanyHelmComputeProviderService,
  ) {
    this.companyHelmComputeProviderService = companyHelmComputeProviderService;
  }

  async ensureMembership(
    transaction: DatabaseTransactionInterface,
    params: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    const [existingMembership] = await transaction
      .select({
        role: companyMembers.role,
        status: companyMembers.status,
      })
      .from(companyMembers)
      .where(and(
        eq(companyMembers.companyId, params.companyId),
        eq(companyMembers.userId, params.userId),
      ))
      .limit(1) as Array<{
      role: "admin" | "member";
      status: "active" | "invited";
    }>;
    if (existingMembership) {
      if (existingMembership.status === "invited") {
        if (!transaction.update) {
          throw new Error("Configured database does not support membership updates.");
        }

        await transaction
          .update(companyMembers)
          .set({
            status: "active",
            updatedAt: new Date(),
          })
          .where(and(
            eq(companyMembers.companyId, params.companyId),
            eq(companyMembers.userId, params.userId),
          ));
      }

      return;
    }

    const existingCompanyMembers = await transaction
      .select({
        userId: companyMembers.userId,
      })
      .from(companyMembers)
      .where(eq(companyMembers.companyId, params.companyId))
      .limit(1) as Array<{
      userId: string;
    }>;
    const now = new Date();
    const insertableDatabase = transaction as BootstrapInsertableDatabase;
    const insertOperation = insertableDatabase
      .insert(companyMembers)
      .values({
        companyId: params.companyId,
        createdAt: now,
        role: existingCompanyMembers.length === 0 ? "admin" : "member",
        status: "active",
        updatedAt: now,
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
      llmSetupStatus: "pending" | "third_party" | "skipped";
    },
  ): Promise<void> {
    await this.ensureCompanyHelmComputeProviderDefinition(transaction, input.companyId);
    await this.ensureCompanyModelProviderDefault(transaction, input.companyId);

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

  private resolveSeedAgentDefaultReasoningLevel(reasoningLevels: string[]): string | null {
    if (reasoningLevels.includes(CompanyBootstrapService.SEED_AGENT_REASONING_LEVEL)) {
      return CompanyBootstrapService.SEED_AGENT_REASONING_LEVEL;
    }

    return reasoningLevels[0] ?? null;
  }

  private async resolveOnboardingAgentModelSelection(
    transaction: DatabaseTransactionInterface,
    input: {
      companyId: string;
      llmSetupStatus: "pending" | "third_party" | "skipped";
    },
  ): Promise<{ defaultModelProviderCredentialModelId: string | null; defaultReasoningLevel: string | null }> {
    const credentials = await this.listModelProviderCredentials(transaction, input.companyId);
    const defaultProviderSelection = await this.loadDefaultProviderSelection(transaction, input.companyId);
    const preferredCredential = this.selectPreferredCredential(credentials, defaultProviderSelection);
    if (preferredCredential) {
      const preferredModel = await this.findPreferredCredentialModel(
        transaction,
        input.companyId,
        preferredCredential.id,
      );
      if (preferredModel) {
        return {
          defaultModelProviderCredentialModelId: preferredModel.id,
          defaultReasoningLevel: this.resolveSeedAgentDefaultReasoningLevel(preferredModel.reasoningLevels ?? []),
        };
      }
    }

    if (input.llmSetupStatus !== "third_party") {
      return {
        defaultModelProviderCredentialModelId: null,
        defaultReasoningLevel: null,
      };
    }

    throw new Error("Company onboarding requires at least one user-provided synced model.");
  }

  private selectPreferredCredential(
    credentials: ModelProviderCredentialRecord[],
    defaultProviderSelection: DefaultProviderSelectionRecord | null,
  ): ModelProviderCredentialRecord | null {
    return credentials.find((credential) =>
      defaultProviderSelection?.modelProviderCredentialId === credential.id
    ) ?? credentials[0] ?? null;
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
    void transaction;
    void companyId;
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
