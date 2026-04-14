import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentSessionBootstrapContext } from "../src/services/agent/session/pi-mono/bootstrap_context.ts";
import { AgentSessionModulePromptContext } from "../src/services/agent/session/pi-mono/modules/prompt_context.ts";
import { AgentSessionModulePromptTemplate } from "../src/services/agent/session/pi-mono/modules/prompt_template.ts";

test("skills session module prompt includes the materialized skill directory path", () => {
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

  const prompt = new AgentSessionModulePromptTemplate("skills").render(
    new AgentSessionModulePromptContext(bootstrapContext),
  );

  assert.match(prompt, /\/home\/user\/skills\/<Skill Name>/u);
});
