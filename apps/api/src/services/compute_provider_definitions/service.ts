import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentEnvironments,
  agents,
  computeProviderDefinitions,
  daytonaComputeProviderDefinitions,
  e2bComputeProviderDefinitions,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { ComputeProvider } from "../agent/compute/provider_interface.ts";
import { SecretEncryptionService } from "../secrets/encryption.ts";

type BaseDefinitionRecord = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  provider: ComputeProvider;
  updatedAt: Date;
};

type DaytonaDefinitionRecord = {
  apiUrl: string;
  computeProviderDefinitionId: string;
  encryptedApiKey: string;
  encryptionKeyId: string;
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
  daytona: {
    apiUrl: string;
  } | null;
  description: string | null;
  e2b: {
    hasApiKey: boolean;
  } | null;
  id: string;
  name: string;
  provider: ComputeProvider;
  updatedAt: Date;
};

export type RuntimeComputeProviderDefinition =
  | {
      apiKey: string;
      apiUrl: string;
      companyId: string;
      description: string | null;
      id: string;
      name: string;
      provider: "daytona";
    }
  | {
      apiKey: string;
      companyId: string;
      description: string | null;
      id: string;
      name: string;
      provider: "e2b";
    };

type CreateComputeProviderDefinitionInput =
  | {
      companyId: string;
      createdByUserId: string;
      daytona: {
        apiKey: string;
        apiUrl?: string | null;
      };
      description?: string | null;
      name: string;
      provider: "daytona";
    }
  | {
      companyId: string;
      createdByUserId: string;
      description?: string | null;
      e2b: {
        apiKey: string;
      };
      name: string;
      provider: "e2b";
    };

type UpdateComputeProviderDefinitionInput =
  | {
      companyId: string;
      daytona: {
        apiKey?: string | null;
        apiUrl?: string | null;
      };
      definitionId: string;
      description?: string | null;
      name: string;
      provider: "daytona";
      updatedByUserId: string;
    }
  | {
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
 * keeps provider-specific storage typed in dedicated tables while exposing one unified surface for
 * GraphQL, agent configuration, and runtime provider resolution.
 */
@injectable()
export class ComputeProviderDefinitionService {
  private static readonly DEFAULT_DAYTONA_API_URL = "https://app.daytona.io/api";
  private readonly secretEncryptionService: SecretEncryptionService;

  constructor(
    @inject(SecretEncryptionService) secretEncryptionService: SecretEncryptionService,
  ) {
    this.secretEncryptionService = secretEncryptionService;
  }

  async listDefinitions(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<ComputeProviderDefinitionRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
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

      if (baseDefinition.provider === "daytona") {
        const daytonaDefinitions = await selectableDatabase
          .select({
            apiUrl: daytonaComputeProviderDefinitions.apiUrl,
            computeProviderDefinitionId: daytonaComputeProviderDefinitions.computeProviderDefinitionId,
            encryptedApiKey: daytonaComputeProviderDefinitions.encryptedApiKey,
            encryptionKeyId: daytonaComputeProviderDefinitions.encryptionKeyId,
          })
          .from(daytonaComputeProviderDefinitions)
          .where(eq(daytonaComputeProviderDefinitions.computeProviderDefinitionId, definitionId)) as DaytonaDefinitionRecord[];
        const daytonaDefinition = daytonaDefinitions[0];
        if (!daytonaDefinition) {
          throw new Error("Daytona compute provider definition is incomplete.");
        }

        return {
          apiKey: this.secretEncryptionService.decrypt(
            daytonaDefinition.encryptedApiKey,
            daytonaDefinition.encryptionKeyId,
          ),
          apiUrl: this.resolveDaytonaApiUrl(daytonaDefinition.apiUrl),
          companyId: baseDefinition.companyId,
          description: baseDefinition.description,
          id: baseDefinition.id,
          name: baseDefinition.name,
          provider: "daytona",
        };
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

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const now = new Date();
      const [createdDefinition] = await insertableDatabase
        .insert(computeProviderDefinitions)
        .values({
          companyId: input.companyId,
          createdAt: now,
          createdByUserId: input.createdByUserId,
          description: this.resolveNullableText(input.description),
          name: definitionName,
          provider: input.provider,
          updatedAt: now,
          updatedByUserId: input.createdByUserId,
        })
        .returning?.(this.baseSelection()) as BaseDefinitionRecord[];
      if (!createdDefinition) {
        throw new Error("Failed to create compute provider definition.");
      }

      if (input.provider === "daytona") {
        const encryptedApiKey = this.secretEncryptionService.encrypt(input.daytona.apiKey);
        await insertableDatabase
          .insert(daytonaComputeProviderDefinitions)
          .values({
            apiUrl: this.resolveDaytonaApiUrl(input.daytona.apiUrl),
            computeProviderDefinitionId: createdDefinition.id,
            encryptedApiKey: encryptedApiKey.encryptedValue,
            encryptionKeyId: encryptedApiKey.encryptionKeyId,
          });
      } else {
        const encryptedApiKey = this.secretEncryptionService.encrypt(input.e2b.apiKey);
        await insertableDatabase
          .insert(e2bComputeProviderDefinitions)
          .values({
            computeProviderDefinitionId: createdDefinition.id,
            encryptedApiKey: encryptedApiKey.encryptedValue,
            encryptionKeyId: encryptedApiKey.encryptionKeyId,
          });
      }

      const [createdRecord] = await this.hydrateDefinitions(selectableDatabase, [createdDefinition]);
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
      if (baseDefinition.provider !== input.provider) {
        throw new Error("Compute provider definition provider mismatch.");
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

      if (input.provider === "daytona") {
        const daytonaDefinitions = await selectableDatabase
          .select({
            apiUrl: daytonaComputeProviderDefinitions.apiUrl,
            computeProviderDefinitionId: daytonaComputeProviderDefinitions.computeProviderDefinitionId,
            encryptedApiKey: daytonaComputeProviderDefinitions.encryptedApiKey,
            encryptionKeyId: daytonaComputeProviderDefinitions.encryptionKeyId,
          })
          .from(daytonaComputeProviderDefinitions)
          .where(eq(daytonaComputeProviderDefinitions.computeProviderDefinitionId, input.definitionId)) as DaytonaDefinitionRecord[];
        const daytonaDefinition = daytonaDefinitions[0];
        if (!daytonaDefinition) {
          throw new Error("Daytona compute provider definition is incomplete.");
        }

        const encryptedApiKey = input.daytona.apiKey && input.daytona.apiKey.trim().length > 0
          ? this.secretEncryptionService.encrypt(input.daytona.apiKey)
          : {
              encryptedValue: daytonaDefinition.encryptedApiKey,
              encryptionKeyId: daytonaDefinition.encryptionKeyId,
            };
        await updatableDatabase
          .update(daytonaComputeProviderDefinitions)
          .set({
            apiUrl: this.resolveDaytonaApiUrl(input.daytona.apiUrl),
            encryptedApiKey: encryptedApiKey.encryptedValue,
            encryptionKeyId: encryptedApiKey.encryptionKeyId,
          })
          .where(eq(daytonaComputeProviderDefinitions.computeProviderDefinitionId, input.definitionId));
      } else {
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
      }

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

    await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
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
    });

    return definition;
  }

  private async hydrateDefinitions(
    selectableDatabase: SelectableDatabase,
    baseDefinitions: BaseDefinitionRecord[],
  ): Promise<ComputeProviderDefinitionRecord[]> {
    if (baseDefinitions.length === 0) {
      return [];
    }

    const definitionIds = baseDefinitions.map((definition) => definition.id);
    const [daytonaDefinitions, e2bDefinitions] = await Promise.all([
      selectableDatabase
        .select({
          apiUrl: daytonaComputeProviderDefinitions.apiUrl,
          computeProviderDefinitionId: daytonaComputeProviderDefinitions.computeProviderDefinitionId,
          encryptedApiKey: daytonaComputeProviderDefinitions.encryptedApiKey,
          encryptionKeyId: daytonaComputeProviderDefinitions.encryptionKeyId,
        })
        .from(daytonaComputeProviderDefinitions)
        .where(inArray(daytonaComputeProviderDefinitions.computeProviderDefinitionId, definitionIds)) as Promise<DaytonaDefinitionRecord[]>,
      selectableDatabase
        .select({
          computeProviderDefinitionId: e2bComputeProviderDefinitions.computeProviderDefinitionId,
          encryptedApiKey: e2bComputeProviderDefinitions.encryptedApiKey,
          encryptionKeyId: e2bComputeProviderDefinitions.encryptionKeyId,
        })
        .from(e2bComputeProviderDefinitions)
        .where(inArray(e2bComputeProviderDefinitions.computeProviderDefinitionId, definitionIds)) as Promise<E2bDefinitionRecord[]>,
    ]);

    const daytonaByDefinitionId = new Map(
      daytonaDefinitions.map((definition) => [definition.computeProviderDefinitionId, definition]),
    );
    const e2bByDefinitionId = new Map(
      e2bDefinitions.map((definition) => [definition.computeProviderDefinitionId, definition]),
    );

    return [...baseDefinitions]
      .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
      .map((definition) => ({
        companyId: definition.companyId,
        createdAt: definition.createdAt,
        daytona: definition.provider === "daytona"
          ? {
              apiUrl: this.resolveDaytonaApiUrl(daytonaByDefinitionId.get(definition.id)?.apiUrl),
            }
          : null,
        description: definition.description,
        e2b: definition.provider === "e2b"
          ? {
              hasApiKey: Boolean(e2bByDefinitionId.get(definition.id)?.encryptedApiKey),
            }
          : null,
        id: definition.id,
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
      name: computeProviderDefinitions.name,
      provider: computeProviderDefinitions.provider,
      updatedAt: computeProviderDefinitions.updatedAt,
    };
  }

  private resolveNullableText(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }

    return value.length === 0 ? null : value;
  }

  private resolveDaytonaApiUrl(value: string | null | undefined): string {
    if (!value) {
      return ComputeProviderDefinitionService.DEFAULT_DAYTONA_API_URL;
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
      return ComputeProviderDefinitionService.DEFAULT_DAYTONA_API_URL;
    }

    return trimmedValue;
  }
}
