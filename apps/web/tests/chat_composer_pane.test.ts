import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatComposerPane } from "../src/pages/chats/chat_composer_pane";
import type { SessionRecord } from "../src/pages/chats/chats_page_data";

function createSelectedSession(): SessionRecord {
  return {
    canForkLatestSession: true,
    currentContextTokens: 1024,
    isCompacting: false,
    isThinking: false,
    maxContextTokens: 64000,
  } as SessionRecord;
}

function renderChatComposerPane(input: {
  canForkLatestSession?: boolean;
  canManuallyResizeDraftTextarea?: boolean;
  draftTextareaMinimumLines?: number;
  selectedSession?: SessionRecord | null;
} = {}): string {
  return renderToStaticMarkup(createElement(ChatComposerPane, {
    canForkLatestSession: input.canForkLatestSession ?? false,
    canInterruptSelectedSession: false,
    canManuallyResizeDraftTextarea: input.canManuallyResizeDraftTextarea ?? false,
    canSubmitDraft: false,
    composerModelOptionId: "model-1",
    composerModelOptions: [],
    composerReasoningLevel: "high",
    deletingQueuedMessageId: null,
    draftTextareaMinimumLines: input.draftTextareaMinimumLines ?? 1,
    draftImageFileInputRef: createRef<HTMLInputElement>(),
    draftImages: [],
    draftMessage: "",
    draftSubmitAriaLabel: "Send message",
    draftTextareaRef: createRef<HTMLTextAreaElement>(),
    hasDraftInput: false,
    isComposerDragActive: false,
    isDismissInboxHumanQuestionInFlight: false,
    isForkingLatestSession: false,
    isResolveInboxHumanQuestionInFlight: false,
    onComposerDragEnter: () => {},
    onComposerDragLeave: () => {},
    onComposerDragOver: () => {},
    onComposerDrop: () => {},
    onDeleteQueuedMessage: () => {},
    onDismissHumanQuestion: () => {},
    onDraftImageInputChange: () => {},
    onDraftMessageChange: () => {},
    onForkLatestSession: () => {},
    onModelChange: () => {},
    onOpenDraftImagePicker: () => {},
    onQueueDraft: () => {},
    onReasoningLevelChange: () => {},
    onRemoveDraftImage: () => {},
    onResolveHumanQuestion: () => {},
    onStartDraftTextareaResize: () => {},
    onSteerQueuedMessage: () => {},
    onSubmitDraft: () => {},
    queueDraftAriaLabel: "Queue message",
    queuedMessages: [],
    selectedSession: input.selectedSession ?? null,
    selectedSessionHumanQuestion: null,
    shouldShowInterruptComposerAction: false,
    shouldShowQueueComposerAction: false,
    shouldUseCompactComposerSettings: true,
    steeringQueuedMessageId: null,
  }));
}

test("hides the composer resize handle when manual resizing is disabled", () => {
  const html = renderChatComposerPane({ canManuallyResizeDraftTextarea: false });

  assert.doesNotMatch(html, /Resize message input/);
});

test("renders the composer resize handle when manual resizing is enabled", () => {
  const html = renderChatComposerPane({ canManuallyResizeDraftTextarea: true });

  assert.match(html, /Resize message input/);
});

test("hides the latest-context fork button when forking is disabled", () => {
  const html = renderChatComposerPane({
    canForkLatestSession: false,
    selectedSession: createSelectedSession(),
  });

  assert.doesNotMatch(html, /Fork latest context/);
});

test("renders the latest-context fork button when forking is enabled", () => {
  const html = renderChatComposerPane({
    canForkLatestSession: true,
    selectedSession: createSelectedSession(),
  });

  assert.match(html, /Fork latest context/);
});

test("uses the requested minimum visible rows for the draft textarea", () => {
  const html = renderChatComposerPane({ draftTextareaMinimumLines: 3 });

  assert.match(html, /rows="3"/);
});
