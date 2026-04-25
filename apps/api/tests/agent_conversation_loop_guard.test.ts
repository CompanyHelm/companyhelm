import assert from "node:assert/strict";
import { test } from "vitest";
import { AgentConversationLoopGuard } from "../src/services/conversations/loop_guard.ts";

test("AgentConversationLoopGuard blocks repeated acknowledgement ping pong", () => {
  const guard = new AgentConversationLoopGuard();

  const blocked = guard.shouldBlockLowInformationReply(
    "session-ceo",
    "Will do — thanks again. I will reach out if I need another focused review.",
    [
      {
        authorSessionId: "session-simple",
        text: "Sounds good — feel free to loop me in anytime.",
      },
      {
        authorSessionId: "session-ceo",
        text: "Will do — thanks for the review.",
      },
    ],
  );

  assert.equal(blocked, true);
});

test("AgentConversationLoopGuard allows first acknowledgement after substantive content", () => {
  const guard = new AgentConversationLoopGuard();

  const blocked = guard.shouldBlockLowInformationReply(
    "session-ceo",
    "Thanks — received. I will fold that into the PR.",
    [
      {
        authorSessionId: "session-simple",
        text: "Findings: no blocker for fresh templates, but resumed sandboxes may have mixed ownership.",
      },
    ],
  );

  assert.equal(blocked, false);
});

test("AgentConversationLoopGuard allows substantive replies even after acknowledgement history", () => {
  const guard = new AgentConversationLoopGuard();

  const blocked = guard.shouldBlockLowInformationReply(
    "session-ceo",
    "Please take another pass specifically on the mixed-ownership tmux resume mitigation and add test ideas.",
    [
      {
        authorSessionId: "session-simple",
        text: "Sounds good — feel free to loop me in anytime.",
      },
      {
        authorSessionId: "session-ceo",
        text: "Will do — thanks again.",
      },
    ],
  );

  assert.equal(blocked, false);
});
