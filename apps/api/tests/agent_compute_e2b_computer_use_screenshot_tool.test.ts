import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentComputeE2bComputerUseScreenshotTool } from "../src/compute/e2b/tools/computer-use/screenshot.ts";

test("AgentComputeE2bComputerUseScreenshotTool returns a generic image content block", async () => {
  const tool = new AgentComputeE2bComputerUseScreenshotTool({
    async screenshot() {
      return {
        base64EncodedPng: "ZmFrZS1wbmc=",
        byteLength: 8,
      };
    },
  } as never);

  const result = await tool.createDefinition().execute("tool-call-1", {});

  assert.deepEqual(result, {
    content: [{
      data: "ZmFrZS1wbmc=",
      mimeType: "image/png",
      type: "image",
    }],
    details: {
      byteLength: 8,
      type: "computer_use_screenshot",
    },
  });
});
