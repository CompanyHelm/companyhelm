import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentDefaultSecrets,
  agentSessions,
  agentSessionSecrets,
  agents,
  companySecrets,
} from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { SecretEncryptionService } from "./encryption.ts";

type AgentRecord = {
  id: string;
};

type SecretRecord = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
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
    values(value: Record<string, unknown>): {
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
 * Owns the company secret catalog plus the agent and session attachment layers. It keeps secret
 * values encrypted at rest, fans agent default secret changes out to existing sessions for that
 * agent, and never exposes plaintext back through GraphQL.
 */
@injectable()
export class SecretService {
  private readonly encryptionService: SecretEncryptionService;

  constructor(@inject(SecretEncryptionService) encryptionService: SecretEncryptionService) {
    this.encryptionService = encryptionService;
  }

  async createSecret(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      description?: string | null;
      envVarName?: string | null;
      name: string;
      userId: string;
      value: string;
    },
  ): Promise<SecretRecord> {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new Error("Secret name is required.");
    }

    const value = input.value.trim();
    if (value.length === 0) {
      throw new Error("Secret value is required.");
    }

    const description = this.normalizeOptionalText(input.description);
    const envVarName = this.resolveEnvVarName(name, input.envVarName);
    const encryptedSecret = this.encryptionService.encrypt(value);

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const now = new Date();
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
          updatedAt: now,
          updatedByUserId: input.userId,
        })
        .returning?.(this.secretSelection()) as SecretRecord[];

      if (!createdSecret) {
        throw new Error("Failed to create secret.");
      }

      return createdSecret;
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
      secretId: string;
      userId: string;
      value?: string | null;
    },
  ): Promise<SecretRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const existingSecret = await this.requireSecret(selectableDatabase, input.companyId, input.secretId);
      const nextName = input.name === undefined
        ? existingSecret.name
        : this.requireNonEmptyName(input.name);
      const nextEnvVarName = input.envVarName === undefined
        ? existingSecret.envVarName
        : this.resolveEnvVarName(nextName, input.envVarName);
      const nextValue = input.value === undefined
        ? null
        : this.requireNonEmptyValue(input.value);
      const encryptedSecret = nextValue === null ? null : this.encryptionService.encrypt(nextValue);
      const [updatedSecret] = await updatableDatabase
        .update(companySecrets)
        .set({
          encryptedValue: encryptedSecret?.encryptedValue ?? undefined,
          encryptionKeyId: encryptedSecret?.encryptionKeyId ?? undefined,
          envVarName: nextEnvVarName,
          name: nextName,
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
      await this.attachSecretToExistingAgentSessions(
        selectableDatabase,
        insertableDatabase,
        input.companyId,
        input.agentId,
        input.secretId,
        input.userId,
      );

      return secret;
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
      await this.detachSecretFromExistingAgentSessions(
        selectableDatabase,
        deletableDatabase,
        companyId,
        agentId,
        secretId,
      );

      return secret;
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

  private requireNonEmptyName(value: string): string {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      throw new Error("Secret name is required.");
    }

    return normalizedValue;
  }

  private requireNonEmptyValue(value: string): string {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      throw new Error("Secret value is required.");
    }

    return normalizedValue;
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

  private async attachSecretToExistingAgentSessions(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    agentId: string,
    secretId: string,
    userId: string | null,
  ): Promise<void> {
    const sessionIds = await this.listAgentSessionIds(selectableDatabase, companyId, agentId);
    if (sessionIds.length === 0) {
      return;
    }

    const existingAttachments = await selectableDatabase
      .select({
        sessionId: agentSessionSecrets.sessionId,
      })
      .from(agentSessionSecrets)
      .where(and(
        eq(agentSessionSecrets.companyId, companyId),
        eq(agentSessionSecrets.secretId, secretId),
        inArray(agentSessionSecrets.sessionId, sessionIds),
      )) as SessionSecretAttachmentRecord[];
    const existingSessionIds = new Set(existingAttachments.map((attachment) => attachment.sessionId));

    for (const sessionId of sessionIds) {
      if (existingSessionIds.has(sessionId)) {
        continue;
      }

      await insertableDatabase
        .insert(agentSessionSecrets)
        .values({
          companyId,
          createdAt: new Date(),
          createdByUserId: userId,
          secretId,
          sessionId,
        });
    }
  }

  private async detachSecretFromExistingAgentSessions(
    selectableDatabase: SelectableDatabase,
    deletableDatabase: DeletableDatabase,
    companyId: string,
    agentId: string,
    secretId: string,
  ): Promise<void> {
    const sessionIds = await this.listAgentSessionIds(selectableDatabase, companyId, agentId);
    if (sessionIds.length === 0) {
      return;
    }

    await deletableDatabase
      .delete(agentSessionSecrets)
      .where(and(
        eq(agentSessionSecrets.companyId, companyId),
        eq(agentSessionSecrets.secretId, secretId),
        inArray(agentSessionSecrets.sessionId, sessionIds),
      ));
  }

  private secretSelection(): Record<string, unknown> {
    return {
      companyId: companySecrets.companyId,
      createdAt: companySecrets.createdAt,
      description: companySecrets.description,
      envVarName: companySecrets.envVarName,
      id: companySecrets.id,
      name: companySecrets.name,
      updatedAt: companySecrets.updatedAt,
    };
  }
}
