import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentListAssignedSecretsTool } from "../src/services/agent/session/pi-mono/tools/secrets/list_assigned.ts";
import { AgentListAvailableSecretsTool } from "../src/services/agent/session/pi-mono/tools/secrets/list_available.ts";
import { AgentSecretToolProvider } from "../src/services/agent/session/pi-mono/tools/secrets/provider.ts";

test("AgentSecretToolProvider contributes the assigned and available secret tools", () => {
  const provider = new AgentSecretToolProvider({
    async listAssignedSecrets() {
      throw new Error("assigned secret lookup is lazy");
    },
    async listAvailableSecrets() {
      throw new Error("available secret lookup is lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_assigned_secrets", "list_available_secrets"],
  );
});

test("AgentListAssignedSecretsTool renders attached session secret metadata", async () => {
  const tool = new AgentListAssignedSecretsTool({
    async listAssignedSecrets() {
      return [{
        description: "Used for GitHub API calls.",
        envVarName: "GITHUB_TOKEN",
        name: "GitHub Token",
      }];
    },
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {});

  assert.deepEqual(result, {
    content: [{
      text: [
        "name: GitHub Token",
        "envVarName: GITHUB_TOKEN",
        "description: Used for GitHub API calls.",
      ].join("\n"),
      type: "text",
    }],
  });
});

test("AgentListAvailableSecretsTool renders the reusable company secret catalog", async () => {
  const tool = new AgentListAvailableSecretsTool({
    async listAvailableSecrets() {
      return [{
        description: null,
        envVarName: "OPENAI_API_KEY",
        name: "OpenAI API Key",
      }];
    },
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {});

  assert.deepEqual(result, {
    content: [{
      text: [
        "name: OpenAI API Key",
        "envVarName: OPENAI_API_KEY",
        "description: (no description)",
      ].join("\n"),
      type: "text",
    }],
  });
});
