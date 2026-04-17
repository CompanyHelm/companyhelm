import assert from "node:assert/strict";
import { test } from "vitest";
import { SystemPromptTemplate } from "../src/prompts/system_prompt_template.ts";
import { SystemPromptTemplateContext } from "../src/prompts/system_prompt_template_context.ts";
import { CompanyHelmResourceLoader } from "../src/services/agent/session/pi-mono/companyhelm_resource_loader.ts";

test("CompanyHelmResourceLoader keeps PI Mono resources in memory and disables local project discovery", async () => {
  const promptContext = new SystemPromptTemplateContext(
    "agent-1",
    "My Agent",
    "My Organization",
    "session-1",
  );
  const loader = new CompanyHelmResourceLoader(promptContext);

  await loader.reload();

  assert.deepEqual(loader.getAgentsFiles(), {
    agentsFiles: [],
  });
  assert.deepEqual(loader.getAppendSystemPrompt(), []);
  assert.deepEqual(loader.getSkills(), {
    diagnostics: [],
    skills: [],
  });
  assert.deepEqual(loader.getPrompts(), {
    diagnostics: [],
    prompts: [],
  });
  assert.deepEqual(loader.getThemes(), {
    diagnostics: [],
    themes: [],
  });
  assert.equal(loader.getExtensions().errors.length, 0);
  assert.equal(loader.getExtensions().extensions.length, 0);
  assert.ok(loader.getExtensions().runtime);
  const systemPrompt = loader.getSystemPrompt() ?? "";
  assert.equal(systemPrompt, new SystemPromptTemplate().render(promptContext));
  assert.match(systemPrompt, /Company name: My Organization/u);
  assert.match(systemPrompt, /## Repository Instruction Discovery/u);
  assert.match(systemPrompt, /AGENTS\.md files are repository-local operating instructions/u);
});

test("CompanyHelmResourceLoader keeps company and agent prompt overrides as separate append layers", async () => {
  const promptContext = new SystemPromptTemplateContext(
    "agent-1",
    "My Agent",
    "My Organization",
    "session-1",
  );
  const loader = new CompanyHelmResourceLoader(promptContext, [
    "Always align work with company priorities.",
    "Prefer concise implementation plans.",
  ]);

  await loader.reload();

  assert.deepEqual(loader.getAppendSystemPrompt(), [
    "Always align work with company priorities.",
    "Prefer concise implementation plans.",
  ]);
});
