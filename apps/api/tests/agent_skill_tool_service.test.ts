import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { AgentSkillToolService } from "../src/services/agent/session/pi-mono/tools/skills/service.ts";

const browserSkillRecord = {
  companyId: "company-123",
  description: "Browser automation guidance.",
  fileList: ["skills/browser/scripts/open.sh", "skills/browser/references/FOO.md"],
  branchName: "main",
  trackedCommitSha: "commit-sha-1",
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
    {
      async listAgentAvailableSkills() {
        return [browserSkillRecord];
      },
    } as never,
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
    {
      async listAgentAvailableSkills() {
        return [browserSkillRecord];
      },
    } as never,
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

test("AgentSkillToolService lists agent-visible skills with active flags", async () => {
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
      async listAgentAvailableSkills() {
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
    files: ["scripts/open.sh", "references/FOO.md"],
    trackedCommitSha: "commit-sha-1",
    instructions: "Use the browser skill when working on websites.",
    name: "Browser skill",
    repository: "companyhelm/skills",
    skillDirectory: "skills/browser",
    skillType: "custom",
    systemCommands: [],
    systemKey: null,
  }]);
});

test("AgentSkillToolService ranks skill search matches and marks active skills", async () => {
  const apiSkillRecord = {
    ...browserSkillRecord,
    description: "API and SDK guidance.",
    id: "skill-2",
    name: "API helper",
  };
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
      async listAgentAvailableSkills() {
        return [browserSkillRecord, apiSkillRecord];
      },
    } as never,
    {
      async listActiveSkills() {
        return [browserSkillRecord];
      },
    } as never,
  );

  const skills = await service.searchSkills("browser automation", 5);

  assert.deepEqual(skills, [{
    active: true,
    description: "Browser automation guidance.",
    files: ["scripts/open.sh", "references/FOO.md"],
    trackedCommitSha: "commit-sha-1",
    instructions: "Use the browser skill when working on websites.",
    name: "Browser skill",
    repository: "companyhelm/skills",
    skillDirectory: "skills/browser",
    skillType: "custom",
    systemCommands: [],
    systemKey: null,
  }]);
});

test("AgentSkillToolService returns no matches for an empty skill search query", async () => {
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
      async listAgentAvailableSkills() {
        throw new Error("empty searches should not load the catalog");
      },
    } as never,
    {
      async listActiveSkills() {
        throw new Error("empty searches should not load active skills");
      },
    } as never,
  );

  const skills = await service.searchSkills("   ", 5);

  assert.deepEqual(skills, []);
});

test("AgentSkillToolService refuses activation outside the agent-visible skill set", async () => {
  const activateSkill = vi.fn(async () => ({
    inserted: true,
    skill: browserSkillRecord,
  }));
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
      async listAgentAvailableSkills() {
        return [];
      },
    } as never,
    {
      activateSkill,
    } as never,
  );

  await assert.rejects(
    service.activateSkill("Browser skill"),
    /not available to this agent/,
  );

  assert.equal(activateSkill.mock.calls.length, 0);
});
