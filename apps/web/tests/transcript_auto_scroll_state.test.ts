import assert from "node:assert/strict";
import { test } from "node:test";
import { TranscriptAutoScrollState } from "../src/pages/chats/transcript_auto_scroll_state";

test("TranscriptAutoScrollState drops sticky mode after an upward wheel intent", () => {
  const state = new TranscriptAutoScrollState();

  const shouldStickToBottom = state.noteUpwardScrollIntent({
    clientHeight: 400,
    scrollHeight: 1200,
    scrollTop: 300,
  });

  assert.equal(shouldStickToBottom, false);
  assert.equal(state.getShouldStickToBottom(), false);
});

test("TranscriptAutoScrollState keeps sticky mode during programmatic scroll updates", () => {
  const state = new TranscriptAutoScrollState();

  state.beginProgrammaticScroll();
  const shouldStickToBottom = state.syncFromScroll({
    bottomThresholdPx: 24,
    clientHeight: 400,
    scrollHeight: 1200,
    scrollTop: 760,
  });
  state.completeProgrammaticScroll(760);

  assert.equal(shouldStickToBottom, true);
  assert.equal(state.getShouldStickToBottom(), true);
});

test("TranscriptAutoScrollState reattaches to the live tail after scrolling back down near the bottom", () => {
  const state = new TranscriptAutoScrollState();

  state.syncFromScroll({
    bottomThresholdPx: 24,
    clientHeight: 400,
    scrollHeight: 1200,
    scrollTop: 760,
  });
  state.syncFromScroll({
    bottomThresholdPx: 24,
    clientHeight: 400,
    scrollHeight: 1200,
    scrollTop: 500,
  });

  const shouldStickToBottom = state.syncFromScroll({
    bottomThresholdPx: 24,
    clientHeight: 400,
    scrollHeight: 1200,
    scrollTop: 780,
  });

  assert.equal(shouldStickToBottom, true);
  assert.equal(state.getShouldStickToBottom(), true);
});
