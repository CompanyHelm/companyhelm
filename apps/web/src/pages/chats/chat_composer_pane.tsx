import { useLayoutEffect, useRef, useState } from "react";
import type {
  ChangeEvent as ReactChangeEvent,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { Loader2Icon, PlusIcon, SendHorizonalIcon, SquareIcon, Trash2Icon, XIcon } from "lucide-react";
import { SessionHumanQuestionSnippet } from "./session_human_question_snippet";
import { ChatsContextUsageIndicator } from "./context_usage_indicator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatComposerModelPicker, type ChatComposerModelOption } from "./chat_composer_model_picker";
import type {
  DraftComposerImageRecord,
  InboxHumanQuestionRecord,
  QueuedMessageRecord,
  SessionRecord,
} from "./chats_page_data";
import {
  CHATS_THINKING_GRADIENT_KEYFRAMES,
  CHAT_DRAFT_MIN_LINES,
  CHAT_IMAGE_INPUT_ACCEPT,
  normalizeQueuedMessageStatus,
  resolveInlineImageDataUrl,
  resolveQueuedMessagePreview,
} from "./chats_page_helpers";

function ChatsThinkingIndicator({
  className,
  visible,
}: {
  className?: string;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <>
      <style>{CHATS_THINKING_GRADIENT_KEYFRAMES}</style>
      <div className={className}>
        <p
          className="whitespace-pre-wrap text-sm font-medium text-transparent"
          style={{
            animation: "chats-thinking-gradient 2.2s linear infinite",
            backgroundClip: "text",
            backgroundImage: "linear-gradient(90deg, rgba(250,250,250,0.32) 0%, rgba(250,250,250,0.95) 48%, rgba(250,250,250,0.32) 100%)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
          }}
        >
          Thinking...
        </p>
      </div>
    </>
  );
}

function ChatsQueuedMessagesComposerList({
  steeringQueuedMessageId,
  deletingQueuedMessageId,
  onSteer,
  onDelete,
  queuedMessages,
}: {
  steeringQueuedMessageId: string | null;
  deletingQueuedMessageId: string | null;
  onSteer: (queuedMessageId: string) => void;
  onDelete: (queuedMessageId: string) => void;
  queuedMessages: ReadonlyArray<QueuedMessageRecord>;
}) {
  const [fullscreenQueuedMessageId, setFullscreenQueuedMessageId] = useState<string | null>(null);

  if (queuedMessages.length === 0) {
    return null;
  }

  const fullscreenQueuedMessage = queuedMessages.find((queuedMessage) => queuedMessage.id === fullscreenQueuedMessageId) ?? null;

  return (
    <>
      <div className="px-2.5 pt-2 pb-1.5">
        <div className="grid gap-1.5">
          {queuedMessages.map((queuedMessage) => {
            return (
              <ChatsQueuedMessagesComposerListItem
                key={queuedMessage.id}
                deletingQueuedMessageId={deletingQueuedMessageId}
                onDelete={onDelete}
                onOpenFullscreen={setFullscreenQueuedMessageId}
                onSteer={onSteer}
                queuedMessage={queuedMessage}
                steeringQueuedMessageId={steeringQueuedMessageId}
              />
            );
          })}
        </div>
      </div>
      <Dialog
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setFullscreenQueuedMessageId(null);
          }
        }}
        open={fullscreenQueuedMessage !== null}
      >
        <DialogContent className="flex h-[min(92vh,56rem)] w-[min(96vw,72rem)] max-w-none flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border/60 px-6 pt-6 pb-4">
            <DialogTitle>Queued message</DialogTitle>
            <DialogDescription>
              {fullscreenQueuedMessage?.shouldSteer ? "Steer message preview" : "Queued message preview"}
            </DialogDescription>
          </DialogHeader>
          {fullscreenQueuedMessage ? (
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {fullscreenQueuedMessage.text.trim().length > 0 ? (
                <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground [overflow-wrap:anywhere]">
                    {fullscreenQueuedMessage.text}
                  </p>
                </div>
              ) : null}
              {fullscreenQueuedMessage.images.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {fullscreenQueuedMessage.images.map((image) => (
                    <img
                      key={image.id}
                      alt="Queued attachment"
                      className="w-full rounded-2xl border border-border/60 object-cover"
                      src={resolveInlineImageDataUrl(image)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChatsQueuedMessagesComposerListItem({
  queuedMessage,
  steeringQueuedMessageId,
  deletingQueuedMessageId,
  onSteer,
  onDelete,
  onOpenFullscreen,
}: {
  queuedMessage: QueuedMessageRecord;
  steeringQueuedMessageId: string | null;
  deletingQueuedMessageId: string | null;
  onSteer: (queuedMessageId: string) => void;
  onDelete: (queuedMessageId: string) => void;
  onOpenFullscreen: (queuedMessageId: string) => void;
}) {
  const previewTextElementRef = useRef<HTMLParagraphElement | null>(null);
  const [isPreviewOverflowing, setIsPreviewOverflowing] = useState(false);
  const normalizedStatus = normalizeQueuedMessageStatus(queuedMessage.status);
  const previewText = resolveQueuedMessagePreview(queuedMessage.text);
  const hasHiddenQueuedMessageText = queuedMessage.text !== previewText;
  const canSteer = !queuedMessage.shouldSteer && normalizedStatus === "pending";
  const canDelete = !queuedMessage.shouldSteer && normalizedStatus === "pending";
  const shouldShowFullscreen = hasHiddenQueuedMessageText || isPreviewOverflowing;
  const isSteering = steeringQueuedMessageId === queuedMessage.id;
  const isDeleting = deletingQueuedMessageId === queuedMessage.id;

  useLayoutEffect(() => {
    const previewTextElement = previewTextElementRef.current;
    if (!previewTextElement || previewText.length === 0) {
      setIsPreviewOverflowing(false);
      return undefined;
    }

    const updateOverflowState = () => {
      setIsPreviewOverflowing((previewTextElement.scrollWidth - previewTextElement.clientWidth) > 1);
    };

    updateOverflowState();

    const resizeObserver = new ResizeObserver(() => {
      updateOverflowState();
    });
    resizeObserver.observe(previewTextElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [previewText]);

  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background/70 px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {queuedMessage.shouldSteer ? "Steer" : "Queue"}
          </span>
        </div>
        {previewText.trim().length > 0 ? (
          <p className="mt-1 truncate text-sm leading-5 text-foreground" ref={previewTextElementRef}>
            {hasHiddenQueuedMessageText && !isPreviewOverflowing ? `${previewText}...` : previewText}
          </p>
        ) : null}
        {queuedMessage.images.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {queuedMessage.images.map((image) => (
              <img
                key={image.id}
                alt="Queued attachment"
                className="h-12 w-12 rounded-lg border border-border/60 object-cover"
                src={resolveInlineImageDataUrl(image)}
              />
            ))}
          </div>
        ) : null}
      </div>
      {shouldShowFullscreen || canSteer || canDelete ? (
        <div className="flex shrink-0 items-center gap-1 self-center">
          {shouldShowFullscreen ? (
            <button
              aria-label="Open queued message full screen"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/50 hover:text-foreground"
              onClick={() => onOpenFullscreen(queuedMessage.id)}
              title="Full screen"
              type="button"
            >
              <span aria-hidden="true" className="font-mono text-[11px] leading-none">
                {"<>"}
              </span>
            </button>
          ) : null}
          {canSteer ? (
            <button
              aria-label="Steer queued message"
              className="inline-flex h-7 items-center justify-center rounded-full px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSteering}
              onClick={() => onSteer(queuedMessage.id)}
              title={isSteering ? "Steering queued message..." : "Steer queued message"}
              type="button"
            >
              {isSteering ? <Loader2Icon className="size-4 animate-spin" /> : "Steer"}
            </button>
          ) : null}
          {canDelete ? (
            <button
              aria-label="Delete queued message"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isDeleting}
              onClick={() => onDelete(queuedMessage.id)}
              title={isDeleting ? "Deleting queued message..." : "Delete queued message"}
              type="button"
            >
              {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChatsDraftImagesPreview({
  draftImages,
  onRemove,
}: {
  draftImages: ReadonlyArray<DraftComposerImageRecord>;
  onRemove: (draftImageId: string) => void;
}) {
  if (draftImages.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border/60 px-2.5 pt-2.5 pb-2">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Attachments
        </p>
        <span className="text-[11px] text-muted-foreground">
          {draftImages.length} {draftImages.length === 1 ? "image" : "images"}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {draftImages.map((draftImage) => (
          <div
            key={draftImage.id}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/70 p-1"
          >
            <img
              alt={draftImage.fileName}
              className="h-16 w-16 rounded-xl object-cover"
              src={resolveInlineImageDataUrl(draftImage)}
            />
            <button
              aria-label={`Remove ${draftImage.fileName}`}
              className="absolute top-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-background/85 text-muted-foreground opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-foreground"
              onClick={() => onRemove(draftImage.id)}
              title={`Remove ${draftImage.fileName}`}
              type="button"
            >
              <XIcon className="size-3" />
            </button>
            <p className="max-w-16 truncate px-1 pt-1 text-[10px] text-muted-foreground" title={draftImage.fileName}>
              {draftImage.fileName}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatComposerPane({
  selectedSession,
  selectedSessionHumanQuestion,
  draftMessage,
  draftImages,
  isComposerDragActive,
  steeringQueuedMessageId,
  deletingQueuedMessageId,
  queuedMessages,
  isDismissInboxHumanQuestionInFlight,
  isResolveInboxHumanQuestionInFlight,
  shouldUseCompactComposerSettings,
  composerModelOptions,
  composerModelOptionId,
  composerReasoningLevel,
  draftSubmitAriaLabel,
  queueDraftAriaLabel,
  canSubmitDraft,
  canInterruptSelectedSession,
  shouldShowQueueComposerAction,
  shouldShowInterruptComposerAction,
  draftImageFileInputRef,
  draftTextareaRef,
  hasDraftInput,
  onDraftMessageChange,
  onDraftImageInputChange,
  onOpenDraftImagePicker,
  onRemoveDraftImage,
  onComposerDragEnter,
  onComposerDragLeave,
  onComposerDragOver,
  onComposerDrop,
  onDismissHumanQuestion,
  onResolveHumanQuestion,
  onSteerQueuedMessage,
  onDeleteQueuedMessage,
  onModelChange,
  onReasoningLevelChange,
  onSubmitDraft,
  onQueueDraft,
  onStartDraftTextareaResize,
}: {
  selectedSession: SessionRecord | null;
  selectedSessionHumanQuestion: InboxHumanQuestionRecord | null;
  draftMessage: string;
  draftImages: ReadonlyArray<DraftComposerImageRecord>;
  isComposerDragActive: boolean;
  steeringQueuedMessageId: string | null;
  deletingQueuedMessageId: string | null;
  queuedMessages: ReadonlyArray<QueuedMessageRecord>;
  isDismissInboxHumanQuestionInFlight: boolean;
  isResolveInboxHumanQuestionInFlight: boolean;
  shouldUseCompactComposerSettings: boolean;
  composerModelOptions: ReadonlyArray<ChatComposerModelOption>;
  composerModelOptionId: string;
  composerReasoningLevel: string;
  draftSubmitAriaLabel: string;
  queueDraftAriaLabel: string;
  canSubmitDraft: boolean;
  canInterruptSelectedSession: boolean;
  shouldShowQueueComposerAction: boolean;
  shouldShowInterruptComposerAction: boolean;
  draftImageFileInputRef: RefObject<HTMLInputElement>;
  draftTextareaRef: RefObject<HTMLTextAreaElement>;
  hasDraftInput: boolean;
  onDraftMessageChange: (value: string) => void;
  onDraftImageInputChange: (event: ReactChangeEvent<HTMLInputElement>) => void;
  onOpenDraftImagePicker: () => void;
  onRemoveDraftImage: (draftImageId: string) => void;
  onComposerDragEnter: (event: ReactDragEvent<HTMLDivElement>) => void;
  onComposerDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  onComposerDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onComposerDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDismissHumanQuestion: (inboxItemId: string) => void;
  onResolveHumanQuestion: (input: {
    customAnswerText?: string;
    inboxItemId: string;
    proposalId?: string;
  }) => void;
  onSteerQueuedMessage: (queuedMessageId: string) => void;
  onDeleteQueuedMessage: (queuedMessageId: string) => void;
  onModelChange: (modelOptionId: string) => void;
  onReasoningLevelChange: (reasoningLevel: string) => void;
  onSubmitDraft: () => void;
  onQueueDraft: () => void;
  onStartDraftTextareaResize: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="relative shrink-0 border-t border-border/60 px-2 pt-2 pb-0 md:px-3 md:pt-2 md:pb-0">
      <button
        aria-label="Resize message input"
        className="absolute inset-x-0 -top-2 z-10 h-4 cursor-move bg-transparent"
        onPointerDown={onStartDraftTextareaResize}
        type="button"
      />
      <div
        className={`relative overflow-hidden rounded-[1.35rem] bg-input/20 ring-1 transition focus-within:ring-ring/40 ${
          isComposerDragActive
            ? "bg-primary/8 ring-primary/50"
            : "ring-input"
        }`}
        onDragEnter={onComposerDragEnter}
        onDragLeave={onComposerDragLeave}
        onDragOver={onComposerDragOver}
        onDrop={onComposerDrop}
      >
        {isComposerDragActive ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[1.35rem] border border-dashed border-primary/60 bg-primary/10 px-6 text-center">
            <div className="grid gap-1">
              <p className="text-sm font-medium text-foreground">Drop JPEG or PNG images here</p>
              <p className="text-xs text-muted-foreground">They&apos;ll be attached to your next message.</p>
            </div>
          </div>
        ) : null}
        <div className={`transition ${isComposerDragActive ? "opacity-35" : "opacity-100"}`}>
          {selectedSession && selectedSessionHumanQuestion ? (
            <SessionHumanQuestionSnippet
              isDismissing={isDismissInboxHumanQuestionInFlight}
              isResolving={isResolveInboxHumanQuestionInFlight}
              onDismiss={() => {
                onDismissHumanQuestion(selectedSessionHumanQuestion.id);
              }}
              onSelectProposal={(proposalId) => {
                onResolveHumanQuestion({
                  inboxItemId: selectedSessionHumanQuestion.id,
                  proposalId,
                });
              }}
              question={{
                allowCustomAnswer: selectedSessionHumanQuestion.allowCustomAnswer,
                id: selectedSessionHumanQuestion.id,
                proposals: selectedSessionHumanQuestion.proposals.map((proposal) => ({
                  answerText: proposal.answerText,
                  id: proposal.id,
                  rating: proposal.rating,
                })),
                questionText: selectedSessionHumanQuestion.questionText,
                title: selectedSessionHumanQuestion.title,
              }}
            />
          ) : null}
          {selectedSession ? (
            <ChatsQueuedMessagesComposerList
              steeringQueuedMessageId={steeringQueuedMessageId}
              deletingQueuedMessageId={deletingQueuedMessageId}
              onDelete={onDeleteQueuedMessage}
              onSteer={onSteerQueuedMessage}
              queuedMessages={queuedMessages}
            />
          ) : null}
          <ChatsDraftImagesPreview
            draftImages={draftImages}
            onRemove={onRemoveDraftImage}
          />
          <div>
            <input
              ref={draftImageFileInputRef}
              accept={CHAT_IMAGE_INPUT_ACCEPT}
              className="hidden"
              multiple
              onChange={onDraftImageInputChange}
              type="file"
            />
            <textarea
              id="chat-draft-message"
              ref={draftTextareaRef}
              className="min-h-[2.25rem] max-h-[15rem] w-full resize-none bg-transparent px-3 pt-2 pb-1.5 text-sm leading-5 outline-none"
              onChange={(event) => {
                onDraftMessageChange(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                  return;
                }
                if (!hasDraftInput) {
                  return;
                }

                event.preventDefault();
                onSubmitDraft();
              }}
              placeholder={selectedSessionHumanQuestion?.allowCustomAnswer
                ? "Type your own answer to the pending question or choose one of the options above."
                : "Ask the agent to summarize a repo, draft a plan, or investigate a problem."}
              rows={CHAT_DRAFT_MIN_LINES}
              value={draftMessage}
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Button
                aria-label="Add images"
                className="h-7 w-7 shrink-0 rounded-full bg-background/60 px-0 text-muted-foreground shadow-none hover:bg-background/80 hover:text-foreground"
                onClick={onOpenDraftImagePicker}
                title="Add JPEG or PNG images"
                type="button"
                variant="ghost"
              >
                <PlusIcon className="size-3.5" />
              </Button>
              {!shouldUseCompactComposerSettings ? (
                <ChatComposerModelPicker
                  modelOptions={[...composerModelOptions]}
                  onModelChange={onModelChange}
                  onReasoningLevelChange={onReasoningLevelChange}
                  reasoningLevel={composerReasoningLevel}
                  selectedModelOptionId={composerModelOptionId}
                />
              ) : null}
              {selectedSession ? (
                <ChatsContextUsageIndicator
                  currentContextTokens={selectedSession.currentContextTokens ?? null}
                  isCompacting={selectedSession.isCompacting}
                  maxContextTokens={selectedSession.maxContextTokens ?? null}
                />
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ChatsThinkingIndicator
                className="flex h-8 items-center"
                visible={selectedSession?.isThinking ?? false}
              />
              {shouldShowQueueComposerAction ? (
                <Button
                  aria-label={queueDraftAriaLabel}
                  className="h-8 rounded-full px-3 text-[10px] font-medium uppercase tracking-[0.14em]"
                  disabled={!canSubmitDraft}
                  onClick={onQueueDraft}
                  title={queueDraftAriaLabel}
                  type="button"
                  variant="outline"
                >
                  Queue
                </Button>
              ) : null}
              <Button
                aria-label={draftSubmitAriaLabel}
                className="h-8 w-8 shrink-0 rounded-full px-0"
                disabled={shouldShowInterruptComposerAction ? !canInterruptSelectedSession : !canSubmitDraft}
                onClick={onSubmitDraft}
                title={draftSubmitAriaLabel}
                type="button"
              >
                {shouldShowInterruptComposerAction ? (
                  <SquareIcon className="size-3.5 fill-current" />
                ) : (
                  <SendHorizonalIcon className="size-3.5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
