import assert from "node:assert/strict";
import { validateToolArguments } from "@mariozechner/pi-ai";
import { test, vi } from "vitest";
import { AgentE2bPortUrlTool } from "../src/services/agent/session/pi-mono/tools/terminal/e2b_port_url.ts";

type ToolExecuteFunction = (toolCallId: string, params: unknown) => Promise<{
  content: Array<{ text: string; type: string }>;
  details?: Record<string, unknown>;
}>;

test("AgentE2bPortUrlTool returns the raw E2B port URL for the leased environment", async () => {
  const getPublicHttpUrlForPort = vi.fn((port: number) => `https://sandbox-${port}.e2b.dev`);
  const tool = new AgentE2bPortUrlTool({
    async getEnvironment() {
      return {
        getPublicHttpUrlForPort,
        getRecord() {
          return {
            id: "environment-1",
            provider: "e2b",
            providerEnvironmentId: "sandbox-1",
          };
        },
      };
    },
  } as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  const result = await tool.execute("tool-call-1", {
    port: 5173,
  });

  assert.deepEqual(result.details, {
    environmentId: "environment-1",
    port: 5173,
    providerEnvironmentId: "sandbox-1",
    type: "e2b_port_url",
    url: "https://sandbox-5173.e2b.dev",
  });
  assert.deepEqual(result.content, [{
    text: [
      "environmentId: environment-1",
      "providerEnvironmentId: sandbox-1",
      "port: 5173",
      "url: https://sandbox-5173.e2b.dev",
    ].join("\n"),
    type: "text",
  }]);
  assert.deepEqual(getPublicHttpUrlForPort.mock.calls, [[5173]]);
});

test("AgentE2bPortUrlTool rejects non-E2B environments", async () => {
  const tool = new AgentE2bPortUrlTool({
    async getEnvironment() {
      return {
        getRecord() {
          return {
            id: "environment-1",
            provider: "other",
            providerEnvironmentId: "sandbox-1",
          };
        },
      };
    },
  } as never).createDefinition() as unknown as {
    execute: ToolExecuteFunction;
  };

  await assert.rejects(
    async () => tool.execute("tool-call-1", {
      port: 3000,
    }),
    /get_e2b_port_url only supports E2B environments\./,
  );
});

test("AgentE2bPortUrlTool validates the sandbox port range", () => {
  const tool = new AgentE2bPortUrlTool({
    async getEnvironment() {
      throw new Error("environment should not be acquired when validation fails");
    },
  } as never).createDefinition();

  assert.throws(
    () => validateToolArguments(tool as never, {
      arguments: {
        port: 0,
      },
      id: "tool-call-1",
      name: "get_e2b_port_url",
      type: "toolCall",
    }),
    (error) => {
      assert.match(String(error), /port: must be >= 1/);
      return true;
    },
  );
});
