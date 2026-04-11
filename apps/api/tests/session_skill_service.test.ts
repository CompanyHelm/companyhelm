import assert from "node:assert/strict";
import { test } from "vitest";
import { agentSessionActiveSkills, agentSessions, skills } from "../src/db/schema.ts";
import { SessionSkillService } from "../src/services/skills/session_service.ts";

type MockActiveSkillRecord = {
  activatedAt: Date;
  companyId: string;
  sessionId: string;
  skillId: string;
};

type MockSessionRecord = {
  companyId: string;
  id: string;
};

type MockSkillRecord = {
  companyId: string;
  description: string;
  fileList: string[];
  githubBranchName: string | null;
  githubTrackedCommitSha: string | null;
  id: string;
  instructions: string;
  name: string;
  repository: string | null;
  skillDirectory: string | null;
  skillGroupId: string | null;
};

class SessionSkillServiceTestHarness {
  static createTransactionProvider() {
    const activeSkillRecords: MockActiveSkillRecord[] = [];
    const sessionRecords: MockSessionRecord[] = [{
      companyId: "company-123",
      id: "session-1",
    }];
    const skillRecords: MockSkillRecord[] = [{
      companyId: "company-123",
      description: "Browser automation guidance.",
      fileList: ["skills/browser/scripts/open.sh"],
      githubBranchName: "main",
      githubTrackedCommitSha: "commit-sha-1",
      id: "skill-1",
      instructions: "Use the browser skill when interacting with websites.",
      name: "Browser skill",
      repository: "companyhelm/skills",
      skillDirectory: "skills/browser",
      skillGroupId: null,
    }];

    const database = {
      delete(table: unknown) {
        if (table !== agentSessionActiveSkills) {
          throw new Error("Unexpected delete table.");
        }

        return {
          async where() {
            activeSkillRecords.splice(0, activeSkillRecords.length);
          },
        };
      },
      insert(table: unknown) {
        if (table !== agentSessionActiveSkills) {
          throw new Error("Unexpected insert table.");
        }

        return {
          async values(value: Record<string, unknown>) {
            activeSkillRecords.push({
              activatedAt: value.activatedAt as Date,
              companyId: String(value.companyId),
              sessionId: String(value.sessionId),
              skillId: String(value.skillId),
            });
          },
        };
      },
      select(selection: Record<string, unknown>) {
        return {
          from(table: unknown) {
            return {
              async where() {
                if (table === agentSessions) {
                  return [...sessionRecords];
                }
                if (table === skills) {
                  if ("name" in selection) {
                    return [...skillRecords];
                  }

                  return skillRecords.filter((skillRecord) =>
                    activeSkillRecords.some((activeSkillRecord) => activeSkillRecord.skillId === skillRecord.id)
                  );
                }
                if (table === agentSessionActiveSkills) {
                  return activeSkillRecords.map((activeSkillRecord) => ({
                    skillId: activeSkillRecord.skillId,
                  }));
                }

                throw new Error("Unexpected select table.");
              },
            };
          },
        };
      },
    };

    return {
      activeSkillRecords,
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback(database);
      },
    };
  }
}

test("SessionSkillService stores one active skill per session and lists it back", async () => {
  const transactionProvider = SessionSkillServiceTestHarness.createTransactionProvider();
  const service = new SessionSkillService();

  const firstActivation = await service.activateSkill(transactionProvider as never, {
    companyId: "company-123",
    sessionId: "session-1",
    skillName: "Browser skill",
  });
  const secondActivation = await service.activateSkill(transactionProvider as never, {
    companyId: "company-123",
    sessionId: "session-1",
    skillName: "Browser skill",
  });
  const activeSkills = await service.listActiveSkills(transactionProvider as never, "company-123", "session-1");

  assert.equal(firstActivation.inserted, true);
  assert.equal(secondActivation.inserted, false);
  assert.equal(transactionProvider.activeSkillRecords.length, 1);
  assert.equal(activeSkills.length, 1);
  assert.equal(activeSkills[0]?.name, "Browser skill");

  await service.deactivateSkill(transactionProvider as never, {
    companyId: "company-123",
    sessionId: "session-1",
    skillId: "skill-1",
  });

  assert.equal(transactionProvider.activeSkillRecords.length, 0);
});
