import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentSessionBootstrapContext } from "../src/services/agent/session/pi-mono/bootstrap_context.ts";
import { SkillsSessionModule } from "../src/services/agent/session/pi-mono/modules/skills.ts";

test("skills session module prompt includes the materialized skill directory path and available skill summaries", async () => {
  const bootstrapContext = new AgentSessionBootstrapContext({
    agentId: "agent-1",
    agentName: "My Agent",
    agentSystemPrompt: null,
    companyBaseSystemPrompt: null,
    companyId: "company-1",
    companyName: "My Company",
    computeProviderDefinitionId: "provider-def-1",
    environmentProvider: "e2b",
    environmentTemplate: {
      computerUse: true,
      cpuCount: 2,
      diskSpaceGb: 10,
      memoryGb: 4,
      name: "medium",
      templateId: "template-1",
    },
    logger: {} as never,
    modelApiKey: "test-key",
    modelId: "model-1",
    modelProviderId: "provider-1",
    promptScope: {} as never,
    reasoningLevel: null,
    sessionId: "session-1",
    transactionProvider: {} as never,
  });

  class TestSkillsSessionModule extends SkillsSessionModule {
    protected createSkillToolService() {
      return {
        async listAvailableSkills() {
          return [{
            active: false,
            description: "Browser automation guidance.",
            files: [],
            githubTrackedCommitSha: null,
            name: "Browser skill",
            repository: null,
            skillDirectory: null,
          }];
        },
      } as never;
    }
  }

  const [prompt] = await new TestSkillsSessionModule().createAppendSystemPrompts(bootstrapContext);

  assert.match(prompt, /\/home\/user\/skills\/<Skill Name>/u);
  assert.match(prompt, /Available skills for this session:/u);
  assert.match(prompt, /- Browser skill: Browser automation guidance\./u);
});
