import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentEnvironments,
  agents,
  computeProviderDefinitions,
  e2bComputeProviderDefinitions,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { ComputeProvider } from "../environments/providers/provider_interface.ts";
import { SecretEncryptionService } from "../secrets/encryption.ts";
import { CompanyHelmComputeProviderService } from "./companyhelm_service.ts";

type BaseDefinitionRecord = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  provider: ComputeProvider;
  updatedAt: Date;
};

type E2bDefinitionRecord = {
  computeProviderDefinitionId: string;
  encryptedApiKey: string;
  encryptionKeyId: string;
};

type ReferenceRecord = {
  id: string;
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

export type ComputeProviderDefinitionRecord = {
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
  updatedAt: Date;
};

export type RuntimeComputeProviderDefinition = {
  apiKey: string;
  companyId: string;
  description: string | null;
  id: string;
  name: string;
  provider: "e2b";
};

type CreateComputeProviderDefinitionInput = {
  companyId: string;
  createdByUserId: string;
  description?: string | null;
  e2b: {
    apiKey: string;
  };
  isDefault?: boolean | null;
  name: string;
  provider: "e2b";
};

type UpdateComputeProviderDefinitionInput = {
  companyId: string;
  definitionId: string;
  description?: string | null;
  e2b: {
    apiKey?: string | null;
  };
  name: string;
  provider: "e2b";
  updatedByUserId: string;
};

/**
 * Owns the company-scoped compute provider definitions that back environment provisioning. It
 * keeps provider-specific storage typed in dedicated tables while exposing one unified E2B-backed
 * surface for GraphQL, agent configuration, and runtime provider resolution.
 */
@injectable()
export class ComputeProviderDefinitionService {
  private readonly companyHelmComputeProviderService: CompanyHelmComputeProviderService;
  private readonly secretEncryptionService: SecretEncryptionService;

  constructor(
    @inject(CompanyHelmComputeProviderService)
    companyHelmComputeProviderService: CompanyHelmComputeProviderService,
    @inject(SecretEncryptionService) secretEncryptionService: SecretEncryptionService,
  ) {
    this.companyHelmComputeProviderService = companyHelmComputeProviderService;
    this.secretEncryptionService = secretEncryptionService;
  }

  async listDefinitions(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<ComputeProviderDefinitionRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      await this.ensureCompanyHelmDefinition(selectableDatabase, insertableDatabase, companyId);
      const baseDefinitions = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(eq(computeProviderDefinitions.companyId, companyId)) as BaseDefinitionRecord[];

      return this.hydrateDefinitions(selectableDatabase, baseDefinitions);
    });
  }

  async loadDefinitionById(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    definitionId: string,
  ): Promise<ComputeProviderDefinitionRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const baseDefinitions = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, companyId),
          eq(computeProviderDefinitions.id, definitionId),
        )) as BaseDefinitionRecord[];
      const baseDefinition = baseDefinitions[0];
      if (!baseDefinition) {
        return null;
      }

      const hydratedDefinitions = await this.hydrateDefinitions(selectableDatabase, [baseDefinition]);
      return hydratedDefinitions[0] ?? null;
    });
  }

  async loadRuntimeDefinitionById(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    definitionId: string,
  ): Promise<RuntimeComputeProviderDefinition> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const baseDefinitions = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, companyId),
          eq(computeProviderDefinitions.id, definitionId),
        )) as BaseDefinitionRecord[];
      const baseDefinition = baseDefinitions[0];
      if (!baseDefinition) {
        throw new Error("Compute provider definition not found.");
      }
      if (this.companyHelmComputeProviderService.matchesDefinition(baseDefinition)) {
        return this.companyHelmComputeProviderService.createRuntimeDefinition({
          companyId: baseDefinition.companyId,
          description: baseDefinition.description,
          id: baseDefinition.id,
        });
      }

      const e2bDefinitions = await selectableDatabase
        .select({
          computeProviderDefinitionId: e2bComputeProviderDefinitions.computeProviderDefinitionId,
          encryptedApiKey: e2bComputeProviderDefinitions.encryptedApiKey,
          encryptionKeyId: e2bComputeProviderDefinitions.encryptionKeyId,
        })
        .from(e2bComputeProviderDefinitions)
        .where(eq(e2bComputeProviderDefinitions.computeProviderDefinitionId, definitionId)) as E2bDefinitionRecord[];
      const e2bDefinition = e2bDefinitions[0];
      if (!e2bDefinition) {
        throw new Error("E2B compute provider definition is incomplete.");
      }

      return {
        apiKey: this.secretEncryptionService.decrypt(
          e2bDefinition.encryptedApiKey,
          e2bDefinition.encryptionKeyId,
        ),
        companyId: baseDefinition.companyId,
        description: baseDefinition.description,
        id: baseDefinition.id,
        name: baseDefinition.name,
        provider: "e2b",
      };
    });
  }

  async createDefinition(
    transactionProvider: TransactionProviderInterface,
    input: CreateComputeProviderDefinitionInput,
  ): Promise<ComputeProviderDefinitionRecord> {
    const definitionName = input.name.trim();
    if (definitionName.length === 0) {
      throw new Error("name is required.");
    }
    if (this.companyHelmComputeProviderService.isReservedName(definitionName)) {
      throw new Error("CompanyHelm compute provider is managed by the system.");
    }

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const existingDefinitions = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(eq(computeProviderDefinitions.companyId, input.companyId)) as BaseDefinitionRecord[];
      const hasExistingDefault = existingDefinitions.some((definition) => definition.isDefault);
      const shouldSetDefault = Boolean(input.isDefault) || !hasExistingDefault;
      const now = new Date();
      const [createdDefinition] = await insertableDatabase
        .insert(computeProviderDefinitions)
        .values({
          companyId: input.companyId,
          createdAt: now,
          createdByUserId: input.createdByUserId,
          description: this.resolveNullableText(input.description),
          isDefault: false,
          name: definitionName,
          provider: input.provider,
          updatedAt: now,
          updatedByUserId: input.createdByUserId,
        })
        .returning?.(this.baseSelection()) as BaseDefinitionRecord[];
      if (!createdDefinition) {
        throw new Error("Failed to create compute provider definition.");
      }

      if (shouldSetDefault) {
        await this.setDefaultDefinitionRecord(
          selectableDatabase,
          updatableDatabase,
          input.companyId,
          createdDefinition.id,
        );
      }

      const encryptedApiKey = this.secretEncryptionService.encrypt(input.e2b.apiKey);
      await insertableDatabase
        .insert(e2bComputeProviderDefinitions)
        .values({
          computeProviderDefinitionId: createdDefinition.id,
          encryptedApiKey: encryptedApiKey.encryptedValue,
          encryptionKeyId: encryptedApiKey.encryptionKeyId,
        });

      const [reloadedDefinition] = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, input.companyId),
          eq(computeProviderDefinitions.id, createdDefinition.id),
        )) as BaseDefinitionRecord[];
      if (!reloadedDefinition) {
        throw new Error("Failed to reload compute provider definition.");
      }

      const [createdRecord] = await this.hydrateDefinitions(selectableDatabase, [reloadedDefinition]);
      if (!createdRecord) {
        throw new Error("Failed to load compute provider definition.");
      }

      return createdRecord;
    });
  }

  async updateDefinition(
    transactionProvider: TransactionProviderInterface,
    input: UpdateComputeProviderDefinitionInput,
  ): Promise<ComputeProviderDefinitionRecord> {
    const definitionName = input.name.trim();
    if (definitionName.length === 0) {
      throw new Error("name is required.");
    }

    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const baseDefinitions = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, input.companyId),
          eq(computeProviderDefinitions.id, input.definitionId),
        )) as BaseDefinitionRecord[];
      const baseDefinition = baseDefinitions[0];
      if (!baseDefinition) {
        throw new Error("Compute provider definition not found.");
      }
      if (this.companyHelmComputeProviderService.matchesDefinition(baseDefinition)) {
        throw new Error("CompanyHelm compute provider is managed by the system.");
      }
      if (baseDefinition.provider !== input.provider) {
        throw new Error("Compute provider definition provider mismatch.");
      }
      if (this.companyHelmComputeProviderService.isReservedName(definitionName)) {
        throw new Error("CompanyHelm compute provider is managed by the system.");
      }

      await updatableDatabase
        .update(computeProviderDefinitions)
        .set({
          description: this.resolveNullableText(input.description),
          name: definitionName,
          updatedAt: new Date(),
          updatedByUserId: input.updatedByUserId,
        })
        .where(and(
          eq(computeProviderDefinitions.companyId, input.companyId),
          eq(computeProviderDefinitions.id, input.definitionId),
        ));

      const e2bDefinitions = await selectableDatabase
        .select({
          computeProviderDefinitionId: e2bComputeProviderDefinitions.computeProviderDefinitionId,
          encryptedApiKey: e2bComputeProviderDefinitions.encryptedApiKey,
          encryptionKeyId: e2bComputeProviderDefinitions.encryptionKeyId,
        })
        .from(e2bComputeProviderDefinitions)
        .where(eq(e2bComputeProviderDefinitions.computeProviderDefinitionId, input.definitionId)) as E2bDefinitionRecord[];
      const e2bDefinition = e2bDefinitions[0];
      if (!e2bDefinition) {
        throw new Error("E2B compute provider definition is incomplete.");
      }

      const encryptedApiKey = input.e2b.apiKey && input.e2b.apiKey.trim().length > 0
        ? this.secretEncryptionService.encrypt(input.e2b.apiKey)
        : {
            encryptedValue: e2bDefinition.encryptedApiKey,
            encryptionKeyId: e2bDefinition.encryptionKeyId,
          };
      await updatableDatabase
        .update(e2bComputeProviderDefinitions)
        .set({
          encryptedApiKey: encryptedApiKey.encryptedValue,
          encryptionKeyId: encryptedApiKey.encryptionKeyId,
        })
        .where(eq(e2bComputeProviderDefinitions.computeProviderDefinitionId, input.definitionId));

      const [updatedBaseDefinition] = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, input.companyId),
          eq(computeProviderDefinitions.id, input.definitionId),
        )) as BaseDefinitionRecord[];
      if (!updatedBaseDefinition) {
        throw new Error("Failed to reload compute provider definition.");
      }

      const [updatedRecord] = await this.hydrateDefinitions(selectableDatabase, [updatedBaseDefinition]);
      if (!updatedRecord) {
        throw new Error("Failed to load compute provider definition.");
      }

      return updatedRecord;
    });
  }

  async deleteDefinition(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    definitionId: string,
  ): Promise<ComputeProviderDefinitionRecord | null> {
    const definition = await this.loadDefinitionById(transactionProvider, companyId, definitionId);
    if (!definition) {
      return null;
    }
    if (this.companyHelmComputeProviderService.matchesDefinition(definition)) {
      throw new Error("CompanyHelm compute provider is managed by the system.");
    }

    await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const [agentReference] = await selectableDatabase
        .select({
          id: agents.id,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.defaultComputeProviderDefinitionId, definitionId),
        )) as ReferenceRecord[];
      if (agentReference) {
        throw new Error("Compute provider definition is still assigned to an agent.");
      }

      const [environmentReference] = await selectableDatabase
        .select({
          id: agentEnvironments.id,
        })
        .from(agentEnvironments)
        .where(and(
          eq(agentEnvironments.companyId, companyId),
          eq(agentEnvironments.providerDefinitionId, definitionId),
        )) as ReferenceRecord[];
      if (environmentReference) {
        throw new Error("Compute provider definition is still referenced by an environment.");
      }

      await deletableDatabase
        .delete(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, companyId),
          eq(computeProviderDefinitions.id, definitionId),
        ));

      if (definition.isDefault) {
        await this.ensureFallbackDefaultDefinition(selectableDatabase, updatableDatabase, companyId);
      }
    });

    return definition;
  }

  async setDefaultDefinition(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    definitionId: string,
  ): Promise<ComputeProviderDefinitionRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const definitions = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(eq(computeProviderDefinitions.companyId, companyId)) as BaseDefinitionRecord[];
      const targetDefinition = definitions.find((definition) => definition.id === definitionId);
      if (!targetDefinition) {
        throw new Error("Compute provider definition not found.");
      }

      await this.setDefaultDefinitionRecord(
        selectableDatabase,
        updatableDatabase,
        companyId,
        definitionId,
      );

      const [updatedDefinition] = await selectableDatabase
        .select(this.baseSelection())
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, companyId),
          eq(computeProviderDefinitions.id, definitionId),
        )) as BaseDefinitionRecord[];
      if (!updatedDefinition) {
        throw new Error("Failed to reload compute provider definition.");
      }

      const [hydratedDefinition] = await this.hydrateDefinitions(selectableDatabase, [updatedDefinition]);
      if (!hydratedDefinition) {
        throw new Error("Failed to load compute provider definition.");
      }

      return hydratedDefinition;
    });
  }

  private async hydrateDefinitions(
    selectableDatabase: SelectableDatabase,
    baseDefinitions: BaseDefinitionRecord[],
  ): Promise<ComputeProviderDefinitionRecord[]> {
    if (baseDefinitions.length === 0) {
      return [];
    }

    const definitionIds = baseDefinitions.map((definition) => definition.id);
    const e2bDefinitions = await selectableDatabase
      .select({
        computeProviderDefinitionId: e2bComputeProviderDefinitions.computeProviderDefinitionId,
        encryptedApiKey: e2bComputeProviderDefinitions.encryptedApiKey,
        encryptionKeyId: e2bComputeProviderDefinitions.encryptionKeyId,
      })
      .from(e2bComputeProviderDefinitions)
      .where(inArray(e2bComputeProviderDefinitions.computeProviderDefinitionId, definitionIds)) as E2bDefinitionRecord[];
    const e2bByDefinitionId = new Map(
      e2bDefinitions.map((definition) => [definition.computeProviderDefinitionId, definition]),
    );

    return [...baseDefinitions]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((definition) => ({
        companyId: definition.companyId,
        createdAt: definition.createdAt,
        description: definition.description,
        e2b: {
          hasApiKey: this.companyHelmComputeProviderService.matchesDefinition(definition)
            || Boolean(e2bByDefinitionId.get(definition.id)?.encryptedApiKey),
        },
        id: definition.id,
        isDefault: definition.isDefault,
        name: definition.name,
        provider: definition.provider,
        updatedAt: definition.updatedAt,
      }));
  }

  private baseSelection() {
    return {
      companyId: computeProviderDefinitions.companyId,
      createdAt: computeProviderDefinitions.createdAt,
      description: computeProviderDefinitions.description,
      id: computeProviderDefinitions.id,
      isDefault: computeProviderDefinitions.isDefault,
      name: computeProviderDefinitions.name,
      provider: computeProviderDefinitions.provider,
      updatedAt: computeProviderDefinitions.updatedAt,
    };
  }

  private async ensureCompanyHelmDefinition(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
  ): Promise<void> {
    const existingDefinitions = await selectableDatabase
      .select(this.baseSelection())
      .from(computeProviderDefinitions)
      .where(and(
        eq(computeProviderDefinitions.companyId, companyId),
        eq(computeProviderDefinitions.name, this.companyHelmComputeProviderService.getDefinitionName()),
      )) as BaseDefinitionRecord[];
    const existingDefinition = existingDefinitions[0];
    if (existingDefinition) {
      if (!this.companyHelmComputeProviderService.matchesDefinition(existingDefinition)) {
        throw new Error("Reserved CompanyHelm compute provider name is assigned to another provider.");
      }

      return;
    }

    const companyDefinitions = await selectableDatabase
      .select(this.baseSelection())
      .from(computeProviderDefinitions)
      .where(eq(computeProviderDefinitions.companyId, companyId)) as BaseDefinitionRecord[];
    const now = new Date();
    await insertableDatabase
      .insert(computeProviderDefinitions)
      .values({
        companyId,
        createdAt: now,
        createdByUserId: null,
        description: this.companyHelmComputeProviderService.getDefinitionDescription(),
        isDefault: !companyDefinitions.some((definition) => definition.isDefault),
        name: this.companyHelmComputeProviderService.getDefinitionName(),
        provider: this.companyHelmComputeProviderService.getProvider(),
        updatedAt: now,
        updatedByUserId: null,
      });
  }

  private async ensureFallbackDefaultDefinition(
    selectableDatabase: SelectableDatabase,
    updatableDatabase: UpdatableDatabase,
    companyId: string,
  ): Promise<void> {
    const definitions = await selectableDatabase
      .select(this.baseSelection())
      .from(computeProviderDefinitions)
      .where(eq(computeProviderDefinitions.companyId, companyId)) as BaseDefinitionRecord[];
    if (definitions.some((definition) => definition.isDefault)) {
      return;
    }

    const fallbackDefinition = [...definitions]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .at(0);
    if (!fallbackDefinition) {
      return;
    }

    await this.setDefaultDefinitionRecord(
      selectableDatabase,
      updatableDatabase,
      companyId,
      fallbackDefinition.id,
    );
  }

  private async setDefaultDefinitionRecord(
    selectableDatabase: SelectableDatabase,
    updatableDatabase: UpdatableDatabase,
    companyId: string,
    definitionId: string,
  ): Promise<void> {
    const definitions = await selectableDatabase
      .select(this.baseSelection())
      .from(computeProviderDefinitions)
      .where(eq(computeProviderDefinitions.companyId, companyId)) as BaseDefinitionRecord[];
    if (!definitions.some((definition) => definition.id === definitionId)) {
      throw new Error("Compute provider definition not found.");
    }

    await updatableDatabase
      .update(computeProviderDefinitions)
      .set({
        isDefault: false,
      })
      .where(eq(computeProviderDefinitions.companyId, companyId));
    await updatableDatabase
      .update(computeProviderDefinitions)
      .set({
        isDefault: true,
      })
      .where(and(
        eq(computeProviderDefinitions.companyId, companyId),
        eq(computeProviderDefinitions.id, definitionId),
      ));
  }

  private resolveNullableText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    return value.length === 0 ? null : value;
  }
}
