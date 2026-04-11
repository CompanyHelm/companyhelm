import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentSkillToolService } from "../src/services/agent/session/pi-mono/tools/skills/service.ts";

const browserSkillRecord = {
  companyId: "company-123",
  description: "Browser automation guidance.",
  fileList: ["skills/browser/scripts/open.sh"],
  githubBranchName: "main",
  githubTrackedCommitSha: "commit-sha-1",
  id: "skill-1",
  instructions: "Use the browser skill when working on websites.",
  name: "Browser skill",
  repository: "companyhelm/skills",
  skillDirectory: "skills/browser",
  skillGroupId: null,
};

test("AgentSkillToolService rolls back a new activation when live materialization fails", async () => {
  const transactionProvider = {} as never;
  const deactivateSkill = vi.fn(async () => undefined);
  const service = new AgentSkillToolService(
    transactionProvider,
    "company-123",
    "session-1",
    "agent-1",
    {
      async syncSkillIfEnvironmentLeased() {
        throw new Error("sync failed");
      },
    } as never,
    {} as never,
    {
      async activateSkill() {
        return {
          inserted: true,
          skill: browserSkillRecord,
        };
      },
      deactivateSkill,
    } as never,
  );

  await assert.rejects(
    service.activateSkill("Browser skill"),
    /activation was rolled back/,
  );

  assert.deepEqual(deactivateSkill.mock.calls, [[transactionProvider, {
    companyId: "company-123",
    sessionId: "session-1",
    skillId: "skill-1",
  }]]);
});

test("AgentSkillToolService keeps an existing activation when live materialization fails", async () => {
  const deactivateSkill = vi.fn(async () => undefined);
  const service = new AgentSkillToolService(
    {} as never,
    "company-123",
    "session-1",
    "agent-1",
    {
      async syncSkillIfEnvironmentLeased() {
        throw new Error("sync failed");
      },
    } as never,
    {} as never,
    {
      async activateSkill() {
        return {
          inserted: false,
          skill: browserSkillRecord,
        };
      },
      deactivateSkill,
    } as never,
  );

  await assert.rejects(
    service.activateSkill("Browser skill"),
    /activation was rolled back/,
  );

  assert.equal(deactivateSkill.mock.calls.length, 0);
});

test("AgentSkillToolService lists the catalog with active flags", async () => {
  const service = new AgentSkillToolService(
    {} as never,
    "company-123",
    "session-1",
    "agent-1",
    {
      async syncSkillIfEnvironmentLeased() {
        return false;
      },
    } as never,
    {
      async listSkills() {
        return [browserSkillRecord];
      },
    } as never,
    {
      async listActiveSkills() {
        return [browserSkillRecord];
      },
    } as never,
  );

  const skills = await service.listAvailableSkills();

  assert.deepEqual(skills, [{
    active: true,
    description: "Browser automation guidance.",
    fileBacked: true,
    fileCount: 1,
    githubTrackedCommitSha: "commit-sha-1",
    name: "Browser skill",
    repository: "companyhelm/skills",
    skillDirectory: "skills/browser",
  }]);
});
