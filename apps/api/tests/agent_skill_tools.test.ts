import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentActivateSkillTool } from "../src/services/agent/session/pi-mono/tools/skills/activate.ts";
import { AgentListAvailableSkillsTool } from "../src/services/agent/session/pi-mono/tools/skills/list_available.ts";
import { AgentSkillToolProvider } from "../src/services/agent/session/pi-mono/tools/skills/provider.ts";

test("AgentSkillToolProvider contributes the session skill tools", () => {
  const provider = new AgentSkillToolProvider({
    async activateSkill() {
      throw new Error("skill activation is lazy");
    },
    async listAvailableSkills() {
      throw new Error("skill listing is lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_available_skills", "activate_skill"],
  );
});

test("AgentListAvailableSkillsTool renders the company skill catalog", async () => {
  const tool = new AgentListAvailableSkillsTool({
    async listAvailableSkills() {
      return [{
        active: false,
        description: "Browser automation guidance.",
        files: ["scripts/open.sh", "references/FOO.md"],
        githubTrackedCommitSha: "commit-sha-1",
        name: "Browser skill",
        repository: "companyhelm/skills",
        skillDirectory: "skills/browser",
      }];
    },
  } as never);

  const result = await tool.createDefinition().execute(
    "tool-call-1",
    {},
    undefined,
    undefined,
    {} as never,
  );

  assert.deepEqual(result, {
    content: [{
      text: [
        "name: Browser skill",
        "active: no",
        'files: ["scripts/open.sh","references/FOO.md"]',
        "description: Browser automation guidance.",
        "repository: companyhelm/skills",
        "skillDirectory: skills/browser",
      ].join("\n"),
      type: "text",
    }],
  });
});

test("AgentActivateSkillTool renders the activated skill with relative file paths", async () => {
  const tool = new AgentActivateSkillTool({
    async activateSkill() {
      return {
        alreadyActive: false,
        skill: {
          active: true,
          description: "Browser automation guidance.",
          files: ["scripts/open.sh", "references/FOO.md"],
          githubTrackedCommitSha: "commit-sha-1",
          name: "Browser skill",
          repository: "companyhelm/skills",
          skillDirectory: "skills/browser",
        },
      };
    },
  } as never);

  const result = await tool.createDefinition().execute(
    "tool-call-1",
    {
      skillName: "Browser skill",
    },
    undefined,
    undefined,
    {} as never,
  );

  assert.deepEqual(result, {
    content: [{
      text: [
        "Activated skill Browser skill.",
        "alreadyActive: no",
        'files: ["scripts/open.sh","references/FOO.md"]',
        "description: Browser automation guidance.",
        "repository: companyhelm/skills",
        "skillDirectory: skills/browser",
        "githubTrackedCommitSha: commit-sha-1",
      ].join("\n"),
      type: "text",
    }],
    details: {
      alreadyActive: false,
      files: ["scripts/open.sh", "references/FOO.md"],
      skillName: "Browser skill",
    },
  });
});
