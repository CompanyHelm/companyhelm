import type { RecordProxy, RecordSourceSelectorProxy } from "relay-runtime";

/**
 * Keeps the agent detail page's denormalized Relay session list consistent after archived-chat
 * mutations remove records from the normalized store. The root Sessions field is not a connection,
 * so destructive mutations must prune it explicitly before deleting the backing record.
 */
export class AgentArchivedChatsTabStore {
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
}
