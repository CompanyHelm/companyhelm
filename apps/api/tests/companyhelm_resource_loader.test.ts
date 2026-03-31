import assert from "node:assert/strict";
import { test } from "vitest";
import { CompanyHelmResourceLoader } from "../src/services/agent/session/pi-mono/companyhelm_resource_loader.ts";
import { SystemPromptTemplate } from "../src/templates/system_prompt_template.ts";
import { SystemPromptTemplateContext } from "../src/templates/system_prompt_template_context.ts";

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
  assert.equal(loader.getSystemPrompt(), new SystemPromptTemplate().render(promptContext));
  assert.match(loader.getSystemPrompt(), /Company name: My Organization/u);
});
