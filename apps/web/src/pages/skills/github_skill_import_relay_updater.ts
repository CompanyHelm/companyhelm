import type { RecordProxy, RecordSourceSelectorProxy } from "relay-runtime";

/**
 * Applies imported GitHub skills to the cached root skills collection so the page reflects the
 * newly created records immediately after the mutation completes.
 */
export class GithubSkillImportRelayUpdater {
  public apply(store: RecordSourceSelectorProxy): void {
    const importedSkills = this.filterRecords(store.getPluralRootField("ImportGithubSkills") || []);
    if (importedSkills.length === 0) {
      return;
    }

    const rootRecord = store.getRoot();
    const currentSkills = this.filterRecords(rootRecord.getLinkedRecords("Skills") || []);
    const mergedSkills: RecordProxy[] = [];
    const seenSkillIds = new Set<string>();

    for (const skill of [...importedSkills, ...currentSkills]) {
      const skillId = skill.getDataID();
      if (seenSkillIds.has(skillId)) {
        continue;
      }

      seenSkillIds.add(skillId);
      mergedSkills.push(skill);
    }

    rootRecord.setLinkedRecords(mergedSkills, "Skills");
  }

  private filterRecords(records: ReadonlyArray<unknown>): RecordProxy[] {
    return records.filter((record): record is RecordProxy => record !== null);
  }
}
