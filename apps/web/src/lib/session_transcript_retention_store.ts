import { createOperationDescriptor, getRequest } from "relay-runtime";

type RetainedTranscriptPageRecord = {
  after: string | null;
  operation: ReturnType<typeof createOperationDescriptor>;
  retention: { dispose(): void };
};

type RetainedTranscriptSessionRecord = {
  afterOrder: string[];
  lastAccessedAt: number;
  pagesByAfterKey: Map<string, RetainedTranscriptPageRecord>;
  sessionUpdatedAt: string;
};

export type RetainedTranscriptSnapshot<QueryResponse> = Readonly<{
  pageResponses: QueryResponse[];
  sessionUpdatedAt: string;
}>;

/**
 * Keeps transcript query operations retained inside Relay so the app can rebuild a session
 * transcript directly from the Relay store after route changes, while still refreshing only the
 * newest page when the session activity timestamp advances.
 */
export class SessionTranscriptRetentionStore {
  private static readonly MAX_RETAINED_SESSIONS = 10;

  private readonly environment: {
    lookup(fragment: ReturnType<typeof createOperationDescriptor>["fragment"]): { data: unknown };
    retain(operation: ReturnType<typeof createOperationDescriptor>): { dispose(): void };
  };

  private readonly sessionsById = new Map<string, RetainedTranscriptSessionRecord>();

  constructor(environment: {
    lookup(fragment: ReturnType<typeof createOperationDescriptor>["fragment"]): { data: unknown };
    retain(operation: ReturnType<typeof createOperationDescriptor>): { dispose(): void };
  }) {
    this.environment = environment;
  }

  read<QueryResponse>(sessionId: string): RetainedTranscriptSnapshot<QueryResponse> | null {
    const sessionRecord = this.sessionsById.get(sessionId) ?? null;
    if (!sessionRecord) {
      return null;
    }
    sessionRecord.lastAccessedAt = Date.now();

    const headPageRecord = sessionRecord.pagesByAfterKey.get(this.resolveAfterKey(null)) ?? null;
    if (!headPageRecord) {
      return null;
    }

    const pageResponses: QueryResponse[] = [];
    for (const afterKey of sessionRecord.afterOrder) {
      const pageRecord = sessionRecord.pagesByAfterKey.get(afterKey) ?? null;
      if (!pageRecord) {
        continue;
      }

      const snapshot = this.environment.lookup(pageRecord.operation.fragment);
      if (!snapshot.data) {
        continue;
      }

      pageResponses.push(snapshot.data as QueryResponse);
    }

    if (pageResponses.length === 0) {
      return null;
    }

    return {
      pageResponses,
      sessionUpdatedAt: sessionRecord.sessionUpdatedAt,
    };
  }

  retain(options: {
    after: string | null;
    query: unknown;
    sessionId: string;
    sessionUpdatedAt: string;
    variables: Record<string, unknown>;
  }): void {
    const afterKey = this.resolveAfterKey(options.after);
    const sessionRecord = this.resolveSessionRecord(options.sessionId, options.sessionUpdatedAt);
    sessionRecord.lastAccessedAt = Date.now();
    sessionRecord.sessionUpdatedAt = options.sessionUpdatedAt;

    if (sessionRecord.pagesByAfterKey.has(afterKey)) {
      this.evictOverflowSessions();
      return;
    }

    const request = getRequest(options.query);
    const operation = createOperationDescriptor(request, options.variables);
    sessionRecord.pagesByAfterKey.set(afterKey, {
      after: options.after,
      operation,
      retention: this.environment.retain(operation),
    });
    sessionRecord.afterOrder.push(afterKey);
    this.evictOverflowSessions();
  }

  private resolveAfterKey(after: string | null): string {
    return after ?? "__head__";
  }

  private resolveSessionRecord(sessionId: string, sessionUpdatedAt: string): RetainedTranscriptSessionRecord {
    const existingRecord = this.sessionsById.get(sessionId) ?? null;
    if (existingRecord) {
      return existingRecord;
    }

    const nextRecord: RetainedTranscriptSessionRecord = {
      afterOrder: [],
      lastAccessedAt: Date.now(),
      pagesByAfterKey: new Map<string, RetainedTranscriptPageRecord>(),
      sessionUpdatedAt,
    };
    this.sessionsById.set(sessionId, nextRecord);
    return nextRecord;
  }

  private evictOverflowSessions(): void {
    if (this.sessionsById.size <= SessionTranscriptRetentionStore.MAX_RETAINED_SESSIONS) {
      return;
    }

    const sessionsByLeastRecentAccess = [...this.sessionsById.entries()]
      .sort((leftSession, rightSession) => leftSession[1].lastAccessedAt - rightSession[1].lastAccessedAt);
    for (const [sessionId, sessionRecord] of sessionsByLeastRecentAccess) {
      if (this.sessionsById.size <= SessionTranscriptRetentionStore.MAX_RETAINED_SESSIONS) {
        break;
      }

      for (const pageRecord of sessionRecord.pagesByAfterKey.values()) {
        pageRecord.retention.dispose();
      }
      this.sessionsById.delete(sessionId);
    }
  }
}
