import assert from "node:assert/strict";
import { test } from "node:test";
import { SmoothStreamingTextController } from "../src/pages/chats/smooth_streaming_text_controller";

test("SmoothStreamingTextController reveals appended text over multiple animation frames", () => {
  const controller = new SmoothStreamingTextController();

  const initialState = controller.setTargetText("Hello world", { isComplete: false });
  assert.equal(initialState.displayText, "");
  assert.equal(initialState.shouldContinue, false);

  const bufferedState = controller.setTargetText("Hello world again", { isComplete: false });
  assert.equal(bufferedState.displayText, "Hello ");
  assert.equal(bufferedState.shouldContinue, true);

  const firstFrameState = controller.advanceTo(16);
  assert.ok(firstFrameState.displayText.length > bufferedState.displayText.length);
  assert.ok(firstFrameState.displayText.length < "Hello world again".length);
  assert.equal(firstFrameState.shouldContinue, true);

  let nextState = firstFrameState;
  for (let timestamp = 32; timestamp <= 256 && nextState.shouldContinue; timestamp += 16) {
    nextState = controller.advanceTo(timestamp);
  }

  assert.equal(nextState.displayText, "Hello world again");
  assert.equal(nextState.shouldContinue, false);
});

test("SmoothStreamingTextController keeps tiny prefixes hidden until enough text arrives", () => {
  const controller = new SmoothStreamingTextController();

  const shortWordState = controller.setTargetText("Absolutel", { isComplete: false });
  assert.equal(shortWordState.displayText, "");
  assert.equal(shortWordState.shouldContinue, false);

  const sentenceState = controller.setTargetText("Absolutely, here is the plan.", { isComplete: false });
  assert.equal(sentenceState.displayText, "Absolu");
  assert.equal(sentenceState.shouldContinue, true);

  const markdownPrefixController = new SmoothStreamingTextController();
  const starState = markdownPrefixController.setTargetText("*", { isComplete: false });
  assert.equal(starState.displayText, "");
  assert.equal(starState.shouldContinue, false);

  const bulletState = markdownPrefixController.setTargetText("* concrete next steps", { isComplete: false });
  assert.equal(bulletState.displayText, "* conc");
  assert.equal(bulletState.shouldContinue, true);
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
