import assert from "node:assert/strict";
import { test } from "node:test";
import { SmoothStreamingTextController } from "../src/pages/chats/smooth_streaming_text_controller";

test("SmoothStreamingTextController reveals appended text over multiple animation frames", () => {
  const controller = new SmoothStreamingTextController();

  const initialState = controller.setTargetText("Hello world", { isComplete: false });
  assert.equal(initialState.displayText, "H");
  assert.equal(initialState.shouldContinue, true);

  const firstFrameState = controller.advanceTo(16);
  assert.ok(firstFrameState.displayText.length > initialState.displayText.length);
  assert.ok(firstFrameState.displayText.length < "Hello world".length);
  assert.equal(firstFrameState.shouldContinue, true);

  let nextState = firstFrameState;
  for (let timestamp = 32; timestamp <= 256 && nextState.shouldContinue; timestamp += 16) {
    nextState = controller.advanceTo(timestamp);
  }

  assert.equal(nextState.displayText, "Hello world");
  assert.equal(nextState.shouldContinue, false);
});

test("SmoothStreamingTextController snaps immediately when the server marks the message complete", () => {
  const controller = new SmoothStreamingTextController();

  controller.setTargetText("Chunked", { isComplete: false });
  const completedState = controller.setTargetText("Chunked output", { isComplete: true });

  assert.equal(completedState.displayText, "Chunked output");
  assert.equal(completedState.shouldContinue, false);
});

test("SmoothStreamingTextController snaps to rewritten text instead of animating stale prefixes", () => {
  const controller = new SmoothStreamingTextController();

  controller.setTargetText("Thinking...", { isComplete: false });
  controller.advanceTo(16);

  const rewrittenState = controller.setTargetText("Final answer", { isComplete: false });
  assert.equal(rewrittenState.displayText, "Final answer");
  assert.equal(rewrittenState.shouldContinue, false);
});
