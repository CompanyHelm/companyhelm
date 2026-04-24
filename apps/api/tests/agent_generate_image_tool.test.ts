import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentGenerateImageTool } from "../src/services/agent/session/pi-mono/tools/image_generation/generate_image.ts";

test("AgentGenerateImageTool returns multimodal image content", async () => {
  const tool = new AgentGenerateImageTool({
    async generateImage() {
      return {
        base64Image: "ZmFrZS1pbWFnZQ==",
        mimeType: "image/png",
        modelId: "gpt-image-2",
        modelName: "ChatGPT Images 2.0",
        providerId: "openai",
        revisedPrompt: "A polished hero illustration.",
      };
    },
  } as never).createDefinition();

  const result = await tool.execute("tool-call-1", {
    prompt: "Generate a hero illustration",
  });

  assert.deepEqual(result.content, [
    {
      text: "provider: openai\nmodelId: gpt-image-2\nmodelName: ChatGPT Images 2.0\nrevisedPrompt: A polished hero illustration.",
      type: "text",
    },
    {
      data: "ZmFrZS1pbWFnZQ==",
      mimeType: "image/png",
      type: "image",
    },
  ]);
});
