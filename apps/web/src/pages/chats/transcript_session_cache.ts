export type TranscriptSessionCacheSnapshot<MessageRecord> = Readonly<{
  endCursor: string | null;
  hasLoadedInitialPage: boolean;
  hasNextPage: boolean;
  messages: ReadonlyArray<MessageRecord>;
  sessionUpdatedAt: string;
}>;

/**
 * Retains the transcript pages already loaded for each session while the chats page stays mounted
 * so switching between chats can render immediately from memory and only refresh if the session
 * has advanced since the snapshot was stored.
 */
export class TranscriptSessionCache<MessageRecord> {
  private readonly snapshotsBySessionId = new Map<string, TranscriptSessionCacheSnapshot<MessageRecord>>();

  read(sessionId: string): TranscriptSessionCacheSnapshot<MessageRecord> | null {
    const snapshot = this.snapshotsBySessionId.get(sessionId) ?? null;
    if (!snapshot) {
      return null;
    }

    return {
      ...snapshot,
      messages: [...snapshot.messages],
    };
  }

  write(sessionId: string, snapshot: TranscriptSessionCacheSnapshot<MessageRecord>): void {
    this.snapshotsBySessionId.set(sessionId, {
      ...snapshot,
      messages: [...snapshot.messages],
    });
  }
}
