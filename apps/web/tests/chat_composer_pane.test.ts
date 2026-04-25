import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatComposerPane } from "../src/pages/chats/chat_composer_pane";

function renderChatComposerPane(canManuallyResizeDraftTextarea: boolean): string {
  return renderToStaticMarkup(createElement(ChatComposerPane, {
    canForkLatestSession: false,
    canInterruptSelectedSession: false,
    canManuallyResizeDraftTextarea,
    canSubmitDraft: false,
    composerModelOptionId: "model-1",
    composerModelOptions: [],
    composerReasoningLevel: "high",
    deletingQueuedMessageId: null,
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
    selectedSession: null,
    selectedSessionHumanQuestion: null,
    shouldShowInterruptComposerAction: false,
    shouldShowQueueComposerAction: false,
    shouldUseCompactComposerSettings: true,
    steeringQueuedMessageId: null,
  }));
}

test("hides the composer resize handle when manual resizing is disabled", () => {
  const html = renderChatComposerPane(false);

  assert.doesNotMatch(html, /Resize message input/);
});

test("renders the composer resize handle when manual resizing is enabled", () => {
  const html = renderChatComposerPane(true);

  assert.match(html, /Resize message input/);
});
