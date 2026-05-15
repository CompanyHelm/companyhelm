import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentActivateSkillTool } from "../src/services/agent/session/pi-mono/tools/skills/activate.ts";
import { AgentSkillToolProvider } from "../src/services/agent/session/pi-mono/tools/skills/provider.ts";
import { AgentSearchSkillsTool } from "../src/services/agent/session/pi-mono/tools/skills/search.ts";

test("AgentSkillToolProvider contributes the skill catalog tools", () => {
  const provider = new AgentSkillToolProvider({
    async activateSkill() {
      throw new Error("skill activation is lazy");
    },
    async listAvailableSkills() {
      throw new Error("skill listing is lazy");
    },
    async searchSkills() {
      throw new Error("skill search is lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["search_skills", "activate_skill"],
  );
});

test("AgentSearchSkillsTool renders ranked skill matches", async () => {
  const tool = new AgentSearchSkillsTool({
    async searchSkills() {
      return [{
        active: false,
        description: "Browser automation guidance.",
        files: ["scripts/open.sh"],
        trackedCommitSha: "commit-sha-1",
        instructions: "Use the browser skill when working on websites.",
        name: "Browser skill",
        repository: "companyhelm/skills",
        skillDirectory: "skills/browser",
        skillType: "custom",
        systemCommands: [],
        systemKey: null,
      }];
    },
  } as never);

  const result = await tool.createDefinition().execute(
    "tool-call-1",
    {
      query: "browser",
    },
    undefined,
    undefined,
    {} as never,
  );

  assert.deepEqual(result, {
    content: [{
      text: [
        "query: browser",
        "matchCount: 1",
        "matches:",
        "  name: Browser skill",
        "  active: no",
        "  skillType: custom",
        "  description: Browser automation guidance.",
      ].join("\n"),
      type: "text",
    }],
    details: {
      matchCount: 1,
      query: "browser",
      skillNames: ["Browser skill"],
    },
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
          trackedCommitSha: "commit-sha-1",
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
        "trackedCommitSha: commit-sha-1",
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
