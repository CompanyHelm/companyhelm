import assert from "node:assert/strict";
import { test } from "node:test";
import type { MutableRefObject } from "react";
import { ChatTranscriptTimestampPresenter, areChatTranscriptPanePropsEqual } from "../src/pages/chats/chat_transcript_pane";

function buildDomRect(properties: { height: number; left: number; top: number; width: number }): DOMRectReadOnly {
  return {
    bottom: properties.top + properties.height,
    height: properties.height,
    left: properties.left,
    right: properties.left + properties.width,
    top: properties.top,
    width: properties.width,
    x: properties.left,
    y: properties.top,
    toJSON: () => ({}),
  };
}

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

test("timestamp tooltip boundary starts below visible workflow chrome", () => {
  const boundary = ChatTranscriptTimestampPresenter.resolveTooltipBoundary(
    buildDomRect({ height: 500, left: 0, top: 100, width: 640 }),
    buildDomRect({ height: 1200, left: 0, top: 240, width: 640 }),
  );

  assert.deepEqual(boundary, {
    height: 360,
    width: 640,
    x: 0,
    y: 240,
  });
});

test("timestamp tooltip boundary uses the viewport top after the workflow chrome scrolls away", () => {
  const boundary = ChatTranscriptTimestampPresenter.resolveTooltipBoundary(
    buildDomRect({ height: 500, left: 0, top: 100, width: 640 }),
    buildDomRect({ height: 1200, left: 0, top: 40, width: 640 }),
  );

  assert.deepEqual(boundary, {
    height: 500,
    width: 640,
    x: 0,
    y: 100,
  });
});

test("timestamp tooltip does not open above a row without room inside the message boundary", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.canShowTooltipForTrigger({
      boundary: {
        height: 400,
        width: 640,
        x: 0,
        y: 240,
      },
      side: "top",
      triggerRect: buildDomRect({ height: 160, left: 0, top: 250, width: 640 }),
    }),
    false,
  );
});

test("timestamp tooltip opens above a row when the popup can stay inside the message boundary", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.canShowTooltipForTrigger({
      boundary: {
        height: 400,
        width: 640,
        x: 0,
        y: 240,
      },
      side: "top",
      triggerRect: buildDomRect({ height: 160, left: 0, top: 280, width: 640 }),
    }),
    true,
  );
});
