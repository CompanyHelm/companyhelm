import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentDefaultSecretGroups,
  agentDefaultSecrets,
  agentSessions,
  agentSessionSecrets,
  agents,
  companySecrets,
  secret_groups,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { SecretEncryptionService } from "./encryption.ts";

type AgentDefaultSecretAttachmentRecord = {
  createdByUserId: string | null;
  secretId: string;
};

type AgentDefaultSecretGroupAttachmentRecord = {
  createdByUserId: string | null;
  secretGroupId: string;
};

type AgentRecord = {
  id: string;
};

type AgentSecretGroupAgentRecord = {
  agentId: string;
  createdByUserId: string | null;
};

export type SecretGroupRecord = {
  companyId: string;
  id: string;
  name: string;
};

export type SecretRecord = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  secretGroupId: string | null;
  updatedAt: Date;
};

type PersistedSecretValueRecord = {
  encryptedValue: string;
  encryptionKeyId: string;
  envVarName: string;
  id: string;
};

type SessionRecord = {
  id: string;
  status: string;
};

type AgentSessionIdRecord = {
  id: string;
};

type SessionSecretAttachmentRecord = {
  secretId: string;
  sessionId: string;
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
    values(value: Record<string, unknown> | Record<string, unknown>[]): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
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

/**
 * Owns the company secret catalog, folder-like secret groups, and the agent and session
 * attachment layers. It keeps secret values encrypted at rest while centralizing the rules that
 * decide which default secrets an agent contributes through direct and grouped assignments.
 */
@injectable()
export class SecretService {
  private readonly encryptionService: SecretEncryptionService;

  constructor(@inject(SecretEncryptionService) encryptionService: SecretEncryptionService) {
    this.encryptionService = encryptionService;
  }

  async createSecretGroup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      name: string;
    },
  ): Promise<SecretGroupRecord> {
    const name = this.requireNonEmptyName(input.name, "Secret group name");

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const [createdGroup] = await insertableDatabase
        .insert(secret_groups)
        .values({
          companyId: input.companyId,
          name,
        })
        .returning?.(this.secretGroupSelection()) as SecretGroupRecord[];

      if (!createdGroup) {
        throw new Error("Failed to create secret group.");
      }

      return createdGroup;
    });
  }

  async updateSecretGroup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      name?: string | null;
      secretGroupId: string;
    },
  ): Promise<SecretGroupRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const existingGroup = await this.requireSecretGroup(selectableDatabase, input.companyId, input.secretGroupId);
      const [updatedGroup] = await updatableDatabase
        .update(secret_groups)
        .set({
          name: input.name == null
            ? existingGroup.name
            : this.requireNonEmptyName(input.name, "Secret group name"),
        })
        .where(and(
          eq(secret_groups.companyId, input.companyId),
          eq(secret_groups.id, input.secretGroupId),
        ))
        .returning?.(this.secretGroupSelection()) as SecretGroupRecord[];

      if (!updatedGroup) {
        throw new Error("Failed to update secret group.");
      }

      return updatedGroup;
    });
  }

  async createSecret(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      description?: string | null;
      envVarName?: string | null;
      name: string;
      secretGroupId?: string | null;
      userId: string;
      value: string;
    },
  ): Promise<SecretRecord> {
    const name = this.requireNonEmptyName(input.name, "Secret name");
    const value = this.requireNonEmptyValue(input.value);
    const description = this.normalizeOptionalText(input.description);
    const encryptedSecret = this.encryptionService.encrypt(value);

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const selectableDatabase = tx as SelectableDatabase;
      const now = new Date();
      const secretGroupId = input.secretGroupId === undefined
        ? null
        : await this.requireSecretGroupId(selectableDatabase, input.companyId, input.secretGroupId);
      const envVarName = this.resolveEnvVarName(name, input.envVarName);
      const [createdSecret] = await insertableDatabase
        .insert(companySecrets)
        .values({
          companyId: input.companyId,
          createdAt: now,
          createdByUserId: input.userId,
          description,
          encryptedValue: encryptedSecret.encryptedValue,
          encryptionKeyId: encryptedSecret.encryptionKeyId,
          envVarName,
          name,
          secretGroupId,
          updatedAt: now,
          updatedByUserId: input.userId,
        })
        .returning?.(this.secretSelection()) as SecretRecord[];

      if (!createdSecret) {
        throw new Error("Failed to create secret.");
      }

      if (secretGroupId !== null) {
        await this.attachSecretToExistingSessionsForGroup(
          selectableDatabase,
          insertableDatabase,
          input.companyId,
          secretGroupId,
          createdSecret.id,
          input.userId,
        );
      }

      return createdSecret;
    });
  }

  async listSecretGroups(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SecretGroupRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const groups = await selectableDatabase
        .select(this.secretGroupSelection())
        .from(secret_groups)
        .where(eq(secret_groups.companyId, companyId)) as SecretGroupRecord[];

      return [...groups].sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async listSecrets(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<SecretRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const secrets = await selectableDatabase
        .select(this.secretSelection())
        .from(companySecrets)
        .where(eq(companySecrets.companyId, companyId)) as SecretRecord[];

      return [...secrets].sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async listAgentSecretGroups(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<SecretGroupRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const attachments = await selectableDatabase
        .select({
          secretGroupId: agentDefaultSecretGroups.secretGroupId,
        })
        .from(agentDefaultSecretGroups)
        .where(and(
          eq(agentDefaultSecretGroups.companyId, companyId),
          eq(agentDefaultSecretGroups.agentId, agentId),
        )) as Array<{ secretGroupId: string }>;

      return this.listSecretGroupsByIds(
        selectableDatabase,
        companyId,
        attachments.map((attachment) => attachment.secretGroupId),
      );
    });
  }

  async listAgentSecrets(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<SecretRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const attachments = await selectableDatabase
        .select({
          secretId: agentDefaultSecrets.secretId,
        })
        .from(agentDefaultSecrets)
        .where(and(
          eq(agentDefaultSecrets.companyId, companyId),
          eq(agentDefaultSecrets.agentId, agentId),
        )) as Array<{ secretId: string }>;

      return this.listSecretsByIds(
        selectableDatabase,
        companyId,
        attachments.map((attachment) => attachment.secretId),
      );
    });
  }

  async listSessionSecrets(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<SecretRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireSession(selectableDatabase, companyId, sessionId);
      const attachments = await selectableDatabase
        .select({
          secretId: agentSessionSecrets.secretId,
        })
        .from(agentSessionSecrets)
        .where(and(
          eq(agentSessionSecrets.companyId, companyId),
          eq(agentSessionSecrets.sessionId, sessionId),
        )) as Array<{ secretId: string }>;

      return this.listSecretsByIds(
        selectableDatabase,
        companyId,
        attachments.map((attachment) => attachment.secretId),
      );
    });
  }

  async deleteSecretGroup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      secretGroupId: string;
    },
  ): Promise<SecretGroupRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const agentsWithGroup = await this.listAgentIdsForGroup(selectableDatabase, input.companyId, input.secretGroupId);
      const groupedSecretIds = await this.listSecretIdsByGroupIds(
        selectableDatabase,
        input.companyId,
        [input.secretGroupId],
      );
      const [deletedGroup] = await deletableDatabase
        .delete(secret_groups)
        .where(and(
          eq(secret_groups.companyId, input.companyId),
          eq(secret_groups.id, input.secretGroupId),
        ))
        .returning?.(this.secretGroupSelection()) as SecretGroupRecord[];

      if (!deletedGroup) {
        throw new Error("Secret group not found.");
      }

      for (const agent of agentsWithGroup) {
        const remainingSecretIds = new Set(
          await this.listDefaultSecretIdsForAgent(selectableDatabase, input.companyId, agent.agentId),
        );
        const removableSecretIds = groupedSecretIds.filter((secretId) => !remainingSecretIds.has(secretId));
        await this.detachSecretsFromExistingAgentSessions(
          selectableDatabase,
          deletableDatabase,
          input.companyId,
          agent.agentId,
          removableSecretIds,
        );
      }

      return deletedGroup;
    });
  }

  async deleteSecret(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    secretId: string,
  ): Promise<SecretRecord> {
    return transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      const [deletedSecret] = await deletableDatabase
        .delete(companySecrets)
        .where(and(
          eq(companySecrets.companyId, companyId),
          eq(companySecrets.id, secretId),
        ))
        .returning?.(this.secretSelection()) as SecretRecord[];

      if (!deletedSecret) {
        throw new Error("Secret not found.");
      }

      return deletedSecret;
    });
  }

  async updateSecret(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      envVarName?: string | null;
      name?: string | null;
      secretGroupId?: string | null;
      secretId: string;
      userId: string;
      value?: string | null;
    },
  ): Promise<SecretRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const existingSecret = await this.requireSecret(selectableDatabase, input.companyId, input.secretId);
      const nextName = input.name == null
        ? existingSecret.name
        : this.requireNonEmptyName(input.name, "Secret name");
      const nextEnvVarName = input.envVarName === undefined
        ? existingSecret.envVarName
        : this.resolveEnvVarName(nextName, input.envVarName);
      const nextValue = input.value == null
        ? null
        : this.requireNonEmptyValue(input.value);
      const nextSecretGroupId = input.secretGroupId === undefined
        ? existingSecret.secretGroupId
        : await this.requireSecretGroupId(selectableDatabase, input.companyId, input.secretGroupId);
      const encryptedSecret = nextValue === null ? null : this.encryptionService.encrypt(nextValue);
      const [updatedSecret] = await updatableDatabase
        .update(companySecrets)
        .set({
          encryptedValue: encryptedSecret?.encryptedValue ?? undefined,
          encryptionKeyId: encryptedSecret?.encryptionKeyId ?? undefined,
          envVarName: nextEnvVarName,
          name: nextName,
          secretGroupId: nextSecretGroupId,
          updatedAt: new Date(),
          updatedByUserId: input.userId,
        })
        .where(and(
          eq(companySecrets.companyId, input.companyId),
          eq(companySecrets.id, input.secretId),
        ))
        .returning?.(this.secretSelection()) as SecretRecord[];

      if (!updatedSecret) {
        throw new Error("Failed to update secret.");
      }

      if (existingSecret.secretGroupId !== nextSecretGroupId) {
        if (existingSecret.secretGroupId !== null) {
          const agentsWithOldGroup = await this.listAgentIdsForGroup(
            selectableDatabase,
            input.companyId,
            existingSecret.secretGroupId,
          );
          for (const agent of agentsWithOldGroup) {
            const remainingSecretIds = new Set(
              await this.listDefaultSecretIdsForAgent(selectableDatabase, input.companyId, agent.agentId),
            );
            if (!remainingSecretIds.has(updatedSecret.id)) {
              await this.detachSecretsFromExistingAgentSessions(
                selectableDatabase,
                deletableDatabase,
                input.companyId,
                agent.agentId,
                [updatedSecret.id],
              );
            }
          }
        }

        if (nextSecretGroupId !== null) {
          await this.attachSecretToExistingSessionsForGroup(
            selectableDatabase,
            insertableDatabase,
            input.companyId,
            nextSecretGroupId,
            updatedSecret.id,
            input.userId,
          );
        }
      }

      return updatedSecret;
    });
  }

  async attachSecretToSession(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      secretId: string;
      sessionId: string;
      userId: string;
    },
  ): Promise<SecretRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const session = await this.requireSession(selectableDatabase, input.companyId, input.sessionId);
      if (session.status === "archived") {
        throw new Error("Archived sessions cannot be modified.");
      }

      const secret = await this.requireSecret(selectableDatabase, input.companyId, input.secretId);
      const existingAttachment = await selectableDatabase
        .select({
          secretId: agentSessionSecrets.secretId,
        })
        .from(agentSessionSecrets)
        .where(and(
          eq(agentSessionSecrets.companyId, input.companyId),
          eq(agentSessionSecrets.sessionId, input.sessionId),
          eq(agentSessionSecrets.secretId, input.secretId),
        )) as Array<{ secretId: string }>;

      if (existingAttachment.length === 0) {
        await insertableDatabase
          .insert(agentSessionSecrets)
          .values({
            companyId: input.companyId,
            createdAt: new Date(),
            createdByUserId: input.userId,
            secretId: input.secretId,
            sessionId: input.sessionId,
          });
      }

      return secret;
    });
  }

  async attachSecretToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      secretId: string;
      userId: string | null;
    },
  ): Promise<SecretRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);
      const secret = await this.requireSecret(selectableDatabase, input.companyId, input.secretId);
      const existingAttachment = await selectableDatabase
        .select({
          secretId: agentDefaultSecrets.secretId,
        })
        .from(agentDefaultSecrets)
        .where(and(
          eq(agentDefaultSecrets.companyId, input.companyId),
          eq(agentDefaultSecrets.agentId, input.agentId),
          eq(agentDefaultSecrets.secretId, input.secretId),
        )) as Array<{ secretId: string }>;

      if (existingAttachment.length === 0) {
        await insertableDatabase
          .insert(agentDefaultSecrets)
          .values({
            agentId: input.agentId,
            companyId: input.companyId,
            createdAt: new Date(),
            createdByUserId: input.userId,
            secretId: input.secretId,
          });
      }

      await this.attachSecretsToExistingAgentSessions(
        selectableDatabase,
        insertableDatabase,
        input.companyId,
        input.agentId,
        [input.secretId],
        input.userId,
      );

      return secret;
    });
  }

  async attachSecretGroupToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      secretGroupId: string;
      userId: string | null;
    },
  ): Promise<SecretGroupRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);
      const group = await this.requireSecretGroup(selectableDatabase, input.companyId, input.secretGroupId);
      const existingAttachment = await selectableDatabase
        .select({
          secretGroupId: agentDefaultSecretGroups.secretGroupId,
        })
        .from(agentDefaultSecretGroups)
        .where(and(
          eq(agentDefaultSecretGroups.companyId, input.companyId),
          eq(agentDefaultSecretGroups.agentId, input.agentId),
          eq(agentDefaultSecretGroups.secretGroupId, input.secretGroupId),
        )) as Array<{ secretGroupId: string }>;

      if (existingAttachment.length === 0) {
        await insertableDatabase
          .insert(agentDefaultSecretGroups)
          .values({
            agentId: input.agentId,
            companyId: input.companyId,
            createdAt: new Date(),
            createdByUserId: input.userId,
            secretGroupId: input.secretGroupId,
          });
      }

      const secretIds = await this.listSecretIdsByGroupIds(selectableDatabase, input.companyId, [input.secretGroupId]);
      await this.attachSecretsToExistingAgentSessions(
        selectableDatabase,
        insertableDatabase,
        input.companyId,
        input.agentId,
        secretIds,
        input.userId,
      );

      return group;
    });
  }

  async detachSecretFromSession(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    secretId: string,
  ): Promise<SecretRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      await this.requireSession(selectableDatabase, companyId, sessionId);
      const secret = await this.requireSecret(selectableDatabase, companyId, secretId);
      const [deletedAttachment] = await deletableDatabase
        .delete(agentSessionSecrets)
        .where(and(
          eq(agentSessionSecrets.companyId, companyId),
          eq(agentSessionSecrets.sessionId, sessionId),
          eq(agentSessionSecrets.secretId, secretId),
        ))
        .returning?.({
          secretId: agentSessionSecrets.secretId,
        }) as Array<{ secretId: string }>;

      if (!deletedAttachment) {
        throw new Error("Secret is not attached to the session.");
      }

      return secret;
    });
  }

  async detachSecretFromAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    secretId: string,
  ): Promise<SecretRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const secret = await this.requireSecret(selectableDatabase, companyId, secretId);
      const [deletedAttachment] = await deletableDatabase
        .delete(agentDefaultSecrets)
        .where(and(
          eq(agentDefaultSecrets.companyId, companyId),
          eq(agentDefaultSecrets.agentId, agentId),
          eq(agentDefaultSecrets.secretId, secretId),
        ))
        .returning?.({
          secretId: agentDefaultSecrets.secretId,
        }) as Array<{ secretId: string }>;

      if (!deletedAttachment) {
        throw new Error("Secret is not attached to the agent.");
      }

      const remainingSecretIds = new Set(
        await this.listDefaultSecretIdsForAgent(selectableDatabase, companyId, agentId),
      );
      if (!remainingSecretIds.has(secretId)) {
        await this.detachSecretsFromExistingAgentSessions(
          selectableDatabase,
          deletableDatabase,
          companyId,
          agentId,
          [secretId],
        );
      }

      return secret;
    });
  }

  async detachSecretGroupFromAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    secretGroupId: string,
  ): Promise<SecretGroupRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const group = await this.requireSecretGroup(selectableDatabase, companyId, secretGroupId);
      const groupedSecretIds = await this.listSecretIdsByGroupIds(selectableDatabase, companyId, [secretGroupId]);
      const [deletedAttachment] = await deletableDatabase
        .delete(agentDefaultSecretGroups)
        .where(and(
          eq(agentDefaultSecretGroups.companyId, companyId),
          eq(agentDefaultSecretGroups.agentId, agentId),
          eq(agentDefaultSecretGroups.secretGroupId, secretGroupId),
        ))
        .returning?.({
          secretGroupId: agentDefaultSecretGroups.secretGroupId,
        }) as Array<{ secretGroupId: string }>;

      if (!deletedAttachment) {
        throw new Error("Secret group is not attached to the agent.");
      }

      const remainingSecretIds = new Set(
        await this.listDefaultSecretIdsForAgent(selectableDatabase, companyId, agentId),
      );
      const removableSecretIds = groupedSecretIds.filter((candidateSecretId) => !remainingSecretIds.has(candidateSecretId));
      await this.detachSecretsFromExistingAgentSessions(
        selectableDatabase,
        deletableDatabase,
        companyId,
        agentId,
        removableSecretIds,
      );

      return group;
    });
  }

  async resolveSessionEnvironmentVariables(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<Record<string, string>> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireSession(selectableDatabase, companyId, sessionId);
      const attachments = await selectableDatabase
        .select({
          secretId: agentSessionSecrets.secretId,
        })
        .from(agentSessionSecrets)
        .where(and(
          eq(agentSessionSecrets.companyId, companyId),
          eq(agentSessionSecrets.sessionId, sessionId),
        )) as Array<{ secretId: string }>;

      const secretIds = attachments.map((attachment) => attachment.secretId);
      if (secretIds.length === 0) {
        return {};
      }

      const secrets = await selectableDatabase
        .select({
          encryptedValue: companySecrets.encryptedValue,
          encryptionKeyId: companySecrets.encryptionKeyId,
          envVarName: companySecrets.envVarName,
          id: companySecrets.id,
        })
        .from(companySecrets)
        .where(and(
          eq(companySecrets.companyId, companyId),
          inArray(companySecrets.id, secretIds),
        )) as PersistedSecretValueRecord[];

      return Object.fromEntries(secrets.map((secret) => [
        secret.envVarName,
        this.encryptionService.decrypt(secret.encryptedValue, secret.encryptionKeyId),
      ]));
    });
  }

  private normalizeOptionalText(value?: string | null): string | null {
    const normalizedValue = value?.trim() ?? "";
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private requireNonEmptyName(value: string, label: string): string {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private requireNonEmptyValue(value: string): string {
    if (value.trim().length === 0) {
      throw new Error("Secret value is required.");
    }

    return value;
  }

  private resolveEnvVarName(name: string, envVarName?: string | null): string {
    const explicitEnvVarName = envVarName?.trim() ?? "";
    const resolvedEnvVarName = explicitEnvVarName.length > 0
      ? explicitEnvVarName
      : name
        .toUpperCase()
        .replaceAll(/[\s-]+/g, "_")
        .replaceAll(/[^A-Z0-9_]/g, "_")
        .replaceAll(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    if (!/^[A-Z_][A-Z0-9_]*$/.test(resolvedEnvVarName)) {
      throw new Error("envVarName must be a valid environment variable name.");
    }

    return resolvedEnvVarName;
  }

  private async listSecretsByIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    secretIds: string[],
  ): Promise<SecretRecord[]> {
    if (secretIds.length === 0) {
      return [];
    }

    const secrets = await selectableDatabase
      .select(this.secretSelection())
      .from(companySecrets)
      .where(and(
        eq(companySecrets.companyId, companyId),
        inArray(companySecrets.id, secretIds),
      )) as SecretRecord[];

    return [...secrets].sort((left, right) => left.name.localeCompare(right.name));
  }

  private async requireAgent(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentId: string,
  ): Promise<AgentRecord> {
    const [agent] = await selectableDatabase
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      )) as AgentRecord[];

    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }

  private async requireSecret(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    secretId: string,
  ): Promise<SecretRecord> {
    const [secret] = await selectableDatabase
      .select(this.secretSelection())
      .from(companySecrets)
      .where(and(
        eq(companySecrets.companyId, companyId),
        eq(companySecrets.id, secretId),
      )) as SecretRecord[];

    if (!secret) {
      throw new Error("Secret not found.");
    }

    return secret;
  }

  private async requireSecretGroup(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    secretGroupId: string,
  ): Promise<SecretGroupRecord> {
    const [group] = await selectableDatabase
      .select(this.secretGroupSelection())
      .from(secret_groups)
      .where(and(
        eq(secret_groups.companyId, companyId),
        eq(secret_groups.id, secretGroupId),
      )) as SecretGroupRecord[];

    if (!group) {
      throw new Error("Secret group not found.");
    }

    return group;
  }

  private async requireSecretGroupId(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    secretGroupId: string | null,
  ): Promise<string | null> {
    if (secretGroupId === null) {
      return null;
    }

    const group = await this.requireSecretGroup(selectableDatabase, companyId, secretGroupId);
    return group.id;
  }

  private async requireSession(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionId: string,
  ): Promise<SessionRecord> {
    const [session] = await selectableDatabase
      .select({
        id: agentSessions.id,
        status: agentSessions.status,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, sessionId),
      )) as SessionRecord[];

    if (!session) {
      throw new Error("Session not found.");
    }

    return session;
  }

  private async listAgentSessionIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentId: string,
  ): Promise<string[]> {
    const sessions = await selectableDatabase
      .select({
        id: agentSessions.id,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.agentId, agentId),
      )) as AgentSessionIdRecord[];

    return sessions.map((session) => session.id);
  }

  private async listAgentIdsForGroup(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    secretGroupId: string,
  ): Promise<AgentSecretGroupAgentRecord[]> {
    return await selectableDatabase
      .select({
        agentId: agentDefaultSecretGroups.agentId,
        createdByUserId: agentDefaultSecretGroups.createdByUserId,
      })
      .from(agentDefaultSecretGroups)
      .where(and(
        eq(agentDefaultSecretGroups.companyId, companyId),
        eq(agentDefaultSecretGroups.secretGroupId, secretGroupId),
      )) as AgentSecretGroupAgentRecord[];
  }

  private async listDefaultSecretIdsForAgent(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentId: string,
  ): Promise<string[]> {
    const directAttachments = await selectableDatabase
      .select({
        createdByUserId: agentDefaultSecrets.createdByUserId,
        secretId: agentDefaultSecrets.secretId,
      })
      .from(agentDefaultSecrets)
      .where(and(
        eq(agentDefaultSecrets.companyId, companyId),
        eq(agentDefaultSecrets.agentId, agentId),
      )) as AgentDefaultSecretAttachmentRecord[];
    const groupAttachments = await selectableDatabase
      .select({
        createdByUserId: agentDefaultSecretGroups.createdByUserId,
        secretGroupId: agentDefaultSecretGroups.secretGroupId,
      })
      .from(agentDefaultSecretGroups)
      .where(and(
        eq(agentDefaultSecretGroups.companyId, companyId),
        eq(agentDefaultSecretGroups.agentId, agentId),
      )) as AgentDefaultSecretGroupAttachmentRecord[];

    const groupedSecretIds = await this.listSecretIdsByGroupIds(
      selectableDatabase,
      companyId,
      groupAttachments.map((attachment) => attachment.secretGroupId),
    );

    return [...new Set([
      ...directAttachments.map((attachment) => attachment.secretId),
      ...groupedSecretIds,
    ])];
  }

  private async listSecretGroupsByIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    secretGroupIds: string[],
  ): Promise<SecretGroupRecord[]> {
    if (secretGroupIds.length === 0) {
      return [];
    }

    const groups = await selectableDatabase
      .select(this.secretGroupSelection())
      .from(secret_groups)
      .where(and(
        eq(secret_groups.companyId, companyId),
        inArray(secret_groups.id, secretGroupIds),
      )) as SecretGroupRecord[];

    return [...groups].sort((left, right) => left.name.localeCompare(right.name));
  }

  private async listSecretIdsByGroupIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    secretGroupIds: string[],
  ): Promise<string[]> {
    if (secretGroupIds.length === 0) {
      return [];
    }

    const secrets = await selectableDatabase
      .select({
        id: companySecrets.id,
      })
      .from(companySecrets)
      .where(and(
        eq(companySecrets.companyId, companyId),
        inArray(companySecrets.secretGroupId, secretGroupIds),
      )) as Array<{ id: string }>;

    return [...new Set(secrets.map((secret) => secret.id))];
  }

  private async attachSecretToExistingSessionsForGroup(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    secretGroupId: string,
    secretId: string,
    userId: string | null,
  ): Promise<void> {
    const agentsWithGroup = await this.listAgentIdsForGroup(selectableDatabase, companyId, secretGroupId);
    for (const agent of agentsWithGroup) {
      await this.attachSecretsToExistingAgentSessions(
        selectableDatabase,
        insertableDatabase,
        companyId,
        agent.agentId,
        [secretId],
        userId ?? agent.createdByUserId,
      );
    }
  }

  private async attachSecretsToExistingAgentSessions(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    agentId: string,
    secretIds: string[],
    userId: string | null,
  ): Promise<void> {
    const uniqueSecretIds = [...new Set(secretIds.filter((secretId) => secretId.length > 0))];
    if (uniqueSecretIds.length === 0) {
      return;
    }

    const sessionIds = await this.listAgentSessionIds(selectableDatabase, companyId, agentId);
    if (sessionIds.length === 0) {
      return;
    }

    const existingAttachments = await selectableDatabase
      .select({
        secretId: agentSessionSecrets.secretId,
        sessionId: agentSessionSecrets.sessionId,
      })
      .from(agentSessionSecrets)
      .where(and(
        eq(agentSessionSecrets.companyId, companyId),
        inArray(agentSessionSecrets.secretId, uniqueSecretIds),
        inArray(agentSessionSecrets.sessionId, sessionIds),
      )) as SessionSecretAttachmentRecord[];
    const existingAttachmentKeys = new Set(
      existingAttachments.map((attachment) => `${attachment.sessionId}:${attachment.secretId}`),
    );
    const valuesToInsert = sessionIds.flatMap((sessionId) => uniqueSecretIds
      .filter((secretId) => !existingAttachmentKeys.has(`${sessionId}:${secretId}`))
      .map((secretId) => ({
        companyId,
        createdAt: new Date(),
        createdByUserId: userId,
        secretId,
        sessionId,
      })));

    if (valuesToInsert.length === 0) {
      return;
    }

    await insertableDatabase
      .insert(agentSessionSecrets)
      .values(valuesToInsert);
  }

  private async detachSecretsFromExistingAgentSessions(
    selectableDatabase: SelectableDatabase,
    deletableDatabase: DeletableDatabase,
    companyId: string,
    agentId: string,
    secretIds: string[],
  ): Promise<void> {
    const uniqueSecretIds = [...new Set(secretIds.filter((secretId) => secretId.length > 0))];
    if (uniqueSecretIds.length === 0) {
      return;
    }

    const sessionIds = await this.listAgentSessionIds(selectableDatabase, companyId, agentId);
    if (sessionIds.length === 0) {
      return;
    }

    await deletableDatabase
      .delete(agentSessionSecrets)
      .where(and(
        eq(agentSessionSecrets.companyId, companyId),
        inArray(agentSessionSecrets.secretId, uniqueSecretIds),
        inArray(agentSessionSecrets.sessionId, sessionIds),
      ));
  }

  private secretGroupSelection(): Record<string, unknown> {
    return {
      companyId: secret_groups.companyId,
      id: secret_groups.id,
      name: secret_groups.name,
    };
  }

  private secretSelection(): Record<string, unknown> {
    return {
      companyId: companySecrets.companyId,
      createdAt: companySecrets.createdAt,
      description: companySecrets.description,
      envVarName: companySecrets.envVarName,
      id: companySecrets.id,
      name: companySecrets.name,
      secretGroupId: companySecrets.secretGroupId,
      updatedAt: companySecrets.updatedAt,
    };
  }
}
