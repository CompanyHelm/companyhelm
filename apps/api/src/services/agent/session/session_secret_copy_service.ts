import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { agentDefaultSecrets, agentSessionSecrets } from "../../../db/schema.ts";
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
    const defaultSecrets = await selectableDatabase
      .select({
        createdByUserId: agentDefaultSecrets.createdByUserId,
        secretId: agentDefaultSecrets.secretId,
      })
      .from(agentDefaultSecrets)
      .where(and(
        eq(agentDefaultSecrets.companyId, companyId),
        eq(agentDefaultSecrets.agentId, agentId),
      )) as AgentDefaultSecretRecord[];

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
