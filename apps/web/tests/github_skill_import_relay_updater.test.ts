import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecordProxy, RecordSourceSelectorProxy, RootRecordProxy } from "relay-runtime";
import { GithubSkillImportRelayUpdater } from "../src/pages/skills/github_skill_import_relay_updater";

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
  currentSkills: RecordProxy[],
  onSetSkills: (records: ReadonlyArray<unknown>) => void,
): RootRecordProxy {
  return {
    ...createRecord("root"),
    getLinkedRecords(name: string) {
      assert.equal(name, "Skills");
      return currentSkills;
    },
    setLinkedRecord() {},
    setLinkedRecords(records: ReadonlyArray<unknown>, name: string) {
      assert.equal(name, "Skills");
      onSetSkills(records);
    },
  };
}

test("merges imported skills from the plural mutation root field into the cached skills list", () => {
  const existingSkill = createRecord("skill-existing");
  const importedSkill = createRecord("skill-imported");
  let nextSkills: ReadonlyArray<unknown> | null = null;

  const store: RecordSourceSelectorProxy = {
    get() {
      return null;
    },
    getPluralRootField(name: string) {
      assert.equal(name, "ImportGithubSkills");
      return [importedSkill];
    },
    getRoot() {
      return createRootRecord([existingSkill], (records) => {
        nextSkills = records;
      });
    },
    getRootField() {
      return null;
    },
  };

  new GithubSkillImportRelayUpdater().apply(store);

  assert.deepEqual(
    nextSkills?.map((record) => (record as RecordProxy).getDataID()),
    ["skill-imported", "skill-existing"],
  );
});

test("does not duplicate a skill when Relay already has the imported record in the cached list", () => {
  const sharedSkill = createRecord("skill-shared");
  let nextSkills: ReadonlyArray<unknown> | null = null;

  const store: RecordSourceSelectorProxy = {
    get() {
      return null;
    },
    getPluralRootField() {
      return [sharedSkill];
    },
    getRoot() {
      return createRootRecord([sharedSkill], (records) => {
        nextSkills = records;
      });
    },
    getRootField() {
      return null;
    },
  };

  new GithubSkillImportRelayUpdater().apply(store);

  assert.deepEqual(
    nextSkills?.map((record) => (record as RecordProxy).getDataID()),
    ["skill-shared"],
  );
});
