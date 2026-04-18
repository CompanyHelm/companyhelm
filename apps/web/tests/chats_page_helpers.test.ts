import assert from "node:assert/strict";
import { test } from "node:test";
import {
  resolveSessionTitleOverride,
  shouldHydrateComposerSelection,
} from "../src/pages/chats/chats_page_helpers";

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

test("resolveSessionTitleOverride prefers the associated task name for task chats", () => {
  assert.equal(
    resolveSessionTitleOverride(
      {
        associatedTask: {
          id: "task-1",
          name: "Prepare launch brief",
          status: "open",
        },
        id: "session-1",
        inferredTitle: "Session-generated title",
        userSetTitle: "User-set title",
      },
      {
        "session-1": "Optimistic title",
      },
    ),
    "Prepare launch brief",
  );
});

test("resolveSessionTitleOverride keeps session fallback titles when no task is associated", () => {
  assert.equal(
    resolveSessionTitleOverride(
      {
        associatedTask: null,
        id: "session-2",
        inferredTitle: null,
        userSetTitle: null,
      },
      {
        "session-2": "Optimistic session title",
      },
    ),
    "Optimistic session title",
  );
});
