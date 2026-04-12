import assert from "node:assert/strict";
import { test } from "vitest";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import { AgentMcpToolProvider } from "../src/services/agent/session/pi-mono/tools/mcp/provider.ts";
import { AgentMcpToolService } from "../src/services/agent/session/pi-mono/tools/mcp/service.ts";

test("AgentMcpToolService discovers enabled attached MCP tools and namespaces their names", async () => {
  const transactionProvider: TransactionProviderInterface = {
    async transaction(transaction) {
      return transaction({} as never);
    },
  };
  const service = new AgentMcpToolService(
    transactionProvider,
    "company-1",
    "agent-1",
    {
      warn() {
        return undefined;
      },
    } as never,
    {
      async listAgentMcpServers() {
        return [
          {
            authType: "none",
            callTimeoutMs: 5_000,
            companyId: "company-1",
            createdAt: new Date("2026-04-11T12:00:00.000Z"),
            description: null,
            enabled: true,
            headers: {},
            id: "server-1",
            name: "GitHub Tools",
            oauthClientId: null,
            oauthConnectionStatus: null,
            oauthGrantedScopes: [],
            oauthLastError: null,
            oauthRequestedScopes: [],
            updatedAt: new Date("2026-04-11T12:00:00.000Z"),
            url: "https://github.example.com/mcp",
          },
          {
            authType: "none",
            callTimeoutMs: 5_000,
            companyId: "company-1",
            createdAt: new Date("2026-04-11T12:00:00.000Z"),
            description: null,
            enabled: false,
            headers: {},
            id: "server-2",
            name: "Disabled Tools",
            oauthClientId: null,
            oauthConnectionStatus: null,
            oauthGrantedScopes: [],
            oauthLastError: null,
            oauthRequestedScopes: [],
            updatedAt: new Date("2026-04-11T12:00:00.000Z"),
            url: "https://disabled.example.com/mcp",
          },
        ];
      },
      async resolveMcpServerRequestHeaders() {
        return {};
      },
    } as never,
    {
      async listTools(input: { url: string }) {
        if (input.url !== "https://github.example.com/mcp") {
          throw new Error("disabled server should not be discovered");
        }

        return [{
          description: "Search issues",
          inputSchema: {
            properties: {
              query: {
                type: "string",
              },
            },
            required: ["query"],
            type: "object",
          },
          name: "search.issues",
        }, {
          description: "Read issue details",
          inputSchema: {
            properties: {
              issueNumber: {
                type: "integer",
              },
            },
            required: ["issueNumber"],
            type: "object",
          },
          name: "read issue",
        }];
      },
    } as never,
  );

  const descriptors = await service.discoverToolDescriptors();

  assert.deepEqual(
    descriptors.map((descriptor) => descriptor.qualifiedName),
    [
      "github_tools__search_issues",
      "github_tools__read_issue",
    ],
  );
});

test("AgentMcpToolProvider wraps discovered MCP tools as executable PI Mono tools", async () => {
  const provider = new AgentMcpToolProvider(
    {
      async callTool() {
        return {
          content: [{
            text: "opened issue #42",
            type: "text",
          }],
          isError: false,
          structuredContent: {
            issueNumber: 42,
            repository: "CompanyHelm/companyhelm-ng",
          },
        };
      },
    } as never,
    [{
      inputSchema: {
        properties: {
          title: {
            type: "string",
          },
        },
        required: ["title"],
        type: "object",
      },
      mcpServerId: "server-1",
      mcpServerName: "GitHub Tools",
      mcpServerUrl: "https://github.example.com/mcp",
      qualifiedName: "github_tools__create_issue",
      toolDescription: "Create a new issue",
      toolName: "create_issue",
    }],
  );

  const [tool] = provider.createToolDefinitions();
  const result = await tool.execute(
    "tool-call-1",
    {
      title: "Ship MCP runtime support",
    },
    undefined,
    undefined,
    {} as never,
  );
  const firstContentBlock = result.content[0];

  assert.equal(tool.name, "github_tools__create_issue");
  assert.match(tool.description, /GitHub Tools/u);
  assert.equal(firstContentBlock?.type, "text");
  if (!firstContentBlock || firstContentBlock.type !== "text") {
    throw new Error("expected MCP tool result to render as text content");
  }

  assert.match(firstContentBlock.text, /status: ok/u);
  assert.match(firstContentBlock.text, /opened issue #42/u);
  assert.match(firstContentBlock.text, /"issueNumber": 42/u);
});
