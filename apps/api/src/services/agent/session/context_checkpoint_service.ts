import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { sessionContextCheckpoints } from "../../../db/schema.ts";

type SessionContextCheckpointRecord = {
  companyId: string;
  contextMessages: unknown;
  createdAt: Date;
  currentContextTokens: number | null;
  maxContextTokens: number | null;
  sessionId: string;
  turnId: string;
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
    values(value: Record<string, unknown>): Promise<unknown>;
  };
};

export type SessionContextCheckpointInput = {
  companyId: string;
  contextMessages: unknown;
  createdAt: Date;
  currentContextTokens: number | null;
  maxContextTokens: number | null;
  sessionId: string;
  turnId: string;
};

/**
 * Owns persisted turn checkpoints for agent sessions. Each checkpoint captures the fully resolved
 * PI Mono context after one turn finishes so later features like session forking can branch from a
 * stable historical turn without replaying the whole transcript through the runtime.
 */
@injectable()
export class SessionContextCheckpointService {
  async createCheckpointInTransaction(
    insertableDatabase: InsertableDatabase,
    input: SessionContextCheckpointInput,
  ): Promise<void> {
    await insertableDatabase
      .insert(sessionContextCheckpoints)
      .values({
        companyId: input.companyId,
        contextMessages: input.contextMessages,
        createdAt: input.createdAt,
        currentContextTokens: input.currentContextTokens,
        maxContextTokens: input.maxContextTokens,
        sessionId: input.sessionId,
        turnId: input.turnId,
      });
  }

  async getCheckpointForTurn(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    turnId: string,
  ): Promise<SessionContextCheckpointRecord | null> {
    const [checkpointRecord] = await selectableDatabase
      .select({
        companyId: sessionContextCheckpoints.companyId,
        contextMessages: sessionContextCheckpoints.contextMessages,
        createdAt: sessionContextCheckpoints.createdAt,
        currentContextTokens: sessionContextCheckpoints.currentContextTokens,
        maxContextTokens: sessionContextCheckpoints.maxContextTokens,
        sessionId: sessionContextCheckpoints.sessionId,
        turnId: sessionContextCheckpoints.turnId,
      })
      .from(sessionContextCheckpoints)
      .where(and(
        eq(sessionContextCheckpoints.companyId, companyId),
        eq(sessionContextCheckpoints.turnId, turnId),
      )) as SessionContextCheckpointRecord[];

    return checkpointRecord ?? null;
  }
}
