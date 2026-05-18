import assert from "node:assert/strict";
import test from "node:test";
import { AgentAutoCompactPresenter } from "../src/pages/agents/agent_auto_compact_presenter";

test("AgentAutoCompactPresenter clamps percentages to the supported range", () => {
  assert.equal(AgentAutoCompactPresenter.normalizePercent(0), 1);
  assert.equal(AgentAutoCompactPresenter.normalizePercent(57.9), 57);
  assert.equal(AgentAutoCompactPresenter.normalizePercent(120), 100);
});

test("AgentAutoCompactPresenter falls back to the default percentage for invalid values", () => {
  assert.equal(AgentAutoCompactPresenter.normalizePercent(Number.NaN), 80);
});
