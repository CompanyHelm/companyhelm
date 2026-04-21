import assert from "node:assert/strict";
import { test } from "node:test";
import type { MutableRefObject } from "react";
import { areChatTranscriptPanePropsEqual } from "../src/pages/chats/chat_transcript_pane";

function buildTranscriptPaneProps() {
  const session = {
    id: "session-1",
    updatedAt: "2026-04-21T00:00:00.000Z",
  };
  const sessionMessages = [{
    id: "message-1",
    role: "assistant",
    text: "READY",
  }];
  const transcriptScrollRef = {
    current: null,
  } as MutableRefObject<HTMLDivElement | null>;
  const onJumpToLatest = () => {};
  const onScroll = () => {};

  return {
    isLoadingOlderMessages: false,
    isLoadingTranscript: false,
    isTranscriptStuckToBottom: true,
    onJumpToLatest,
    onScroll,
    organizationSlug: "test-org",
    session,
    sessionMessages,
    transcriptScrollRef,
  };
}

test("areChatTranscriptPanePropsEqual keeps the transcript stable when all transcript inputs are unchanged", () => {
  const props = buildTranscriptPaneProps();

  assert.equal(areChatTranscriptPanePropsEqual(props, props), true);
});

test("areChatTranscriptPanePropsEqual rerenders when the transcript messages change", () => {
  const previousProps = buildTranscriptPaneProps();
  const nextProps = {
    ...previousProps,
    sessionMessages: [...previousProps.sessionMessages, {
      id: "message-2",
      role: "assistant",
      text: "OK",
    }],
  };

  assert.equal(areChatTranscriptPanePropsEqual(previousProps, nextProps), false);
});

test("areChatTranscriptPanePropsEqual rerenders when session metadata changes", () => {
  const previousProps = buildTranscriptPaneProps();
  const nextProps = {
    ...previousProps,
    session: {
      ...previousProps.session,
      updatedAt: "2026-04-21T00:01:00.000Z",
    },
  };

  assert.equal(areChatTranscriptPanePropsEqual(previousProps, nextProps), false);
});

test("areChatTranscriptPanePropsEqual rerenders when transcript loading state changes", () => {
  const previousProps = buildTranscriptPaneProps();
  const nextProps = {
    ...previousProps,
    isLoadingTranscript: true,
  };

  assert.equal(areChatTranscriptPanePropsEqual(previousProps, nextProps), false);
});
