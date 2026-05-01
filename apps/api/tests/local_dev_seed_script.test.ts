import assert from "node:assert/strict";
import { test } from "vitest";
import { LocalDevSeedScript } from "../scripts/seed_local_dev.ts";

test("LocalDevSeedScript does not consume ambient OpenAI keys unless local seeding is requested", () => {
  const script = new LocalDevSeedScript();
  const previousOpenAiKey = process.env.OPENAI_API_KEY;
  const previousLocalOpenAiKey = process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;

  process.env.OPENAI_API_KEY = "sk-ambient";
  delete process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;

  try {
    const options = script.parseSeedOptions(["node", "seed_local_dev.ts", "--config-path", "./config/local-dev.yaml"]);

    assert.deepEqual(options, {
      configPath: "./config/local-dev.yaml",
      shouldSeedOpenAiFromEnv: false,
    });
    assert.equal(script.resolveOpenAiApiKey(options), null);
  } finally {
    if (previousOpenAiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previousOpenAiKey;
    }
    if (previousLocalOpenAiKey === undefined) {
      delete process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;
    } else {
      process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY = previousLocalOpenAiKey;
    }
  }
});

test("LocalDevSeedScript requires the explicit local OpenAI key when model seeding is requested", () => {
  const script = new LocalDevSeedScript();
  const previousLocalOpenAiKey = process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;
  delete process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;

  try {
    const options = script.parseSeedOptions([
      "node",
      "seed_local_dev.ts",
      "--config-path",
      "./config/local-dev.yaml",
      "--seed-openai-from-env",
    ]);

    assert.deepEqual(options, {
      configPath: "./config/local-dev.yaml",
      shouldSeedOpenAiFromEnv: true,
    });
    assert.throws(() => script.resolveOpenAiApiKey(options), /COMPANYHELM_LOCAL_OPENAI_API_KEY is required/);
  } finally {
    if (previousLocalOpenAiKey === undefined) {
      delete process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;
    } else {
      process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY = previousLocalOpenAiKey;
    }
  }
});

test("LocalDevSeedScript resolves the explicit local OpenAI key for requested model seeding", () => {
  const script = new LocalDevSeedScript();
  const previousLocalOpenAiKey = process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;
  process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY = " sk-local-explicit ";

  try {
    const options = script.parseSeedOptions([
      "node",
      "seed_local_dev.ts",
      "--config-path",
      "./config/local-dev.yaml",
      "--seed-openai-from-env",
    ]);

    assert.equal(script.resolveOpenAiApiKey(options), "sk-local-explicit");
  } finally {
    if (previousLocalOpenAiKey === undefined) {
      delete process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY;
    } else {
      process.env.COMPANYHELM_LOCAL_OPENAI_API_KEY = previousLocalOpenAiKey;
    }
  }
});


test("LocalDevSeedScript validates local OpenAI credentials through provider model discovery", async () => {
  const script = new LocalDevSeedScript();
  const calls: Array<{ apiKey: string; baseUrl?: string | null; modelProvider: string }> = [];

  await script.validateOpenAiApiKey("sk-explicit", {
    fetchModels: async (input) => {
      calls.push(input);
      return [];
    },
  });

  assert.deepEqual(calls, [{
    apiKey: "sk-explicit",
    baseUrl: null,
    modelProvider: "openai",
  }]);
});

test("LocalDevSeedScript builds deterministic demo chats with varied transcript content", () => {
  const script = new LocalDevSeedScript();
  const plan = script.buildDemoChatSeedPlan({
    agent: {
      defaultModelCredentialSource: "platform",
      defaultModelProviderCredentialModelId: null,
      defaultPlatformModelId: "00000000-0000-4000-8000-000000000091",
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
