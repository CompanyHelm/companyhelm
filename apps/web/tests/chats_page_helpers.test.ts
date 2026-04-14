import assert from "node:assert/strict";
import { test } from "node:test";
import { shouldHydrateComposerSelection } from "../src/pages/chats/chats_page_helpers";

test("shouldHydrateComposerSelection returns true when the chat target changes", () => {
  const modelOptionById = new Map([["model-a", { id: "model-a" }]]);

  assert.equal(
    shouldHydrateComposerSelection(
      "agent-1:session-1",
      "agent-1:session-2",
      "model-a",
      modelOptionById as ReadonlyMap<string, { id: string }>,
    ),
    true,
  );
});

test("shouldHydrateComposerSelection returns false for streaming updates on the same chat target", () => {
  const modelOptionById = new Map([["model-a", { id: "model-a" }]]);

  assert.equal(
    shouldHydrateComposerSelection(
      "agent-1:session-1",
      "agent-1:session-1",
      "model-a",
      modelOptionById as ReadonlyMap<string, { id: string }>,
    ),
    false,
  );
});

test("shouldHydrateComposerSelection returns true when the current model is no longer available", () => {
  const modelOptionById = new Map([["model-a", { id: "model-a" }]]);

  assert.equal(
    shouldHydrateComposerSelection(
      "agent-1:session-1",
      "agent-1:session-1",
      "missing-model",
      modelOptionById as ReadonlyMap<string, { id: string }>,
    ),
    true,
  );
});
