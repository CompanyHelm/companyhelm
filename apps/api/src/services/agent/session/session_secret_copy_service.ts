import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import {
  agentDefaultSecretGroups,
  agentDefaultSecrets,
  agentSessionSecrets,
  companySecrets,
} from "../../../db/schema.ts";
import type {
  AgentDefaultSecretRecord,
  AgentSessionSecretRecord,
  InsertableDatabase,
  SelectableDatabase,
} from "./session_manager_service_types.ts";

/**
 * Copies persisted secret bindings onto new sessions. Isolating these inserts keeps the lifecycle
 * orchestration readable while preserving the rules for inheriting agent defaults and forked
 * session secrets in one place.
 */
@injectable()
export class SessionSecretCopyService {
  async copyAgentDefaultSecretsToSession(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    agentId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<void> {
    const directDefaultSecrets = await selectableDatabase
      .select({
        createdByUserId: agentDefaultSecrets.createdByUserId,
        secretId: agentDefaultSecrets.secretId,
      })
      .from(agentDefaultSecrets)
      .where(and(
        eq(agentDefaultSecrets.companyId, companyId),
        eq(agentDefaultSecrets.agentId, agentId),
      )) as AgentDefaultSecretRecord[];
    const groupedSecretAttachments = await selectableDatabase
      .select({
        createdByUserId: agentDefaultSecretGroups.createdByUserId,
        secretGroupId: agentDefaultSecretGroups.secretGroupId,
      })
      .from(agentDefaultSecretGroups)
      .where(and(
        eq(agentDefaultSecretGroups.companyId, companyId),
        eq(agentDefaultSecretGroups.agentId, agentId),
      )) as Array<{ createdByUserId: string | null; secretGroupId: string }>;
    const groupedSecretIds = groupedSecretAttachments.length === 0
      ? []
      : await selectableDatabase
        .select({
          secretGroupId: companySecrets.secretGroupId,
          secretId: companySecrets.id,
        })
        .from(companySecrets)
        .where(and(
          eq(companySecrets.companyId, companyId),
          inArray(
            companySecrets.secretGroupId,
            groupedSecretAttachments.map((attachment) => attachment.secretGroupId),
          ),
        )) as Array<{ secretGroupId: string | null; secretId: string }>;
    const groupedCreatedByUserIdByGroupId = new Map(
      groupedSecretAttachments.map((attachment) => [attachment.secretGroupId, attachment.createdByUserId]),
    );
    const groupedDefaultSecrets = groupedSecretIds
      .map((groupedSecret) => {
        if (groupedSecret.secretGroupId === null) {
          return null;
        }

        return {
          createdByUserId: groupedCreatedByUserIdByGroupId.get(groupedSecret.secretGroupId) ?? null,
          secretId: groupedSecret.secretId,
        };
      })
      .filter((groupedSecret): groupedSecret is AgentDefaultSecretRecord => groupedSecret !== null);
    const defaultSecrets = [...new Map(
      [...directDefaultSecrets, ...groupedDefaultSecrets].map((defaultSecret) => [defaultSecret.secretId, defaultSecret]),
    ).values()];

    if (defaultSecrets.length === 0) {
      return;
    }

    await insertableDatabase
      .insert(agentSessionSecrets)
      .values(defaultSecrets.map((defaultSecret) => ({
        companyId,
        createdAt: new Date(),
        createdByUserId: userId ?? defaultSecret.createdByUserId,
        secretId: defaultSecret.secretId,
        sessionId,
      })));
  }

  async copySessionSecretsToSession(
    selectableDatabase: SelectableDatabase,
    insertableDatabase: InsertableDatabase,
    companyId: string,
    sourceSessionId: string,
    targetSessionId: string,
    userId?: string | null,
  ): Promise<void> {
    const sessionSecrets = await selectableDatabase
      .select({
        createdByUserId: agentSessionSecrets.createdByUserId,
        secretId: agentSessionSecrets.secretId,
      })
      .from(agentSessionSecrets)
      .where(and(
        eq(agentSessionSecrets.companyId, companyId),
        eq(agentSessionSecrets.sessionId, sourceSessionId),
      )) as AgentSessionSecretRecord[];

    if (sessionSecrets.length === 0) {
      return;
    }

    await insertableDatabase
      .insert(agentSessionSecrets)
      .values(sessionSecrets.map((sessionSecret) => ({
        companyId,
        createdAt: new Date(),
        createdByUserId: userId ?? sessionSecret.createdByUserId,
        secretId: sessionSecret.secretId,
        sessionId: targetSessionId,
      })));
  }
}
