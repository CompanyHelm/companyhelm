import type { RecordProxy, RecordSourceSelectorProxy } from "relay-runtime";

/**
 * Keeps the agent detail page's denormalized Relay session list consistent after archived-chat
 * mutations restore or remove records. The root Sessions field is not a connection, so archived
 * chat mutations must update the cached list explicitly instead of relying on Relay to infer it.
 */
export class AgentArchivedChatsTabStore {
  public static restoreUnarchivedSession(store: RecordSourceSelectorProxy, sessionId: string): void {
    const rootRecord = store.getRoot();
    const restoredSession = store.getRootField("UnarchiveSession") ?? store.get(sessionId);
    if (!AgentArchivedChatsTabStore.isRecordProxy(restoredSession)) {
      return;
    }

    const currentSessions = AgentArchivedChatsTabStore.filterStoreRecords(rootRecord.getLinkedRecords("Sessions") || []);
    if (currentSessions.some((sessionRecord) => sessionRecord.getDataID() === restoredSession.getDataID())) {
      return;
    }

    rootRecord.setLinkedRecords([...currentSessions, restoredSession], "Sessions");
  }

  public static removeDeletedSession(store: RecordSourceSelectorProxy, sessionId: string): void {
    const rootRecord = store.getRoot();
    const currentSessions = rootRecord.getLinkedRecords("Sessions") || [];
    const nextSessions: RecordProxy[] = [];
    let didRemoveSession = false;

    for (const sessionRecord of currentSessions) {
      if (!AgentArchivedChatsTabStore.isRecordProxy(sessionRecord)) {
        didRemoveSession = true;
        continue;
      }

      if (sessionRecord.getDataID() === sessionId) {
        didRemoveSession = true;
        continue;
      }

      nextSessions.push(sessionRecord);
    }

    if (didRemoveSession) {
      rootRecord.setLinkedRecords(nextSessions, "Sessions");
    }

    store.delete?.(sessionId);
  }

  private static isRecordProxy(record: unknown): record is RecordProxy {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  }

  private static filterStoreRecords(records: ReadonlyArray<unknown>): RecordProxy[] {
    return records.filter((record): record is RecordProxy => AgentArchivedChatsTabStore.isRecordProxy(record));
  }
}
