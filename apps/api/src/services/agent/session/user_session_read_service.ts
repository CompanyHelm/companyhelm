import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSessions, userSessionReads } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";

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

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown>;
  };
};

type SessionRecord = {
  id: string;
};

/**
 * Owns persistence of per-user session read receipts. Its scope is intentionally narrow: one row
 * means the user has already seen the latest completed turn for that session, and deleting rows
 * resets the unread state for everyone when a new turn finishes.
 */
@injectable()
export class UserSessionReadService {
  async markSessionRead(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      sessionId: string;
      userId: string;
    },
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      const deletableDatabase = tx as DeletableDatabase;

      const [sessionRecord] = await selectableDatabase
        .select({
          id: agentSessions.id,
        })
        .from(agentSessions)
        .where(and(
          eq(agentSessions.companyId, input.companyId),
          eq(agentSessions.id, input.sessionId),
        )) as SessionRecord[];
      if (!sessionRecord) {
        throw new Error("Session not found.");
      }

      await deletableDatabase
        .delete(userSessionReads)
        .where(and(
          eq(userSessionReads.companyId, input.companyId),
          eq(userSessionReads.userId, input.userId),
          eq(userSessionReads.sessionId, input.sessionId),
        ));

      await insertableDatabase
        .insert(userSessionReads)
        .values({
          companyId: input.companyId,
          userId: input.userId,
          sessionId: input.sessionId,
          createdAt: new Date(),
        });
    });
  }

  async clearSessionReads(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      sessionId: string;
    },
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;

      await deletableDatabase
        .delete(userSessionReads)
        .where(and(
          eq(userSessionReads.companyId, input.companyId),
          eq(userSessionReads.sessionId, input.sessionId),
        ));
    });
  }
}
