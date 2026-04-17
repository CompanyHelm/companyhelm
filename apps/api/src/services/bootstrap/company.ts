import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { DatabaseTransactionInterface } from "../../db/database_interface.ts";
import {
  agents,
  companies,
  companyMembers,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
  taskStages,
} from "../../db/schema.ts";
import type { ComputeProvider } from "../environments/providers/provider_interface.ts";
import { CompanyHelmLlmProviderService } from "../ai_providers/companyhelm_service.ts";
import { CompanyHelmComputeProviderService } from "../compute_provider_definitions/companyhelm_service.ts";

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
  static readonly DEFAULT_TASK_CATEGORY_NAMES = ["Backlog", "TODO", "Archive"] as const;
  static readonly SEED_AGENT_NAME = "CEO";
  private static readonly SEED_AGENT_ENVIRONMENT_TEMPLATE_ID = "medium";
  private readonly companyHelmComputeProviderService: CompanyHelmComputeProviderService;
  private readonly companyHelmLlmProviderService: CompanyHelmLlmProviderService;

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
    if (options.seedAgent && modelProviderCredential) {
      const computeProviderDefinition = await this.findCompanyHelmComputeProviderDefinition(transaction, companyId);
      if (!computeProviderDefinition) {
        throw new Error("Failed to resolve CompanyHelm compute provider definition for the seed agent.");
      }

      await this.ensureCompanyHelmSeedAgent(
        transaction,
        companyId,
        computeProviderDefinition.id,
        modelProviderCredential.id,
      );
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
  ): Promise<void> {
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
    if (existingAgent) {
      return;
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
    await (transaction as BootstrapInsertableDatabase)
      .insert(agents)
      .values({
        companyId,
        created_at: now,
        defaultComputeProviderDefinitionId: computeProviderDefinitionId,
        defaultEnvironmentTemplateId: CompanyBootstrapService.SEED_AGENT_ENVIRONMENT_TEMPLATE_ID,
        defaultModelProviderCredentialModelId: defaultModel.id,
        default_reasoning_level: this.resolveCompanyHelmDefaultReasoningLevel(defaultModel.reasoningLevels ?? []),
        name: CompanyBootstrapService.SEED_AGENT_NAME,
        system_prompt: null,
        updated_at: now,
      });
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
    for (const stageName of CompanyBootstrapService.DEFAULT_TASK_CATEGORY_NAMES) {
      const now = new Date();
      const insertOperation = insertableDatabase
        .insert(taskStages)
        .values({
          companyId,
          createdAt: now,
          name: stageName,
          updatedAt: now,
        }) as BootstrapInsertOperation;
      await insertOperation.onConflictDoNothing();
    }
  }
}
