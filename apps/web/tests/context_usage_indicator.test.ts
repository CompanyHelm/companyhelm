import assert from "node:assert/strict";
import { test } from "node:test";
import { ChatsContextUsageIndicatorPresenter } from "../src/pages/chats/context_usage_indicator";

test("context usage indicator keeps its initial blue color at high usage levels", () => {
  const highUsageStyle = ChatsContextUsageIndicatorPresenter.resolveIndicatorStyle(0.8);
  const nearlyFullUsageStyle = ChatsContextUsageIndicatorPresenter.resolveIndicatorStyle(0.9);
  const fullUsageStyle = ChatsContextUsageIndicatorPresenter.resolveIndicatorStyle(1);

  assert.equal(
    highUsageStyle.background,
    "conic-gradient(rgb(59 130 246) 288deg, rgba(255, 255, 255, 0.12) 288deg 360deg)",
  );
  assert.equal(
    nearlyFullUsageStyle.background,
    "conic-gradient(rgb(59 130 246) 324deg, rgba(255, 255, 255, 0.12) 324deg 360deg)",
  );
  assert.equal(
    fullUsageStyle.background,
    "conic-gradient(rgb(59 130 246) 360deg, rgba(255, 255, 255, 0.12) 360deg 360deg)",
  );
});
