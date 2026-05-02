import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentNameSuggestionService } from "../src/services/agents/name_suggestion_service.ts";

test("AgentNameSuggestionService returns the first generated first name that does not collide", () => {
  const generatedNames = ["Ada", "ada", " Maya "];
  const service = new AgentNameSuggestionService(() => String(generatedNames.shift() ?? "Fallback"));

  assert.deepEqual(service.suggest(["Ada"]), {
    name: "Maya",
    title: "",
  });
});

test("AgentNameSuggestionService falls back to an Agent number after repeated collisions", () => {
  const service = new AgentNameSuggestionService(() => "Ada");

  assert.deepEqual(service.suggest(["Ada", "Agent 3"]), {
    name: "Agent 4",
    title: "",
  });
});
