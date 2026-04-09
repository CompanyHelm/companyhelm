import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import { AgentRuntimeToolProvider } from "../src/services/agent/session/pi-mono/tools/runtime/provider.ts";
import { AgentRuntimeToolService } from "../src/services/agent/session/pi-mono/tools/runtime/service.ts";
import { AgentRuntimeWaitTool } from "../src/services/agent/session/pi-mono/tools/runtime/wait.ts";

afterEach(() => {
  vi.useRealTimers();
});

test("AgentRuntimeToolProvider contributes the generic wait tool", () => {
  const provider = new AgentRuntimeToolProvider(new AgentRuntimeToolService());

  assert.deepEqual(
    provider.createToolDefinitions().map((tool) => tool.name),
    ["wait"],
  );
});

test("AgentRuntimeWaitTool waits for the requested duration and returns transcript details", async () => {
  vi.useFakeTimers();
  const tool = new AgentRuntimeWaitTool(new AgentRuntimeToolService());

  let settled = false;
  const resultPromise = tool.createDefinition().execute("tool-call-1", {
    milliseconds: 250,
  }).then((result) => {
    settled = true;
    return result;
  });

  await vi.advanceTimersByTimeAsync(249);
  assert.equal(settled, false);

  await vi.advanceTimersByTimeAsync(1);
  const result = await resultPromise;

  assert.deepEqual(result, {
    content: [{
      text: "Waited 250ms.",
      type: "text",
    }],
    details: {
      milliseconds: 250,
      type: "wait",
    },
  });
});
