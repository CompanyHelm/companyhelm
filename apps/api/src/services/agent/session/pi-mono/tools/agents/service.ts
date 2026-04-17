import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentDefaultSecrets,
  agents,
  companySecrets,
  computeProviderDefinitions,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../../../../../../db/schema.ts";
import type {
  AppRuntimeTransaction,
  TransactionProviderInterface,
} from "../../../../../../db/transaction_provider_interface.ts";
import { ModelRegistry } from "../../../../../ai_providers/model_registry.ts";
import {
  type ModelProviderId,
  ModelProviderService,
} from "../../../../../ai_providers/model_provider_service.ts";
import type {
  AgentEnvironmentTemplate,
  ComputeProvider,
} from "../../../../../environments/providers/provider_interface.ts";
import { AgentEnvironmentTemplateService } from "../../../../../environments/template_service.ts";
import { ComputeProviderDefinitionService } from "../../../../../compute_provider_definitions/service.ts";
import { SecretService } from "../../../../../secrets/service.ts";

export type AgentManagementToolEnvironmentTemplate = AgentEnvironmentTemplate;

export type AgentManagementToolSecret = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  updatedAt: Date;
};

export type AgentManagementToolAgent = {
  companyId: string;
  createdAt: Date;
  defaultComputeProvider: ComputeProvider | null;
  defaultComputeProviderDefinitionId: string | null;
  defaultComputeProviderDefinitionName: string | null;
  defaultEnvironmentTemplateId: string;
  environmentTemplate: AgentManagementToolEnvironmentTemplate;
  id: string;
  isCurrentAgent: boolean;
  modelDescription: string | null;
  modelId: string | null;
  modelName: string | null;
  modelProvider: ModelProviderId | null;
  modelProviderCredentialId: string | null;
  modelProviderCredentialLabel: string | null;
  modelProviderCredentialModelId: string | null;
  name: string;
  reasoningLevel: string | null;
  secrets: AgentManagementToolSecret[];
  supportedReasoningLevels: string[];
  systemPrompt: string | null;
  updatedAt: Date;
};

export type AgentManagementToolCredentialModelOption = {
  description: string;
  id: string;
  modelId: string;
  name: string;
  reasoningSupported: boolean;
  reasoningLevels: string[];
};

export type AgentManagementToolCredentialOption = {
  defaultModelId: string | null;
  defaultReasoningLevel: string | null;
  id: string;
  isDefault: boolean;
  label: string;
  modelProvider: ModelProviderId;
  models: AgentManagementToolCredentialModelOption[];
};

export type AgentManagementToolComputeProviderDefinition = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  e2b: {
    hasApiKey: boolean;
  };
  id: string;
  isDefault: boolean;
  name: string;
  provider: ComputeProvider;
  templates: AgentManagementToolEnvironmentTemplate[];
  updatedAt: Date;
};

export type AgentManagementToolSnapshot = {
  agents: AgentManagementToolAgent[];
  availableComputeProviderDefinitions: AgentManagementToolComputeProviderDefinition[];
  availableSecrets: AgentManagementToolSecret[];
  currentAgentId: string;
  providerOptions: AgentManagementToolCredentialOption[];
};

export type AgentManagementToolCreateAgentInput = {
  defaultComputeProviderDefinitionId: string;
  defaultEnvironmentTemplateId: string;
  modelProviderCredentialId?: string | null;
  modelProviderCredentialModelId: string;
  name: string;
  reasoningLevel?: string | null;
  secretIds?: string[] | null;
  systemPrompt?: string | null;
};

export type AgentManagementToolUpdateAgentInput = {
  defaultComputeProviderDefinitionId?: string | null;
  defaultEnvironmentTemplateId?: string | null;
  id: string;
  modelProviderCredentialId?: string | null;
  modelProviderCredentialModelId?: string | null;
  name?: string | null;
  reasoningLevel?: string | null;
  secretIds?: string[] | null;
  systemPrompt?: string | null;
};

type AgentBaseRecord = {
  companyId: string;
  createdAt: Date;
  defaultComputeProviderDefinitionId: string | null;
  defaultEnvironmentTemplateId: string;
  defaultModelProviderCredentialModelId: string | null;
  defaultReasoningLevel: string | null;
  id: string;
  name: string;
  systemPrompt: string | null;
  updatedAt: Date;
};

type AgentSecretAttachmentRecord = {
  agentId: string;
  secretId: string;
};

type CredentialRecord = {
  id: string;
  isDefault: boolean;
  isManaged: boolean;
  modelProvider: ModelProviderId;
  name: string;
};

type ComputeProviderDefinitionRecord = {
  id: string;
  isDefault: boolean;
  name: string;
  provider: ComputeProvider;
};

type ExistingAgentRecord = AgentBaseRecord;

type ModelRecord = {
  description: string;
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  name: string;
  reasoningSupported: boolean;
  reasoningLevels: string[] | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

/**
 * Binds the company-scoped agent configuration catalog to the current PI Mono run. It exposes the
 * full editable agent state plus the option catalogs needed to create or update agents without the
 * tool layer having to understand the surrounding GraphQL mutations.
 */
@injectable()
export class AgentManagementToolService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly currentAgentId: string;
  private readonly secretService: SecretService;
  private readonly templateService: AgentEnvironmentTemplateService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly modelProviderService: ModelProviderService;
  private readonly modelRegistry: ModelRegistry;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    currentAgentId: string,
    @inject(SecretService) secretService: SecretService,
    @inject(AgentEnvironmentTemplateService)
    templateService: AgentEnvironmentTemplateService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(ModelProviderService) modelProviderService: ModelProviderService,
    @inject(ModelRegistry) modelRegistry: ModelRegistry,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.currentAgentId = currentAgentId;
    this.secretService = secretService;
    this.templateService = templateService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.modelProviderService = modelProviderService;
    this.modelRegistry = modelRegistry;
  }

  async createAgent(input: AgentManagementToolCreateAgentInput): Promise<AgentManagementToolAgent> {
    if (input.name.length === 0) {
      throw new Error("name is required.");
    }
    if (input.modelProviderCredentialModelId.length === 0) {
      throw new Error("modelProviderCredentialModelId is required.");
    }
    if (input.defaultComputeProviderDefinitionId.length === 0) {
      throw new Error("defaultComputeProviderDefinitionId is required.");
    }
    if (input.defaultEnvironmentTemplateId.length === 0) {
      throw new Error("defaultEnvironmentTemplateId is required.");
    }

    return this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const scopedTransactionProvider = this.createScopedTransactionProvider(tx);
      const resolvedModelSelection = await this.resolveModelSelection(selectableDatabase, {
        modelProviderCredentialId: input.modelProviderCredentialId ?? null,
        modelProviderCredentialModelId: input.modelProviderCredentialModelId,
      });
      const computeProviderDefinition = await this.requireComputeProviderDefinition(
        selectableDatabase,
        input.defaultComputeProviderDefinitionId,
      );
      const environmentTemplate = await this.templateService.resolveTemplateForProvider(
        scopedTransactionProvider,
        {
          companyId: this.companyId,
          providerDefinitionId: computeProviderDefinition.id,
          templateId: input.defaultEnvironmentTemplateId,
        },
      );
      const reasoningLevel = this.resolveReasoningLevel(
        input.reasoningLevel,
        resolvedModelSelection.credential,
        resolvedModelSelection.model,
      );
      const now = new Date();
      const [createdAgent] = await insertableDatabase
        .insert(agents)
        .values({
          companyId: this.companyId,
          created_at: now,
          defaultComputeProviderDefinitionId: computeProviderDefinition.id,
          defaultEnvironmentTemplateId: environmentTemplate.templateId,
          defaultModelProviderCredentialModelId: resolvedModelSelection.model.id,
          default_reasoning_level: reasoningLevel,
          name: input.name,
          system_prompt: this.resolveSystemPrompt(input.systemPrompt),
          updated_at: now,
        })
        .returning?.(this.agentSelection()) as AgentBaseRecord[];
      if (!createdAgent) {
        throw new Error("Failed to create agent.");
      }

      await this.replaceAgentSecrets(
        createdAgent.id,
        input.secretIds,
        scopedTransactionProvider,
        tx as SelectableDatabase & InsertableDatabase & DeletableDatabase,
      );

      return this.loadRequiredAgentFromDatabase(
        selectableDatabase,
        scopedTransactionProvider,
        createdAgent.id,
      );
    });
  }

  async listAgents(): Promise<AgentManagementToolSnapshot> {
    const [
      agents_,
      providerOptions,
      availableComputeProviderDefinitions,
      availableSecrets,
    ] = await Promise.all([
      this.loadAllAgents(),
      this.loadProviderOptions(),
      this.loadAvailableComputeProviderDefinitions(),
      this.secretService.listSecrets(this.transactionProvider, this.companyId),
    ]);

    return {
      agents: agents_,
      availableComputeProviderDefinitions,
      availableSecrets,
      currentAgentId: this.currentAgentId,
      providerOptions,
    };
  }

  async updateAgent(input: AgentManagementToolUpdateAgentInput): Promise<AgentManagementToolAgent> {
    if (input.id.length === 0) {
      throw new Error("id is required.");
    }

    return this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const scopedTransactionProvider = this.createScopedTransactionProvider(tx);
      const existingAgent = await this.requireExistingAgent(selectableDatabase, input.id);
      const nextName = input.name === undefined ? existingAgent.name : this.requireNonEmptyName(input.name);
      const nextSystemPrompt = input.systemPrompt === undefined
        ? existingAgent.systemPrompt
        : this.resolveSystemPrompt(input.systemPrompt);
      const nextModelId = input.modelProviderCredentialModelId === undefined
        ? existingAgent.defaultModelProviderCredentialModelId
        : input.modelProviderCredentialModelId;
      if (!nextModelId) {
        throw new Error("modelProviderCredentialModelId is required.");
      }
      const resolvedModelSelection = await this.resolveModelSelection(selectableDatabase, {
        modelProviderCredentialId: input.modelProviderCredentialId ?? null,
        modelProviderCredentialModelId: nextModelId,
      });
      const nextComputeProviderDefinitionId = input.defaultComputeProviderDefinitionId === undefined
        ? existingAgent.defaultComputeProviderDefinitionId
        : input.defaultComputeProviderDefinitionId;
      if (!nextComputeProviderDefinitionId) {
        throw new Error("defaultComputeProviderDefinitionId is required.");
      }
      const computeProviderDefinition = await this.requireComputeProviderDefinition(
        selectableDatabase,
        nextComputeProviderDefinitionId,
      );
      const nextEnvironmentTemplateId = input.defaultEnvironmentTemplateId === undefined
        ? (
          input.defaultComputeProviderDefinitionId === undefined
            ? existingAgent.defaultEnvironmentTemplateId
            : await this.resolveDefaultEnvironmentTemplateId(
              scopedTransactionProvider,
              nextComputeProviderDefinitionId,
            )
        )
        : input.defaultEnvironmentTemplateId;
      if (!nextEnvironmentTemplateId) {
        throw new Error("defaultEnvironmentTemplateId is required.");
      }
      const environmentTemplate = await this.templateService.resolveTemplateForProvider(
        scopedTransactionProvider,
        {
          companyId: this.companyId,
          providerDefinitionId: computeProviderDefinition.id,
          templateId: nextEnvironmentTemplateId,
        },
      );
      const reasoningLevel = this.resolveReasoningLevel(
        input.reasoningLevel === undefined
          ? (
            resolvedModelSelection.model.id === existingAgent.defaultModelProviderCredentialModelId
              ? existingAgent.defaultReasoningLevel
              : undefined
          )
          : input.reasoningLevel,
        resolvedModelSelection.credential,
        resolvedModelSelection.model,
      );

      const [updatedAgent] = await updatableDatabase
        .update(agents)
        .set({
          defaultComputeProviderDefinitionId: computeProviderDefinition.id,
          defaultEnvironmentTemplateId: environmentTemplate.templateId,
          defaultModelProviderCredentialModelId: resolvedModelSelection.model.id,
          default_reasoning_level: reasoningLevel,
          name: nextName,
          system_prompt: nextSystemPrompt,
          updated_at: new Date(),
        })
        .where(and(
          eq(agents.companyId, this.companyId),
          eq(agents.id, input.id),
        ))
        .returning?.(this.agentSelection()) as AgentBaseRecord[];
      if (!updatedAgent) {
        throw new Error("Failed to update agent.");
      }

      if (input.secretIds !== undefined) {
        await this.replaceAgentSecrets(
          updatedAgent.id,
          input.secretIds,
          scopedTransactionProvider,
          tx as SelectableDatabase & InsertableDatabase & DeletableDatabase,
        );
      }

      return this.loadRequiredAgentFromDatabase(
        selectableDatabase,
        scopedTransactionProvider,
        updatedAgent.id,
      );
    });
  }

  private agentSelection(): Record<string, unknown> {
    return {
      companyId: agents.companyId,
      createdAt: agents.created_at,
      defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
      defaultEnvironmentTemplateId: agents.defaultEnvironmentTemplateId,
      defaultModelProviderCredentialModelId: agents.defaultModelProviderCredentialModelId,
      defaultReasoningLevel: agents.default_reasoning_level,
      id: agents.id,
      name: agents.name,
      systemPrompt: agents.system_prompt,
      updatedAt: agents.updated_at,
    };
  }

  private async loadAllAgents(): Promise<AgentManagementToolAgent[]> {
    return this.transactionProvider.transaction(async (tx) => {
      return this.loadAgentSummaries(
        tx as SelectableDatabase,
        this.createScopedTransactionProvider(tx),
      );
    });
  }

  private async loadAvailableComputeProviderDefinitions(): Promise<AgentManagementToolComputeProviderDefinition[]> {
    const definitions = await this.computeProviderDefinitionService.listDefinitions(
      this.transactionProvider,
      this.companyId,
    );
    const templatesByDefinitionId = new Map(
      await Promise.all(definitions.map(async (definition) => {
        const templates = await this.templateService.listTemplatesForProvider(
          this.transactionProvider,
          this.companyId,
          definition.id,
        );
        return [definition.id, templates] as const;
      })),
    );

    return definitions.map((definition) => ({
      ...definition,
      templates: templatesByDefinitionId.get(definition.id) ?? [],
    }));
  }

  private async loadProviderOptions(): Promise<AgentManagementToolCredentialOption[]> {
    return this.transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const credentialRecords = await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          isDefault: modelProviderCredentials.isDefault,
          isManaged: modelProviderCredentials.isManaged,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
        })
        .from(modelProviderCredentials)
        .where(eq(modelProviderCredentials.companyId, this.companyId)) as CredentialRecord[];
      const modelRecords = await selectableDatabase
        .select({
          description: modelProviderCredentialModels.description,
          id: modelProviderCredentialModels.id,
          isDefault: modelProviderCredentialModels.isDefault,
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          name: modelProviderCredentialModels.name,
          reasoningSupported: modelProviderCredentialModels.reasoningSupported,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(eq(modelProviderCredentialModels.companyId, this.companyId)) as ModelRecord[];

      return credentialRecords
        .map((credentialRecord) => {
          const credentialModelRecords = modelRecords
            .filter((modelRecord) => modelRecord.modelProviderCredentialId === credentialRecord.id);
          const credentialModels = credentialModelRecords
            .map((modelRecord) => ({
              description: modelRecord.description,
              id: modelRecord.id,
              modelId: modelRecord.modelId,
              name: modelRecord.name,
              reasoningSupported: modelRecord.reasoningSupported,
              reasoningLevels: modelRecord.reasoningLevels ?? [],
            }));
          const defaultModelRecord = credentialModelRecords.find((modelRecord) => modelRecord.isDefault)
            ?? credentialModelRecords.find((modelRecord) =>
              modelRecord.modelId === this.modelRegistry.getDefaultModelForProvider(credentialRecord.modelProvider)
            )
            ?? credentialModelRecords[0]
            ?? null;
          const providerDefaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider(
            credentialRecord.modelProvider,
          );

          return {
            defaultModelId: defaultModelRecord?.modelId ?? null,
            defaultReasoningLevel: providerDefaultReasoningLevel
              && defaultModelRecord?.reasoningLevels?.includes(providerDefaultReasoningLevel)
              ? providerDefaultReasoningLevel
              : (defaultModelRecord?.reasoningLevels?.[0] ?? null),
            id: credentialRecord.id,
            isDefault: credentialRecord.isDefault,
            label: this.resolveCredentialLabel(credentialRecord),
            modelProvider: credentialRecord.modelProvider,
            models: credentialModels,
          };
        })
        .sort((left, right) => Number(right.isDefault) - Number(left.isDefault))
        .filter((credentialRecord) => credentialRecord.models.length > 0);
    });
  }

  private async loadRequiredAgentFromDatabase(
    selectableDatabase: SelectableDatabase,
    transactionProvider: TransactionProviderInterface,
    agentId: string,
  ): Promise<AgentManagementToolAgent> {
    const agents_ = await this.loadAgentSummaries(selectableDatabase, transactionProvider, [agentId]);
    const agent = agents_[0];
    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }

  private async loadAgentSummaries(
    selectableDatabase: SelectableDatabase,
    transactionProvider: TransactionProviderInterface,
    agentIds?: string[],
  ): Promise<AgentManagementToolAgent[]> {
    const baseAgents = await selectableDatabase
      .select(this.agentSelection())
      .from(agents)
      .where(
        agentIds && agentIds.length > 0
          ? and(eq(agents.companyId, this.companyId), inArray(agents.id, agentIds))
          : eq(agents.companyId, this.companyId),
      ) as AgentBaseRecord[];
    if (baseAgents.length === 0) {
      return [];
    }

    const resolvedAgentIds = baseAgents.map((agent) => agent.id);
    const computeProviderDefinitionIds = [...new Set(
      baseAgents
        .map((agent) => agent.defaultComputeProviderDefinitionId)
        .filter((value): value is string => typeof value === "string"),
    )];
    const templatesByDefinitionId = new Map(
      await Promise.all(computeProviderDefinitionIds.map(async (definitionId) => {
        const templates = await this.templateService.listTemplatesForProvider(
          transactionProvider,
          this.companyId,
          definitionId,
        );
        return [definitionId, templates] as const;
      })),
    );
    const secretAttachmentRecords = await selectableDatabase
      .select({
        agentId: agentDefaultSecrets.agentId,
        secretId: agentDefaultSecrets.secretId,
      })
      .from(agentDefaultSecrets)
      .where(and(
        eq(agentDefaultSecrets.companyId, this.companyId),
        inArray(agentDefaultSecrets.agentId, resolvedAgentIds),
      )) as AgentSecretAttachmentRecord[];

    const secretIds = [...new Set(secretAttachmentRecords.map((record) => record.secretId))];
    const secretRecords = secretIds.length === 0
      ? []
      : await selectableDatabase
        .select({
          companyId: companySecrets.companyId,
          createdAt: companySecrets.createdAt,
          description: companySecrets.description,
          envVarName: companySecrets.envVarName,
          id: companySecrets.id,
          name: companySecrets.name,
          updatedAt: companySecrets.updatedAt,
        })
        .from(companySecrets)
        .where(and(
          eq(companySecrets.companyId, this.companyId),
          inArray(companySecrets.id, secretIds),
        )) as AgentManagementToolSecret[];

    const modelIds = [...new Set(
      baseAgents
        .map((agent) => agent.defaultModelProviderCredentialModelId)
        .filter((value): value is string => typeof value === "string"),
    )];
    const modelRecords = modelIds.length === 0
      ? []
      : await selectableDatabase
        .select({
          description: modelProviderCredentialModels.description,
          id: modelProviderCredentialModels.id,
          modelId: modelProviderCredentialModels.modelId,
          modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
          name: modelProviderCredentialModels.name,
          reasoningSupported: modelProviderCredentialModels.reasoningSupported,
          reasoningLevels: modelProviderCredentialModels.reasoningLevels,
        })
        .from(modelProviderCredentialModels)
        .where(and(
          eq(modelProviderCredentialModels.companyId, this.companyId),
          inArray(modelProviderCredentialModels.id, modelIds),
        )) as ModelRecord[];
    const credentialIds = [...new Set(modelRecords.map((modelRecord) => modelRecord.modelProviderCredentialId))];
    const credentialRecords = credentialIds.length === 0
      ? []
      : await selectableDatabase
        .select({
          id: modelProviderCredentials.id,
          isManaged: modelProviderCredentials.isManaged,
          modelProvider: modelProviderCredentials.modelProvider,
          name: modelProviderCredentials.name,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, this.companyId),
          inArray(modelProviderCredentials.id, credentialIds),
        )) as CredentialRecord[];
    const computeProviderDefinitionRecords = computeProviderDefinitionIds.length === 0
      ? []
      : await selectableDatabase
        .select({
          id: computeProviderDefinitions.id,
          name: computeProviderDefinitions.name,
          provider: computeProviderDefinitions.provider,
        })
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, this.companyId),
          inArray(computeProviderDefinitions.id, computeProviderDefinitionIds),
        )) as ComputeProviderDefinitionRecord[];

    const secretsById = new Map(secretRecords.map((record) => [record.id, record]));
    const secretIdsByAgentId = new Map<string, string[]>();
    for (const record of secretAttachmentRecords) {
      const currentSecretIds = secretIdsByAgentId.get(record.agentId) ?? [];
      currentSecretIds.push(record.secretId);
      secretIdsByAgentId.set(record.agentId, currentSecretIds);
    }
    const modelById = new Map(modelRecords.map((record) => [record.id, record]));
    const credentialById = new Map(credentialRecords.map((record) => [record.id, record]));
    const computeProviderDefinitionById = new Map(
      computeProviderDefinitionRecords.map((record) => [record.id, record]),
    );

    return [...baseAgents]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((agent) => {
        const model = agent.defaultModelProviderCredentialModelId
          ? modelById.get(agent.defaultModelProviderCredentialModelId) ?? null
          : null;
        const credential = model
          ? credentialById.get(model.modelProviderCredentialId) ?? null
          : null;
        const computeProviderDefinition = agent.defaultComputeProviderDefinitionId
          ? computeProviderDefinitionById.get(agent.defaultComputeProviderDefinitionId) ?? null
          : null;
        const attachedSecrets = (secretIdsByAgentId.get(agent.id) ?? [])
          .map((secretId) => secretsById.get(secretId))
          .filter((secret): secret is AgentManagementToolSecret => Boolean(secret))
          .sort((left, right) => left.name.localeCompare(right.name));

        return {
          companyId: agent.companyId,
          createdAt: agent.createdAt,
          defaultComputeProvider: computeProviderDefinition?.provider ?? null,
          defaultComputeProviderDefinitionId: agent.defaultComputeProviderDefinitionId,
          defaultComputeProviderDefinitionName: computeProviderDefinition?.name ?? null,
          defaultEnvironmentTemplateId: agent.defaultEnvironmentTemplateId,
          environmentTemplate: this.requireEnvironmentTemplate(
            agent,
            templatesByDefinitionId,
          ),
          id: agent.id,
          isCurrentAgent: agent.id === this.currentAgentId,
          modelDescription: model?.description ?? null,
          modelId: model?.modelId ?? null,
          modelName: model?.name ?? null,
          modelProvider: credential?.modelProvider ?? null,
          modelProviderCredentialId: credential?.id ?? null,
          modelProviderCredentialLabel: credential ? this.resolveCredentialLabel(credential) : null,
          modelProviderCredentialModelId: agent.defaultModelProviderCredentialModelId,
          name: agent.name,
          reasoningLevel: agent.defaultReasoningLevel,
          secrets: attachedSecrets,
          supportedReasoningLevels: model?.reasoningLevels ?? [],
          systemPrompt: agent.systemPrompt,
          updatedAt: agent.updatedAt,
        };
      });
  }

  private async replaceAgentSecrets(
    agentId: string,
    secretIds: string[] | null | undefined,
    transactionProvider: TransactionProviderInterface,
    database: SelectableDatabase & InsertableDatabase & DeletableDatabase,
  ): Promise<void> {
    const desiredSecretIds = [...new Set((secretIds ?? []).filter((secretId) => secretId.length > 0))];
    await this.requireSecrets(database, desiredSecretIds);
    const currentSecretIds = (await database
      .select({
        secretId: agentDefaultSecrets.secretId,
      })
      .from(agentDefaultSecrets)
      .where(and(
        eq(agentDefaultSecrets.companyId, this.companyId),
        eq(agentDefaultSecrets.agentId, agentId),
      )) as Array<{ secretId: string }>)
      .map((record) => record.secretId);

    for (const secretId of currentSecretIds) {
      if (!desiredSecretIds.includes(secretId)) {
        await this.secretService.detachSecretFromAgent(
          transactionProvider,
          this.companyId,
          agentId,
          secretId,
        );
      }
    }

    for (const secretId of desiredSecretIds) {
      if (!currentSecretIds.includes(secretId)) {
        await this.secretService.attachSecretToAgent(transactionProvider, {
          agentId,
          companyId: this.companyId,
          secretId,
          userId: null,
        });
      }
    }
  }

  private requireNonEmptyName(name: string | null): string {
    if (!name || name.length === 0) {
      throw new Error("name is required.");
    }

    return name;
  }

  private resolveCredentialLabel(credentialRecord: CredentialRecord): string {
    if (credentialRecord.isManaged) {
      return "CompanyHelm";
    }

    const providerDefinition = this.modelProviderService.get(credentialRecord.modelProvider);
    if (credentialRecord.name === providerDefinition.name) {
      return providerDefinition.name;
    }

    if (credentialRecord.modelProvider === "openai" && credentialRecord.name === "OpenAI / Codex") {
      return "OpenAI / Codex";
    }

    return `${credentialRecord.name} (${credentialRecord.modelProvider})`;
  }

  private resolveReasoningLevel(
    reasoningLevel: string | null | undefined,
    credentialRecord: CredentialRecord,
    modelRecord: ModelRecord,
  ): string | null {
    const supportedLevels = modelRecord.reasoningLevels ?? [];
    if (supportedLevels.length === 0) {
      if (reasoningLevel === undefined || reasoningLevel === null || reasoningLevel === "") {
        return null;
      }

      throw new Error("Selected model does not support reasoning levels.");
    }
    if (reasoningLevel !== undefined && reasoningLevel !== null && reasoningLevel !== "") {
      if (!supportedLevels.includes(reasoningLevel)) {
        throw new Error("Unsupported reasoning level.");
      }

      return reasoningLevel;
    }

    const defaultReasoningLevel = this.modelRegistry.getDefaultReasoningLevelForProvider(
      credentialRecord.modelProvider,
    );
    if (defaultReasoningLevel && supportedLevels.includes(defaultReasoningLevel)) {
      return defaultReasoningLevel;
    }

    return supportedLevels[0] ?? null;
  }

  private resolveSystemPrompt(systemPrompt: string | null | undefined): string | null {
    if (systemPrompt === undefined || systemPrompt === null || systemPrompt === "") {
      return null;
    }

    return systemPrompt;
  }

  private requireEnvironmentTemplate(
    agent: {
      defaultComputeProviderDefinitionId: string | null;
      defaultEnvironmentTemplateId: string;
    },
    templatesByDefinitionId: Map<string, AgentManagementToolEnvironmentTemplate[]>,
  ): AgentManagementToolEnvironmentTemplate {
    if (!agent.defaultComputeProviderDefinitionId) {
      throw new Error("Agent environment provider is not configured.");
    }

    const selectedTemplate = (templatesByDefinitionId.get(agent.defaultComputeProviderDefinitionId) ?? [])
      .find((template) => template.templateId === agent.defaultEnvironmentTemplateId);
    if (!selectedTemplate) {
      throw new Error("Agent environment template is not available for the selected provider.");
    }

    return selectedTemplate;
  }

  private async resolveDefaultEnvironmentTemplateId(
    transactionProvider: TransactionProviderInterface,
    definitionId: string,
  ): Promise<string> {
    const templates = await this.templateService.listTemplatesForProvider(
      transactionProvider,
      this.companyId,
      definitionId,
    );
    const defaultTemplate = templates[0];
    if (!defaultTemplate) {
      throw new Error("Selected compute provider does not expose any environment templates.");
    }

    return defaultTemplate.templateId;
  }

  private async requireComputeProviderDefinition(
    selectableDatabase: SelectableDatabase,
    definitionId: string,
  ): Promise<ComputeProviderDefinitionRecord> {
    const [computeProviderDefinition] = await selectableDatabase
      .select({
        id: computeProviderDefinitions.id,
        name: computeProviderDefinitions.name,
        provider: computeProviderDefinitions.provider,
      })
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, this.companyId),
        eq(computeProviderDefinitions.id, definitionId),
      )) as ComputeProviderDefinitionRecord[];
    if (!computeProviderDefinition) {
      throw new Error("Compute provider definition not found.");
    }

    return computeProviderDefinition;
  }

  private async requireExistingAgent(
    selectableDatabase: SelectableDatabase,
    agentId: string,
  ): Promise<ExistingAgentRecord> {
    const [agent] = await selectableDatabase
      .select(this.agentSelection())
      .from(agents)
      .where(and(
        eq(agents.companyId, this.companyId),
        eq(agents.id, agentId),
      )) as ExistingAgentRecord[];
    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }

  private async requireSecrets(
    selectableDatabase: SelectableDatabase,
    secretIds: string[],
  ): Promise<void> {
    if (secretIds.length === 0) {
      return;
    }

    const secretRecords = await selectableDatabase
      .select({
        id: companySecrets.id,
      })
      .from(companySecrets)
      .where(and(
        eq(companySecrets.companyId, this.companyId),
        inArray(companySecrets.id, secretIds),
      )) as Array<{ id: string }>;
    if (secretRecords.length !== secretIds.length) {
      throw new Error("One or more secretIds are invalid.");
    }
  }

  private async resolveModelSelection(
    selectableDatabase: SelectableDatabase,
    input: {
      modelProviderCredentialId: string | null;
      modelProviderCredentialModelId: string;
    },
  ): Promise<{ credential: CredentialRecord; model: ModelRecord }> {
    const [model] = await selectableDatabase
      .select({
        description: modelProviderCredentialModels.description,
        id: modelProviderCredentialModels.id,
        modelId: modelProviderCredentialModels.modelId,
        modelProviderCredentialId: modelProviderCredentialModels.modelProviderCredentialId,
        name: modelProviderCredentialModels.name,
        reasoningSupported: modelProviderCredentialModels.reasoningSupported,
        reasoningLevels: modelProviderCredentialModels.reasoningLevels,
      })
      .from(modelProviderCredentialModels)
      .where(and(
        eq(modelProviderCredentialModels.companyId, this.companyId),
        eq(modelProviderCredentialModels.id, input.modelProviderCredentialModelId),
      )) as ModelRecord[];
    if (!model) {
      throw new Error("Provider model not found.");
    }

    const credentialId = input.modelProviderCredentialId && input.modelProviderCredentialId.length > 0
      ? input.modelProviderCredentialId
      : model.modelProviderCredentialId;
    const [credential] = await selectableDatabase
      .select({
        id: modelProviderCredentials.id,
        isManaged: modelProviderCredentials.isManaged,
        modelProvider: modelProviderCredentials.modelProvider,
        name: modelProviderCredentials.name,
      })
      .from(modelProviderCredentials)
      .where(and(
        eq(modelProviderCredentials.companyId, this.companyId),
        eq(modelProviderCredentials.id, credentialId),
      )) as CredentialRecord[];
    if (!credential) {
      throw new Error("Provider credential not found.");
    }
    if (model.modelProviderCredentialId !== credential.id) {
      throw new Error("Provider model does not belong to the selected credential.");
    }

    return {
      credential,
      model,
    };
  }

  private createScopedTransactionProvider(tx: AppRuntimeTransaction): TransactionProviderInterface {
    return {
      async transaction<T>(transaction: (nestedTx: AppRuntimeTransaction) => Promise<T>): Promise<T> {
        return transaction(tx);
      },
    };
  }
}
