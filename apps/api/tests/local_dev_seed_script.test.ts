import assert from "node:assert/strict";
import { test } from "vitest";
import { LocalDevSeedScript } from "../scripts/seed_local_dev.ts";

test("LocalDevSeedScript parses the local config path without reading ambient OpenAI keys", () => {
  const script = new LocalDevSeedScript();
  const previousOpenAiKey = process.env.OPENAI_API_KEY;

  process.env.OPENAI_API_KEY = "sk-ambient";

  try {
    const options = script.parseSeedOptions(["node", "seed_local_dev.ts", "--config-path", "./config/local-dev.yaml"]);

    assert.deepEqual(options, {
      configPath: "./config/local-dev.yaml",
    });
  } finally {
    if (previousOpenAiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAiKey;
    }
  }
});

test("LocalDevSeedScript builds deterministic demo chats with varied transcript content", () => {
  const script = new LocalDevSeedScript();
  const plan = script.buildDemoChatSeedPlan({
    agent: {
      defaultModelProviderCredentialModelId: "00000000-0000-4000-8000-000000000091",
      defaultReasoningLevel: "medium",
      id: "00000000-0000-4000-8000-000000000090",
    },
    baseDate: new Date("2026-05-01T12:00:00.000Z"),
    companyId: "00000000-0000-4000-8000-000000000002",
    userId: "00000000-0000-4000-8000-000000000001",
  });

  assert.deepEqual(plan.sessions.map((session) => session.userSetTitle), [
    "Demo: dense markdown transcript",
    "Demo: tools and terminal output",
    "Demo: images and error states",
  ]);
  assert.equal(plan.sessions.every((session) => session.status === "stopped"), true);
  assert.equal(new Set(plan.sessions.map((session) => session.id)).size, 3);
  assert.ok(plan.contents.some((content) => content.type === "text" && String(content.text).includes("| Area | Change |")));
  assert.ok(plan.contents.some((content) => content.type === "thinking"));
  assert.ok(plan.contents.some((content) => content.type === "toolCall" && content.toolName === "pty_exec"));
  assert.ok(plan.contents.some((content) => content.type === "image" && content.mimeType === "image/png"));
});
