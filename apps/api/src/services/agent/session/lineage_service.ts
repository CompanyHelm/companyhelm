import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { agentSessions, sessionTurns } from "../../../db/schema.ts";

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type SessionForkRecord = {
  forkedFromTurnId: string | null;
  id: string;
};

export type SessionLineageTurnRecord = {
  endedAt: Date | null;
  id: string;
  sessionId: string;
  startedAt: Date;
};

function compareTurnsByStart(leftTurn: SessionLineageTurnRecord, rightTurn: SessionLineageTurnRecord): number {
  const startedAtDifference = leftTurn.startedAt.getTime() - rightTurn.startedAt.getTime();
  if (startedAtDifference !== 0) {
    return startedAtDifference;
  }

  return leftTurn.id.localeCompare(rightTurn.id);
}

/**
 * Resolves the visible turn lineage for one session. A forked session inherits every ancestor turn
 * through the selected fork point, then appends its own turns, so transcript reads and later forks
 * can operate on the exact branch the user sees in the chats UI.
 */
@injectable()
export class SessionLineageService {
  async listVisibleTurns(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionId: string,
  ): Promise<SessionLineageTurnRecord[]> {
    return this.listVisibleTurnsWithVisitedSessions(
      selectableDatabase,
      companyId,
      sessionId,
      new Set<string>(),
    );
  }

  async listVisibleTurnIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionId: string,
  ): Promise<string[]> {
    const turns = await this.listVisibleTurns(selectableDatabase, companyId, sessionId);
    return turns.map((turn) => turn.id);
  }

  private async listVisibleTurnsWithVisitedSessions(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    sessionId: string,
    visitedSessionIds: Set<string>,
  ): Promise<SessionLineageTurnRecord[]> {
    if (visitedSessionIds.has(sessionId)) {
      throw new Error("Circular session fork lineage is not supported.");
    }

    const nextVisitedSessionIds = new Set(visitedSessionIds);
    nextVisitedSessionIds.add(sessionId);

    const [sessionRecord] = await selectableDatabase
      .select({
        forkedFromTurnId: agentSessions.forkedFromTurnId,
        id: agentSessions.id,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, sessionId),
      )) as SessionForkRecord[];
    if (!sessionRecord) {
      return [];
    }

    const ownTurns = await selectableDatabase
      .select({
        endedAt: sessionTurns.endedAt,
        id: sessionTurns.id,
        sessionId: sessionTurns.sessionId,
        startedAt: sessionTurns.startedAt,
      })
      .from(sessionTurns)
      .where(and(
        eq(sessionTurns.companyId, companyId),
        eq(sessionTurns.sessionId, sessionId),
      )) as SessionLineageTurnRecord[];
    const sortedOwnTurns = [...ownTurns].sort(compareTurnsByStart);
    if (!sessionRecord.forkedFromTurnId) {
      return sortedOwnTurns;
    }

    const [forkSourceTurn] = await selectableDatabase
      .select({
        endedAt: sessionTurns.endedAt,
        id: sessionTurns.id,
        sessionId: sessionTurns.sessionId,
        startedAt: sessionTurns.startedAt,
      })
      .from(sessionTurns)
      .where(and(
        eq(sessionTurns.companyId, companyId),
        eq(sessionTurns.id, sessionRecord.forkedFromTurnId),
      )) as SessionLineageTurnRecord[];
    if (!forkSourceTurn) {
      throw new Error("Fork source turn not found.");
    }

    const ancestorTurns = await this.listVisibleTurnsWithVisitedSessions(
      selectableDatabase,
      companyId,
      forkSourceTurn.sessionId,
      nextVisitedSessionIds,
    );
    const sourceTurnIndex = ancestorTurns.findIndex((turn) => turn.id === forkSourceTurn.id);
    if (sourceTurnIndex < 0) {
      throw new Error("Fork source turn is not visible in its source session.");
    }

    return [
      ...ancestorTurns.slice(0, sourceTurnIndex + 1),
      ...sortedOwnTurns,
    ];
  }
}
