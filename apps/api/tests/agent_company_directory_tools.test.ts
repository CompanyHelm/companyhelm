import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentListCompanyAgentsTool } from "../src/services/agent/session/pi-mono/tools/company_directory/list_company_agents.ts";
import { AgentListCompanyMembersTool } from "../src/services/agent/session/pi-mono/tools/company_directory/list_company_members.ts";
import { AgentCompanyDirectoryToolProvider } from "../src/services/agent/session/pi-mono/tools/company_directory/provider.ts";

test("AgentCompanyDirectoryToolProvider contributes the company member and agent tools", () => {
  const provider = new AgentCompanyDirectoryToolProvider({
    async listCompanyAgents() {
      throw new Error("company agent lookup is lazy");
    },
    async listCompanyMembers() {
      throw new Error("company member lookup is lazy");
    },
  } as never);

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["list_company_members", "list_company_agents"],
  );
});

test("AgentListCompanyMembersTool renders the human company directory", async () => {
  const tool = new AgentListCompanyMembersTool({
    async listCompanyMembers() {
      return [{
        id: "user-1",
        name: "Jane Doe",
      }];
    },
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {});

  assert.deepEqual(result, {
    content: [{
      text: [
        "id: user-1",
        "name: Jane Doe",
      ].join("\n"),
      type: "text",
    }],
  });
});

test("AgentListCompanyAgentsTool renders the company agent directory", async () => {
  const tool = new AgentListCompanyAgentsTool({
    async listCompanyAgents() {
      return [{
        id: "agent-1",
        name: "CEO",
      }];
    },
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {});

  assert.deepEqual(result, {
    content: [{
      text: [
        "id: agent-1",
        "name: CEO",
      ].join("\n"),
      type: "text",
    }],
  });
});
