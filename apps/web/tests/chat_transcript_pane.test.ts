import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import type { MutableRefObject } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatTranscriptPane, ChatTranscriptTimestampPresenter, areChatTranscriptPanePropsEqual } from "../src/pages/chats/chat_transcript_pane";

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
    isCompacting: false,
    status: "running",
    updatedAt: "2026-04-21T00:00:00.000Z",
  };
  const sessionMessages = [{
    contents: [],
    createdAt: "2026-04-21T00:00:00.000Z",
    errorMessage: null,
    id: "message-1",
    isError: false,
    role: "assistant",
    status: "completed",
    text: "READY",
    toolCallId: null,
  }];
  const transcriptScrollRef = {
    current: null,
  } as MutableRefObject<HTMLDivElement | null>;
  const onJumpToLatest = () => {};
  const onScroll = () => {};
  const onFileDrag = () => {};

  return {
    isFileDropActive: false,
    isLoadingOlderMessages: false,
    isLoadingTranscript: false,
    isTranscriptStuckToBottom: true,
    onFileDragEnter: onFileDrag,
    onFileDragLeave: onFileDrag,
    onFileDragOver: onFileDrag,
    onFileDrop: onFileDrag,
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

test("chat transcript pane renders compaction status from session state", () => {
  const props = buildTranscriptPaneProps();
  const markup = renderToStaticMarkup(createElement(ChatTranscriptPane, {
    ...props,
    session: {
      ...props.session,
      isCompacting: true,
    },
    sessionMessages: [],
  }));

  assert.match(markup, /Compacting context/u);
});

test("chat transcript pane renders streamed compaction markers and suppresses the fallback pill", () => {
  const props = buildTranscriptPaneProps();
  const markup = renderToStaticMarkup(createElement(ChatTranscriptPane, {
    ...props,
    session: {
      ...props.session,
      isCompacting: true,
    },
    sessionMessages: [
      {
        contents: [{
          structuredContent: {
            phase: "start",
            type: "compaction",
          },
          text: "Compacting…",
        }],
        createdAt: "2026-04-21T00:00:00.000Z",
        errorMessage: null,
        id: "message-compaction-start",
        isError: false,
        role: "assistant",
        status: "running",
        text: "Compacting…",
        toolCallId: null,
        turnId: "turn-compaction-start",
      },
      {
        contents: [{
          structuredContent: {
            phase: "end",
            type: "compaction",
          },
          text: "Compaction complete",
        }],
        createdAt: "2026-04-21T00:00:05.000Z",
        errorMessage: null,
        id: "message-compaction-end",
        isError: false,
        role: "assistant",
        status: "completed",
        text: "Compaction complete",
        toolCallId: null,
        turnId: "turn-compaction-end",
      },
    ],
  }));

  assert.match(markup, /Compacting…/u);
  assert.match(markup, /Compaction complete/u);
  assert.doesNotMatch(markup, /Compacting context/u);
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

test("timestamp tooltip open changes are rejected when the boundary is unavailable", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.shouldApplyOpenChange({
      boundary: null,
      open: true,
      side: "top",
      triggerRect: buildDomRect({ height: 160, left: 0, top: 280, width: 640 }),
    }),
    false,
  );
});

test("timestamp tooltip close changes still apply without a boundary", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.shouldApplyOpenChange({
      boundary: null,
      open: false,
      side: "top",
      triggerRect: null,
    }),
    true,
  );
});

test("timestamp tooltip open changes are allowed when the trigger fits inside the boundary", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.shouldApplyOpenChange({
      boundary: {
        height: 400,
        width: 640,
        x: 0,
        y: 240,
      },
      open: true,
      side: "top",
      triggerRect: buildDomRect({ height: 160, left: 0, top: 280, width: 640 }),
    }),
    true,
  );
});

test("timestamp tooltip touch taps are allowed when the row fits inside the boundary", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.shouldOpenTooltipForPointerTap({
      boundary: {
        height: 400,
        width: 640,
        x: 0,
        y: 240,
      },
      pointerType: "touch",
      side: "top",
      targetIsInteractive: false,
      triggerRect: buildDomRect({ height: 160, left: 0, top: 280, width: 640 }),
    }),
    true,
  );
});

test("timestamp tooltip mouse clicks do not replace desktop hover behavior", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.shouldOpenTooltipForPointerTap({
      boundary: {
        height: 400,
        width: 640,
        x: 0,
        y: 240,
      },
      pointerType: "mouse",
      side: "top",
      targetIsInteractive: false,
      triggerRect: buildDomRect({ height: 160, left: 0, top: 280, width: 640 }),
    }),
    false,
  );
});

test("timestamp tooltip touch taps ignore controls inside tool messages", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.shouldOpenTooltipForPointerTap({
      boundary: {
        height: 400,
        width: 640,
        x: 0,
        y: 240,
      },
      pointerType: "touch",
      side: "top",
      targetIsInteractive: true,
      triggerRect: buildDomRect({ height: 160, left: 0, top: 280, width: 640 }),
    }),
    false,
  );
});

test("timestamp tooltip touch taps use top placement when the desktop hover placement is left", () => {
  assert.equal(ChatTranscriptTimestampPresenter.resolvePointerTapTooltipSide("left"), "top");
});

test("timestamp tooltip touch taps open even when desktop hover would be too close to the boundary", () => {
  assert.equal(
    ChatTranscriptTimestampPresenter.shouldOpenTooltipForPointerTap({
      boundary: {
        height: 400,
        width: 640,
        x: 0,
        y: 240,
      },
      pointerType: "touch",
      side: "top",
      targetIsInteractive: false,
      triggerRect: buildDomRect({ height: 160, left: 0, top: 250, width: 640 }),
    }),
    true,
  );
});

test("timestamp tooltip touch taps auto hide after five seconds", () => {
  assert.equal(ChatTranscriptTimestampPresenter.resolvePointerTapAutoHideMilliseconds(), 5000);
});
