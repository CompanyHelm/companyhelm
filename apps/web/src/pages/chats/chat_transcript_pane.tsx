import { useEffect, useMemo, useState } from "react";
import type { MutableRefObject, UIEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRightIcon,
  GitForkIcon,
  Loader2Icon,
  WrenchIcon,
} from "lucide-react";
import { MarkdownContent } from "@/components/markdown_content";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import type { SessionMessageRecord, SessionRecord } from "./chats_page_data";
import {
  type AssistantContentMode,
  type ToolCallSummaryRecord,
  buildToolCallSummaryById,
  buildTranscriptTurns,
  CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS,
  hasVisibleMessage,
  isCommandTool,
  isRunningSession,
  resolveAssistantContentDisplay,
  resolveCommandToolArguments,
  resolveImageContentDisplay,
  resolveSessionTitle,
  resolveTerminalStructuredContent,
  resolveToolCallDisplay,
  resolveToolExecutionDuration,
  sanitizeCommandOutput,
} from "./chats_page_helpers";

function AssistantTranscriptMessage({ text }: { text: string }) {
  return <MarkdownContent content={text} />;
}

function ToolTranscriptMessage(
  { message, toolCallSummary }: { message: SessionMessageRecord; toolCallSummary: ToolCallSummaryRecord | null },
) {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedStatus = message.status.trim().toLowerCase();
  const executionDurationLabel = normalizedStatus === "running"
    ? null
    : resolveToolExecutionDuration(message);
  const statusLabel = normalizedStatus === "running"
    ? "Running"
    : message.isError
    ? "Error"
    : "Success";
  const visibleContents = message.contents.filter((content) => {
    if (resolveTerminalStructuredContent(content)) {
      return true;
    }
    if (content.type === "text") {
      return typeof content.text === "string" && content.text.trim().length > 0;
    }
    if (content.type === "image") {
      return typeof content.data === "string" && content.data.length > 0;
    }

    return false;
  });
  const defaultArgumentsText = toolCallSummary?.argumentsText ?? "Arguments unavailable.";
  const defaultToolName = resolveToolCallDisplay(toolCallSummary?.toolName ?? message.toolName ?? "Tool");
  const commandToolArguments = resolveCommandToolArguments(toolCallSummary?.argumentsValue);
  const commandToolYieldTimeMs = commandToolArguments?.yieldTimeMs ?? null;
  const isCommandToolCall = isCommandTool(toolCallSummary?.toolName ?? message.toolName) && commandToolArguments !== null;
  const collapsedSummary = isCommandToolCall ? commandToolArguments.command : defaultToolName;

  return (
    <div className="min-w-0 w-full max-w-3xl rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isCommandToolCall ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/70 font-mono text-xs font-semibold text-foreground">
              $
            </span>
          ) : (
            <WrenchIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className={isCommandToolCall
                ? "truncate font-mono text-sm text-foreground"
                : "truncate text-sm font-medium text-foreground"}
              title={collapsedSummary}
            >
              {collapsedSummary}
            </span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {statusLabel}
            </span>
            {executionDurationLabel ? (
              <span
                className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70"
                title={`Execution time: ${executionDurationLabel}`}
              >
                {executionDurationLabel}
              </span>
            ) : null}
          </div>
        </div>
        <button
          aria-expanded={isExpanded}
          className="inline-flex shrink-0 items-center rounded-md p-1 text-muted-foreground transition hover:bg-background/70 hover:text-foreground"
          onClick={() => setIsExpanded((value) => !value)}
          type="button"
        >
          <ChevronRightIcon className={`size-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </button>
      </div>
      {isExpanded ? (
        <div className="mt-3 grid gap-3">
          <div className="overflow-hidden rounded-xl border border-border/60 bg-background/60">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Arguments
            </div>
            <pre className="whitespace-pre-wrap break-words px-3 py-3 font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]">
              {defaultArgumentsText}
            </pre>
          </div>
          {visibleContents.length > 0 ? visibleContents.map((content, contentIndex) => {
            const terminalStructuredContent = resolveTerminalStructuredContent(content);
            if (terminalStructuredContent) {
              const terminalOutputText = typeof content.text === "string"
                ? sanitizeCommandOutput(content.text)
                : "";
              return (
                <div
                  key={`${message.id}-content-${contentIndex}`}
                  className="overflow-hidden rounded-xl border border-border/60 bg-background/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <code className="text-xs font-medium text-foreground">{terminalStructuredContent.command}</code>
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {terminalStructuredContent.completed
                        ? terminalStructuredContent.exitCode === null
                          ? "Completed"
                          : `Exit ${terminalStructuredContent.exitCode}`
                        : "Running"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[11px] text-muted-foreground">
                    {commandToolArguments?.workingDirectory ? <span>cwd: {commandToolArguments.workingDirectory}</span> : null}
                    {commandToolYieldTimeMs !== null ? <span>yield: {commandToolYieldTimeMs}ms</span> : null}
                    {!commandToolArguments?.workingDirectory && terminalStructuredContent.cwd
                      ? <span>cwd: {terminalStructuredContent.cwd}</span>
                      : null}
                    <span>session: {terminalStructuredContent.sessionId}</span>
                  </div>
                  <pre className="max-h-[calc(30*1.5rem)] overflow-y-auto border-t border-border/60 px-3 py-3 whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]">
                    {terminalOutputText.length > 0
                      ? terminalOutputText
                      : terminalStructuredContent.completed
                      ? "(no output)"
                      : "Waiting for command output..."}
                  </pre>
                </div>
              );
            }

            if (content.type === "image" && content.data && content.mimeType) {
              return (
                <img
                  key={`${message.id}-content-${contentIndex}`}
                  alt={`${message.toolName ?? "tool"} output`}
                  className="max-h-[28rem] max-w-full rounded-xl border border-border/60 object-contain"
                  src={`data:${content.mimeType};base64,${content.data}`}
                />
              );
            }

            if (content.type === "text" && isCommandToolCall) {
              const commandOutputText = sanitizeCommandOutput(content.text ?? "");
              return (
                <div
                  key={`${message.id}-content-${contentIndex}`}
                  className="overflow-hidden rounded-xl border border-border/60 bg-background/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
                    <code className="text-xs font-medium text-foreground">{commandToolArguments.command}</code>
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      {normalizedStatus === "running" ? "Running" : message.isError ? "Error" : "Completed"}
                    </span>
                  </div>
                  {(commandToolArguments.workingDirectory || commandToolYieldTimeMs !== null) ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-[11px] text-muted-foreground">
                      {commandToolArguments.workingDirectory ? <span>cwd: {commandToolArguments.workingDirectory}</span> : null}
                      {commandToolYieldTimeMs !== null ? <span>yield: {commandToolYieldTimeMs}ms</span> : null}
                    </div>
                  ) : null}
                  <pre className="max-h-[calc(30*1.5rem)] overflow-y-auto border-t border-border/60 px-3 py-3 whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]">
                    {commandOutputText.length > 0
                      ? commandOutputText
                      : normalizedStatus === "running"
                      ? "Waiting for command output..."
                      : "(no output)"}
                  </pre>
                </div>
              );
            }

            return (
              <pre
                key={`${message.id}-content-${contentIndex}`}
                className="max-h-[calc(30*1.5rem)] overflow-y-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]"
              >
                {content.text}
              </pre>
            );
          }) : (
            <p className="text-sm text-muted-foreground">
              {normalizedStatus === "running" ? "Waiting for tool output..." : "No tool output."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TranscriptMessageRow({
  assistantContentMode,
  message,
  toolCallSummary,
  useLeftGutter = true,
}: {
  assistantContentMode: AssistantContentMode;
  message: SessionMessageRecord;
  toolCallSummary: ToolCallSummaryRecord | null;
  useLeftGutter?: boolean;
}) {
  if (!hasVisibleMessage(message, { assistantContentMode })) {
    return null;
  }

  const isUserMessage = message.role === "user";
  const isToolMessage = message.role === "toolResult";
  const userImageContents = isUserMessage ? resolveImageContentDisplay(message) : [];
  const assistantDisplayContents = !isUserMessage && !isToolMessage
    ? resolveAssistantContentDisplay(message, { contentMode: assistantContentMode })
    : [];

  return (
    <div
      data-transcript-message-id={message.id}
      className={`min-w-0 w-full ${isUserMessage ? "flex justify-end" : useLeftGutter ? CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS : ""}`}
    >
      <div
        className={`${
          isUserMessage
            ? "min-w-0 w-fit max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-right text-primary-foreground"
            : isToolMessage
            ? "min-w-0 w-full px-0 py-0 text-foreground"
            : "min-w-0 w-full px-0 py-0 text-foreground"
        }`}
      >
        {isUserMessage ? (
          <div className="grid min-w-0 gap-2">
            {message.text.trim().length > 0 ? (
              <p className="whitespace-pre-wrap break-words text-right text-sm [overflow-wrap:anywhere]">{message.text}</p>
            ) : null}
            {userImageContents.length > 0 ? (
              <div className="grid justify-items-end gap-2">
                {userImageContents.map((content, contentIndex) => (
                  <img
                    key={`${message.id}-user-image-${contentIndex}`}
                    alt="Uploaded attachment"
                    className="max-h-[20rem] max-w-full rounded-xl border border-primary-foreground/20 object-contain"
                    src={`data:${content.mimeType};base64,${content.data}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : isToolMessage ? (
          <ToolTranscriptMessage
            message={message}
            toolCallSummary={message.toolCallId ? toolCallSummary : null}
          />
        ) : (
          <div className="grid min-w-0 w-full gap-4 text-left">
            {assistantDisplayContents.map((content, contentIndex) => (
              <div
                key={`${message.id}-assistant-content-${contentIndex}`}
                className={`min-w-0 ${content.type === "thinking" ? "opacity-80" : ""}`}
              >
                <AssistantTranscriptMessage text={content.text} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptTurnSummaryRow({
  durationLabel,
  isForkDisabled,
  hasHiddenMessages,
  isExpanded,
  isForking,
  onFork,
  onToggleHiddenMessages,
}: {
  durationLabel: string;
  isForkDisabled: boolean;
  hasHiddenMessages: boolean;
  isExpanded: boolean;
  isForking: boolean;
  onFork: () => void;
  onToggleHiddenMessages: () => void;
}) {
  return (
    <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} flex min-w-0 items-center justify-between gap-2`}>
      {hasHiddenMessages ? (
        <button
          aria-expanded={isExpanded}
          className="inline-flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
          onClick={onToggleHiddenMessages}
          type="button"
        >
          <ChevronRightIcon className={`size-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          <span className="truncate">Worked for {durationLabel}</span>
        </button>
      ) : (
        <div className="inline-flex min-w-0 items-center rounded-md px-2 py-1 text-xs font-medium text-muted-foreground">
          <span className="truncate">Worked for {durationLabel}</span>
        </div>
      )}
      <Button
        aria-label="Fork from this turn"
        className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
        disabled={isForkDisabled}
        onClick={onFork}
        size="icon"
        title="Fork from this turn"
        type="button"
        variant="ghost"
      >
        {isForking ? <Loader2Icon className="size-3.5 animate-spin" /> : <GitForkIcon className="size-3.5" />}
      </Button>
    </div>
  );
}

function ForkedSessionBanner({
  session,
  organizationSlug,
}: {
  organizationSlug: string;
  session: SessionRecord;
}) {
  if (!session.forkedFromTurnId) {
    return null;
  }

  const sourceSessionTitle = session.forkedFromSessionTitle || "the original session";
  const sourceSessionSearch = session.forkedFromSessionAgentId && session.forkedFromSessionId
    ? {
        agentId: session.forkedFromSessionAgentId,
        sessionId: session.forkedFromSessionId,
      }
    : null;

  return (
    <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} pr-4`}>
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-2.5">
        <div className="flex items-start gap-2">
          <GitForkIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-foreground/70" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Forked conversation</p>
            <p className="mt-1 text-xs/relaxed text-muted-foreground">
              This conversation was forked from{" "}
              {sourceSessionSearch ? (
                <Link
                  className="font-medium text-foreground underline underline-offset-4 transition hover:text-primary"
                  params={{ organizationSlug }}
                  search={sourceSessionSearch}
                  to={OrganizationPath.route("/chats")}
                >
                  {sourceSessionTitle}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{sourceSessionTitle}</span>
              )}
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatTranscriptPane({
  forkingTurnId,
  organizationSlug,
  session,
  sessionMessages,
  transcriptScrollRef,
  isLoadingOlderMessages,
  isLoadingTranscript,
  onForkTurn,
  onScroll,
}: {
  forkingTurnId: string | null;
  organizationSlug: string;
  session: SessionRecord;
  sessionMessages: ReadonlyArray<SessionMessageRecord>;
  transcriptScrollRef: MutableRefObject<HTMLDivElement | null>;
  isLoadingOlderMessages: boolean;
  isLoadingTranscript: boolean;
  onForkTurn: (turnId: string) => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
}) {
  const toolCallSummaryById = useMemo(() => {
    return buildToolCallSummaryById(sessionMessages);
  }, [sessionMessages]);
  const transcriptTurns = useMemo(() => {
    return buildTranscriptTurns(sessionMessages);
  }, [sessionMessages]);
  const [expandedTurnIds, setExpandedTurnIds] = useState<Record<string, boolean>>({});
  const fallbackTitle = resolveSessionTitle(session, sessionMessages);
  const showTranscriptLoader = isLoadingTranscript || isLoadingOlderMessages;
  const hasVisibleTranscriptContent = transcriptTurns.some((turn) => {
    return turn.inlineMessages.length > 0 || turn.hiddenMessages.length > 0;
  });

  useEffect(() => {
    setExpandedTurnIds({});
  }, [session.id]);

  if (!hasVisibleTranscriptContent && !showTranscriptLoader) {
    return (
      <div
        ref={transcriptScrollRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 [overflow-anchor:none]"
        onScroll={onScroll}
      >
        <ForkedSessionBanner organizationSlug={organizationSlug} session={session} />
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-muted/20 px-4 py-10 text-center">
          <div>
            <p className="text-sm font-medium text-foreground">
              {isRunningSession(session) ? "Waiting for transcript..." : "No messages yet"}
            </p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              {isRunningSession(session)
                ? "The session is running, but the user and assistant transcript has not been persisted yet."
                : `No transcript messages have been persisted for ${fallbackTitle}.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={transcriptScrollRef}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 [overflow-anchor:none]"
      onScroll={onScroll}
    >
      <ForkedSessionBanner organizationSlug={organizationSlug} session={session} />
      {showTranscriptLoader ? (
        <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} flex h-9 shrink-0 items-end pt-2`}>
          <Loader2Icon aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
        </div>
      ) : null}
      {transcriptTurns.map((turn) => {
        if (turn.isRunning) {
          return (
            <div key={turn.turnId} className="grid gap-3">
              {turn.inlineMessages.map((message) => (
                <TranscriptMessageRow
                  assistantContentMode="all"
                  key={message.id}
                  message={message}
                  toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                />
              ))}
            </div>
          );
        }

        const hasHiddenMessages = turn.hiddenMessages.length > 0 || turn.hiddenThinkingMessages.length > 0;
        const isExpanded = expandedTurnIds[turn.turnId] === true;
        const assistantInlineIndex = turn.inlineMessages.findIndex((message) => message.role === "assistant");
        const workedForInsertionIndex = assistantInlineIndex >= 0 ? assistantInlineIndex : turn.inlineMessages.length;
        const inlineMessagesBeforeWorkedFor = turn.inlineMessages.slice(0, workedForInsertionIndex);
        const inlineMessagesAfterWorkedFor = turn.inlineMessages.slice(workedForInsertionIndex);

        return (
          <div key={turn.turnId} className="grid gap-3">
            {inlineMessagesBeforeWorkedFor.map((message) => (
              <TranscriptMessageRow
                assistantContentMode="text-only"
                key={message.id}
                message={message}
                toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
              />
            ))}
            <TranscriptTurnSummaryRow
              durationLabel={turn.durationLabel}
              hasHiddenMessages={hasHiddenMessages}
              isExpanded={isExpanded}
              isForkDisabled={forkingTurnId !== null}
              isForking={forkingTurnId === turn.turnId}
              onFork={() => {
                onForkTurn(turn.turnId);
              }}
              onToggleHiddenMessages={() => {
                setExpandedTurnIds((currentExpandedTurnIds) => ({
                  ...currentExpandedTurnIds,
                  [turn.turnId]: !currentExpandedTurnIds[turn.turnId],
                }));
              }}
            />
            {hasHiddenMessages && isExpanded ? (
              <>
                {turn.hiddenMessages.map((message) => (
                  <TranscriptMessageRow
                    assistantContentMode="all"
                    key={message.id}
                    message={message}
                    toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                  />
                ))}
                {turn.hiddenThinkingMessages.map((message) => (
                  <TranscriptMessageRow
                    assistantContentMode="thinking-only"
                    key={`${message.id}-thinking`}
                    message={message}
                    toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                  />
                ))}
              </>
            ) : null}
            {inlineMessagesAfterWorkedFor.map((message) => (
              <TranscriptMessageRow
                assistantContentMode="text-only"
                key={message.id}
                message={message}
                toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
