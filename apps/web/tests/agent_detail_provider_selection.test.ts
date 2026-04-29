import assert from "node:assert/strict";
import { test } from "node:test";
import { AgentDetailProviderSelection } from "../src/pages/agents/agent_detail_provider_selection";
import type { AgentCreateProviderOption } from "../src/pages/agents/create_agent_dialog";

function makeProviderOption(
  overrides: Partial<AgentCreateProviderOption> = {},
): AgentCreateProviderOption {
  return {
    defaultModelId: "gpt-5.4",
    defaultReasoningLevel: "medium",
    id: "agent-create-provider-option:credential-1",
    isDefault: true,
    label: "OpenAI subscription",
    modelProvider: "openai-codex",
    modelProviderCredentialId: "credential-1",
    models: [],
    ...overrides,
  };
}

test("agent detail provider select submits provider option ids", () => {
  const providerOption = makeProviderOption();

  assert.deepEqual(
    AgentDetailProviderSelection.toFieldOptions([providerOption]),
    [{
      label: "OpenAI subscription",
      value: "agent-create-provider-option:credential-1",
    }],
  );
  assert.equal(
    AgentDetailProviderSelection.resolveFieldValue(providerOption),
    "agent-create-provider-option:credential-1",
  );
});

test("agent detail provider select clears the field when no provider is selected", () => {
  assert.equal(AgentDetailProviderSelection.resolveFieldValue(null), "");
});
