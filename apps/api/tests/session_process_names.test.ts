import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionProcessPubSubNames } from "../src/services/agent/session/process/pub_sub_names.ts";
import { SessionProcessQueuedNames } from "../src/services/agent/session/process/queued_names.ts";

test("SessionProcessQueuedNames returns the queue and worker coordination names", () => {
  const names = new SessionProcessQueuedNames();

  assert.equal(names.getWakeQueueName(), "agent-session-process");
  assert.equal(names.getWakeJobName(), "wake");
  assert.equal(
    names.getWakeJobId("company-1", "session-1"),
    "company:company-1:session:session-1:wake",
  );
  assert.equal(names.getSessionSteerChannel("session-1"), "session:session-1:steer");
  assert.equal(names.getSessionLeaseKey("session-1"), "session:session-1:lease");
});

test("SessionProcessPubSubNames returns the session and message update channels", () => {
  const names = new SessionProcessPubSubNames();

  assert.equal(names.getSessionUpdateChannel("session-1"), "session:session-1:update");
  assert.equal(names.getSessionUpdatePattern(), "session:*:update");
  assert.equal(
    names.getSessionMessageUpdateChannel("session-1", "message-1"),
    "session:session-1:message:message-1:update",
  );
  assert.equal(names.getSessionMessageUpdatePattern("session-1"), "session:session-1:message:*:update");
});
