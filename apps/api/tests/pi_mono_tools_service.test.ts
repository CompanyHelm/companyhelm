import assert from "node:assert/strict";
import { test } from "vitest";
import { PiMonoToolsService } from "../src/services/agent/session/pi-mono/tools/service.ts";

test("PiMonoToolsService returns a stubbed read_file tool bound to the current session", async () => {
  const service = new PiMonoToolsService(
    "agent-1",
    {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({});
      },
    } as never,
    "session-1",
  );

  const tools = service.getTools();
  assert.equal(tools.length, 1);
  assert.equal(tools[0]?.name, "read_file");

  const result = await tools[0]!.execute(
    "tool-call-1",
    {
      path: "src/index.ts",
    },
    undefined,
    undefined,
  );

  assert.deepEqual(result.content, [{
    type: "text",
    text: "Stub read_file result for \"src/index.ts\" in session session-1 on agent agent-1.",
  }]);
  assert.deepEqual(result.details, {
    agentId: "agent-1",
    path: "src/index.ts",
    sessionId: "session-1",
    transactionProviderAvailable: true,
  });
});
