import { StrictMode, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ChatComposerPane } from "./chat_composer_pane";
import { ChatTranscriptPane } from "./chat_transcript_pane";
import type { ChatComposerModelOption } from "./chat_composer_model_picker";
import type { SessionMessageRecord, SessionRecord } from "./chats_page_data";
import "@/index.css";

function buildAssistantMarkdown(label: string) {
  return Array.from({ length: 120 }, (_, index) => {
    return `- ${label} item ${index + 1} explains how transcript rendering can slow chat typing.`;
  }).join("\n");
}

function buildMessage(id: string, text: string, createdAt: string) {
  return {
    contents: [{ data: null, mimeType: null, text, type: "text" }],
    createdAt,
    errorMessage: null,
    id,
    isError: false,
    role: "assistant",
    status: "completed",
    text,
    toolCallId: null,
    toolName: null,
    turn: {
      endedAt: createdAt,
      id: `${id}-turn`,
      startedAt: createdAt,
    },
    turnId: `${id}-turn`,
    updatedAt: createdAt,
  } as unknown as SessionMessageRecord;
}

function buildSessionMessages(variant: "short" | "long") {
  const shortMessages = [buildMessage("assistant-ready", "READY", "2026-04-21T00:00:00.000Z")];

  if (variant === "short") {
    return shortMessages;
  }

  return [
    ...shortMessages,
    buildMessage("assistant-ok", "OK", "2026-04-21T00:00:01.000Z"),
    buildMessage("assistant-diagnosis", buildAssistantMarkdown("Diagnosis"), "2026-04-21T00:00:02.000Z"),
    buildMessage("assistant-render", buildAssistantMarkdown("Render"), "2026-04-21T00:00:03.000Z"),
    buildMessage("assistant-devtools", buildAssistantMarkdown("Devtools"), "2026-04-21T00:00:04.000Z"),
    buildMessage("assistant-transcript", buildAssistantMarkdown("Transcript"), "2026-04-21T00:00:05.000Z"),
  ];
}

function buildSession() {
  return {
    agentId: "agent-1",
    currentContextTokens: 1024,
    forkedFromSessionAgentId: null,
    forkedFromSessionId: null,
    forkedFromSessionTitle: null,
    forkedFromTurnId: null,
    id: "session-1",
    inferredTitle: "Performance Harness",
    isCompacting: false,
    isThinking: false,
    maxContextTokens: 64000,
    status: "completed",
    updatedAt: "2026-04-21T00:00:05.000Z",
    userSetTitle: null,
  } as unknown as SessionRecord;
}

function buildModelOptions() {
  return [{
    description: "Synthetic model for local transcript typing measurements.",
    id: "model-1",
    modelId: "gpt-5.4",
    modelProviderCredentialModelId: "credential-model-1",
    name: "GPT-5.4",
    providerLabel: "Perf Harness",
    reasoningLevels: ["low", "medium", "high"],
    reasoningSupported: true,
  }] satisfies ChatComposerModelOption[];
}

function ChatPerformanceHarness() {
  const searchParams = new URLSearchParams(window.location.search);
  const initialVariant = searchParams.get("variant") === "short" ? "short" : "long";
  const [variant, setVariant] = useState<"short" | "long">(initialVariant);
  const [draftMessage, setDraftMessage] = useState("");
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const draftImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const session = useMemo(() => buildSession(), []);
  const modelOptions = useMemo(() => buildModelOptions(), []);
  const sessionMessages = useMemo(() => buildSessionMessages(variant), [variant]);

  return (
    <main className="min-h-screen bg-background px-6 py-6 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <header className="rounded-2xl border border-border/60 bg-card px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">Chat transcript performance harness</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Uses the production chat transcript and composer components with synthetic data so local Playwright runs can compare short and long transcript typing latency.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 p-1">
              <button
                className={`rounded-full px-3 py-1.5 text-sm ${variant === "short" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => setVariant("short")}
                type="button"
              >
                Short transcript
              </button>
              <button
                className={`rounded-full px-3 py-1.5 text-sm ${variant === "long" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                onClick={() => setVariant("long")}
                type="button"
              >
                Long transcript
              </button>
            </div>
          </div>
        </header>

        <section className="grid min-h-[80vh] gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex min-h-0 flex-col rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <ChatTranscriptPane
              isLoadingOlderMessages={false}
              isLoadingTranscript={false}
              isTranscriptStuckToBottom={true}
              onJumpToLatest={() => {
                transcriptScrollRef.current?.scrollTo({ top: transcriptScrollRef.current.scrollHeight });
              }}
              onScroll={() => {}}
              organizationSlug="test-org"
              session={session}
              sessionMessages={sessionMessages}
              transcriptScrollRef={transcriptScrollRef}
            />
          </div>

          <div className="flex min-h-0 flex-col rounded-3xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Harness details</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Variant</dt>
                  <dd data-testid="harness-variant" className="font-medium text-foreground">{variant}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Assistant blocks</dt>
                  <dd data-testid="harness-message-count" className="font-medium text-foreground">{sessionMessages.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Draft length</dt>
                  <dd data-testid="harness-draft-length" className="font-medium text-foreground">{draftMessage.length}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-auto">
              <ChatComposerPane
                canInterruptSelectedSession={false}
                canSubmitDraft={draftMessage.trim().length > 0}
                composerModelOptionId={modelOptions[0].id}
                composerModelOptions={modelOptions}
                composerReasoningLevel="high"
                deletingQueuedMessageId={null}
                draftImageFileInputRef={draftImageFileInputRef}
                draftImages={[]}
                draftMessage={draftMessage}
                draftSubmitAriaLabel="Send message"
                draftTextareaRef={draftTextareaRef}
                hasDraftInput={draftMessage.trim().length > 0}
                isComposerDragActive={false}
                isDismissInboxHumanQuestionInFlight={false}
                isForkingLatestSession={false}
                isResolveInboxHumanQuestionInFlight={false}
                onComposerDragEnter={() => {}}
                onComposerDragLeave={() => {}}
                onComposerDragOver={() => {}}
                onComposerDrop={() => {}}
                onDeleteQueuedMessage={() => {}}
                onDismissHumanQuestion={() => {}}
                onDraftImageInputChange={() => {}}
                onDraftMessageChange={setDraftMessage}
                onForkLatestSession={() => {}}
                onModelChange={() => {}}
                onOpenDraftImagePicker={() => {}}
                onQueueDraft={() => {}}
                onReasoningLevelChange={() => {}}
                onRemoveDraftImage={() => {}}
                onResolveHumanQuestion={() => {}}
                onStartDraftTextareaResize={() => {}}
                onSteerQueuedMessage={() => {}}
                onSubmitDraft={() => {}}
                queueDraftAriaLabel="Queue message"
                queuedMessages={[]}
                selectedSession={session}
                selectedSessionHumanQuestion={null}
                shouldShowInterruptComposerAction={false}
                shouldShowQueueComposerAction={false}
                shouldUseCompactComposerSettings={true}
                steeringQueuedMessageId={null}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Expected #root element for chat performance harness.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ChatPerformanceHarness />
  </StrictMode>,
);
