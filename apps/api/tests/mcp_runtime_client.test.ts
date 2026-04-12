import assert from "node:assert/strict";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, test, vi } from "vitest";
import { McpRuntimeClient } from "../src/services/mcp/runtime/client.ts";

const mcpSdkMocks = vi.hoisted(() => {
  return {
    callToolMock: vi.fn(),
    clientInstances: [] as Array<{ callTool: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn>; listTools: ReturnType<typeof vi.fn> }>,
    closeMock: vi.fn(async () => undefined),
    connectMock: vi.fn(async () => undefined),
    listToolsMock: vi.fn(),
    transportInstances: [] as Array<{ close: ReturnType<typeof vi.fn>; options: Record<string, unknown>; url: URL }>,
  };
});

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  class MockClient {
    callTool = mcpSdkMocks.callToolMock;
    connect = mcpSdkMocks.connectMock;
    listTools = mcpSdkMocks.listToolsMock;

    constructor() {
      mcpSdkMocks.clientInstances.push(this);
    }
  }

  return {
    Client: MockClient,
  };
});

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => {
  class MockStreamableHTTPClientTransport {
    close = mcpSdkMocks.closeMock;
    readonly options: Record<string, unknown>;
    readonly url: URL;

    constructor(url: URL, options: Record<string, unknown>) {
      this.url = url;
      this.options = options;
      mcpSdkMocks.transportInstances.push(this);
    }
  }

  return {
    StreamableHTTPClientTransport: MockStreamableHTTPClientTransport,
  };
});

beforeEach(() => {
  mcpSdkMocks.callToolMock.mockReset();
  mcpSdkMocks.clientInstances.length = 0;
  mcpSdkMocks.closeMock.mockReset();
  mcpSdkMocks.connectMock.mockReset();
  mcpSdkMocks.listToolsMock.mockReset();
  mcpSdkMocks.transportInstances.length = 0;
});

test("McpRuntimeClient listTools connects through the streamable HTTP transport and forwards request headers", async () => {
  mcpSdkMocks.listToolsMock.mockResolvedValue({
    tools: [{
      inputSchema: {
        properties: {
          query: {
            type: "string",
          },
        },
        required: ["query"],
        type: "object",
      },
      name: "search",
    }],
  });
  const client = new McpRuntimeClient();

  const result = await client.listTools({
    callTimeoutMs: 7_500,
    headers: {
      Authorization: "Bearer test-token",
      "x-company": "company-1",
    },
    url: "https://mcp.example.com/tools",
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.name, "search");
  assert.equal(mcpSdkMocks.transportInstances.length, 1);
  assert.equal(mcpSdkMocks.transportInstances[0]?.url.toString(), "https://mcp.example.com/tools");
  assert.deepEqual(
    mcpSdkMocks.transportInstances[0]?.options.requestInit,
    {
      headers: {
        Authorization: "Bearer test-token",
        "x-company": "company-1",
      },
    },
  );
  assert.equal(typeof mcpSdkMocks.transportInstances[0]?.options.fetch, "function");
  assert.equal(mcpSdkMocks.connectMock.mock.calls.length, 1);
  assert.equal(mcpSdkMocks.closeMock.mock.calls.length, 1);
});

test("McpRuntimeClient callTool forwards the remote tool name and arguments", async () => {
  mcpSdkMocks.callToolMock.mockResolvedValue({
    content: [{
      text: "issue: 42",
      type: "text",
    }],
    isError: false,
  });
  const client = new McpRuntimeClient();

  const result = await client.callTool({
    arguments: {
      issueNumber: 42,
      repository: "CompanyHelm/companyhelm-ng",
    },
    callTimeoutMs: 5_000,
    headers: {},
    toolName: "github_issue",
    url: "https://mcp.example.com",
  });

  assert.equal(result.isError, false);
  assert.deepEqual(mcpSdkMocks.callToolMock.mock.calls, [[{
    arguments: {
      issueNumber: 42,
      repository: "CompanyHelm/companyhelm-ng",
    },
    name: "github_issue",
  }, CallToolResultSchema]]);
  assert.equal(mcpSdkMocks.closeMock.mock.calls.length, 1);
});
