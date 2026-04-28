import assert from "node:assert/strict";
import { test } from "node:test";
import { EnvironmentTemplateDefaultSelector } from "../src/pages/agents/environment_template_default_selector";
import type { AgentCreateEnvironmentTemplateOption } from "../src/pages/agents/create_agent_dialog";

function makeTemplate(templateId: string): AgentCreateEnvironmentTemplateOption {
  return {
    computerUse: templateId !== "small",
    cpuCount: templateId === "large" ? 8 : 2,
    diskSpaceGb: 20,
    memoryGb: templateId === "large" ? 8 : 4,
    name: templateId,
    templateId,
  };
}

test("prefers the medium environment template for new agents", () => {
  const selector = new EnvironmentTemplateDefaultSelector();

  assert.equal(
    selector.selectTemplateId([
      makeTemplate("large"),
      makeTemplate("medium"),
      makeTemplate("small"),
    ]),
    "medium",
  );
});

test("falls back to provider order when medium is unavailable", () => {
  const selector = new EnvironmentTemplateDefaultSelector();

  assert.equal(
    selector.selectTemplateId([
      makeTemplate("large"),
      makeTemplate("small"),
    ]),
    "large",
  );
});
