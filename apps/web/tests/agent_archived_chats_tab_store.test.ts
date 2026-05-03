import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecordProxy, RecordSourceSelectorProxy, RootRecordProxy } from "relay-runtime";
import { AgentArchivedChatsTabStore } from "../src/pages/agents/agent_archived_chats_tab_store";

function createRecord(dataId: string): RecordProxy {
  return {
    getDataID() {
      return dataId;
    },
    getLinkedRecord() {
      return null;
    },
    getLinkedRecords() {
      return null;
    },
    getValue() {
      return null;
    },
    setLinkedRecord() {},
    setLinkedRecords() {},
    setValue() {},
  };
}

function createRootRecord(
  currentSessions: ReadonlyArray<unknown>,
  onSetSessions: (records: ReadonlyArray<unknown>) => void,
): RootRecordProxy {
  return {
    ...createRecord("root"),
    getLinkedRecords(name: string) {
      assert.equal(name, "Sessions");
      return currentSessions;
    },
    setLinkedRecord() {},
    setLinkedRecords(records: ReadonlyArray<unknown>, name: string) {
      assert.equal(name, "Sessions");
      onSetSessions(records);
    },
  };
}

test("removes an archived session from the root list before deleting its Relay record", () => {
  const keptSession = createRecord("session-kept");
  const deletedSession = createRecord("session-deleted");
  const events: string[] = [];
  let nextSessions: ReadonlyArray<unknown> | null = null;

  const store: RecordSourceSelectorProxy = {
    delete(dataId: string) {
      events.push(`delete:${dataId}`);
    },
    get() {
      return null;
    },
    getPluralRootField() {
      return null;
    },
    getRoot() {
      return createRootRecord([keptSession, deletedSession], (records) => {
        events.push("set:Sessions");
        nextSessions = records;
      });
    },
    getRootField() {
      return null;
    },
  };

  AgentArchivedChatsTabStore.removeDeletedSession(store, "session-deleted");

  assert.deepEqual(events, ["set:Sessions", "delete:session-deleted"]);
  assert.deepEqual(
    nextSessions?.map((record) => (record as RecordProxy).getDataID()),
    ["session-kept"],
  );
});

test("cleans null Relay slots from the root session list during archived delete updates", () => {
  const keptSession = createRecord("session-kept");
  let nextSessions: ReadonlyArray<unknown> | null = null;

  const store: RecordSourceSelectorProxy = {
    delete() {},
    get() {
      return null;
    },
    getPluralRootField() {
      return null;
    },
    getRoot() {
      return createRootRecord([keptSession, null], (records) => {
        nextSessions = records;
      });
    },
    getRootField() {
      return null;
    },
  };

  AgentArchivedChatsTabStore.removeDeletedSession(store, "session-deleted");

  assert.deepEqual(
    nextSessions?.map((record) => (record as RecordProxy).getDataID()),
    ["session-kept"],
  );
});
