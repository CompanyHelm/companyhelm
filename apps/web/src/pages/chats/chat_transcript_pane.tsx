import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, UIEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  GitForkIcon,
  GithubIcon,
  Loader2Icon,
  ListTodoIcon,
  WrenchIcon,
} from "lucide-react";
import { MarkdownContent } from "@/components/markdown_content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OrganizationPath } from "@/lib/organization_path";
import { cn } from "@/lib/utils";
import type { SessionMessageRecord, SessionRecord } from "./chats_page_data";
import {
  type AssistantContentMode,
  type GithubInstallationStartTurnActionRecord,
  type ToolCallSummaryRecord,
  buildToolCallSummaryById,
  buildTranscriptTurns,
  CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS,
  hasVisibleMessage,
  isCommandTool,
  isRunningSession,
  resolveAssistantContentDisplay,
  resolveCommandToolArguments,
  resolveGithubInstallationStartTurnActions,
  resolveImageContentDisplay,
  resolvePrincipalExecutionMessageDisplay,
  resolveSessionTitle,
  resolveTerminalStructuredContent,
  resolveToolCallDisplay,
  resolveToolExecutionDuration,
  sanitizeCommandOutput,
} from "./chats_page_helpers";
import { ChatsPagePreferenceStorage } from "./chats_page_preference_storage";
import { WorkflowRunPresenter } from "./workflow_run_presenter";

const AssistantTranscriptMessage = memo(function AssistantTranscriptMessage({ text }: { text: string }) {
  return <MarkdownContent content={text} />;
});

AssistantTranscriptMessage.displayName = "AssistantTranscriptMessage";

/**
 * Formats persisted transcript timestamps for hover-only display, keeping message rows visually
 * quiet while also keeping the hover popup inside the visible message transcript, away from
 * workflow status chrome that shares the same scroll container.
 */
export class ChatTranscriptTimestampPresenter {
  private static readonly TOP_TOOLTIP_CLEARANCE = 32;
  private static readonly LEFT_TOOLTIP_CLEARANCE = 180;

  static formatMessageTimestamp(timestamp: string): string {
    const value = new Date(timestamp);
    if (Number.isNaN(value.getTime())) {
      return "Unknown time";
    }

    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value);
  }

  static areTooltipBoundariesEqual(
    firstBoundary: ChatTranscriptTimestampTooltipBoundary | null,
    secondBoundary: ChatTranscriptTimestampTooltipBoundary | null,
  ): boolean {
    if (firstBoundary === null || secondBoundary === null) {
      return firstBoundary === secondBoundary;
    }

    return firstBoundary.height === secondBoundary.height
      && firstBoundary.width === secondBoundary.width
      && firstBoundary.x === secondBoundary.x
      && firstBoundary.y === secondBoundary.y;
  }

  static resolveTooltipBoundary(
    viewportRect: DOMRectReadOnly,
    messageListRect: DOMRectReadOnly,
  ): ChatTranscriptTimestampTooltipBoundary | null {
    const left = Math.max(viewportRect.left, messageListRect.left);
    const right = Math.min(viewportRect.right, messageListRect.right);
    const top = Math.max(viewportRect.top, messageListRect.top);
    const bottom = Math.min(viewportRect.bottom, messageListRect.bottom);
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) {
      return null;
    }

    return {
      height,
      width,
      x: left,
      y: top,
    };
  }

  static canShowTooltipForTrigger(options: {
    boundary: ChatTranscriptTimestampTooltipBoundary;
    side: ChatTranscriptTimestampTooltipSide;
    triggerRect: DOMRectReadOnly;
  }): boolean {
    const boundaryBottom = options.boundary.y + options.boundary.height;

    if (options.side === "top") {
      return options.triggerRect.top - options.boundary.y >= ChatTranscriptTimestampPresenter.TOP_TOOLTIP_CLEARANCE
        && options.triggerRect.top <= boundaryBottom;
    }

    const triggerCenterY = options.triggerRect.top + options.triggerRect.height / 2;
    return options.triggerRect.left - options.boundary.x >= ChatTranscriptTimestampPresenter.LEFT_TOOLTIP_CLEARANCE
      && triggerCenterY >= options.boundary.y
      && triggerCenterY <= boundaryBottom;
  }

  /**
   * Lets the tooltip stay uncontrolled while still rejecting opens that would immediately render
   * outside the transcript-safe boundary. Close transitions must always be allowed so Base UI can
   * clean up hover state during scroll, streaming transcript updates, and other layout changes.
   */
  static shouldApplyOpenChange(options: {
    boundary: ChatTranscriptTimestampTooltipBoundary | null;
    open: boolean;
    side: ChatTranscriptTimestampTooltipSide;
    triggerRect: DOMRectReadOnly | null;
  }): boolean {
    if (!options.open) {
      return true;
    }

    if (!options.boundary || !options.triggerRect) {
      return false;
    }

    return ChatTranscriptTimestampPresenter.canShowTooltipForTrigger({
      boundary: options.boundary,
      side: options.side,
      triggerRect: options.triggerRect,
    });
  }
}

const CHAT_TRANSCRIPT_TIMESTAMP_TOOLTIP_COLLISION_AVOIDANCE = {
  align: "shift",
  fallbackAxisSide: "none",
  side: "flip",
} as const;

type ChatTranscriptTimestampTooltipBoundary = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type ChatTranscriptTimestampTooltipSide = "left" | "top";

const GithubInstallationStartTurnAction = memo(function GithubInstallationStartTurnAction(
  { action }: { action: GithubInstallationStartTurnActionRecord },
) {
  const normalizedStatus = action.status.trim().toLowerCase();
  const statusLabel = action.isError
    ? "Unavailable"
    : normalizedStatus === "waiting_for_user"
    ? "Ready"
    : normalizedStatus.replace(/_/g, " ");

  return (
    <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} min-w-0 w-full`}>
      <div className="flex min-w-0 w-full max-w-3xl flex-col gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/30 text-foreground">
            <GithubIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Connect GitHub</p>
              <span className="rounded-md border border-border/70 bg-muted/30 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Install the CompanyHelm GitHub App to connect repositories.
            </p>
          </div>
        </div>
        <Button
          disabled={action.isError}
          render={action.isError ? undefined : <a href={action.installationUrl} />}
          size="sm"
          variant="outline"
        >
          Connect
          <ExternalLinkIcon data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
});

GithubInstallationStartTurnAction.displayName = "GithubInstallationStartTurnAction";

const ToolTranscriptMessage = memo(function ToolTranscriptMessage(
  { message, toolCallSummary }: { message: SessionMessageRecord; toolCallSummary: ToolCallSummaryRecord | null },
) {
  const [isExpanded, setIsExpanded] = useState(false);
  const normalizedStatus = message.status.trim().toLowerCase();
  const executionDurationLabel = normalizedStatus === "running"
    ? null
    : resolveToolExecutionDuration(message);
  const statusLabel = normalizedStatus === "running"
    ? "running"
    : message.isError
    ? "error"
    : "success";
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
    <div className="group min-w-0 w-full max-w-3xl rounded-md px-1.5 py-0 transition-colors hover:bg-muted/20">
      <div className="flex min-h-[22px] items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          {isCommandToolCall ? (
            <span className="flex size-3.5 shrink-0 items-center justify-center rounded bg-muted/30 font-mono text-[10px] font-medium text-muted-foreground">
              $
            </span>
          ) : (
            <span className="flex size-3.5 shrink-0 items-center justify-center rounded bg-muted/30 text-muted-foreground">
              <WrenchIcon className="size-2.5" />
            </span>
          )}
          <div className="flex min-w-0 items-baseline gap-1.5 text-[11px] leading-[14px]">
            <span
              className={isCommandToolCall
                ? "min-w-0 truncate font-mono font-medium text-foreground"
                : "min-w-0 truncate font-medium text-foreground"}
              title={collapsedSummary}
            >
              {collapsedSummary}
            </span>
            <span
              className={cn(
                "shrink-0 text-[10px] font-medium text-muted-foreground/80",
                normalizedStatus === "running" ? "text-muted-foreground" : null,
                message.isError ? "text-destructive" : null,
              )}
            >
              {statusLabel}
            </span>
            {executionDurationLabel ? (
              <span
                className="shrink-0 text-[10px] font-medium text-muted-foreground/70"
                title={`Execution time: ${executionDurationLabel}`}
              >
                {executionDurationLabel}
              </span>
            ) : null}
          </div>
        </div>
        <button
          aria-expanded={isExpanded}
          className="inline-flex shrink-0 items-center rounded p-0 text-muted-foreground/70 opacity-70 transition hover:bg-muted/40 hover:text-foreground hover:opacity-100 group-hover:opacity-100"
          onClick={() => setIsExpanded((value) => !value)}
          type="button"
        >
          <ChevronRightIcon className={`size-2.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
        </button>
      </div>
      {isExpanded ? (
        <div className="mt-1.5 grid gap-1.5 pl-6">
          <div className="overflow-hidden rounded-lg border border-border/50 bg-background/60">
            <div className="border-b border-border/50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Arguments
            </div>
            <pre className="whitespace-pre-wrap break-words px-2.5 py-1.5 font-mono text-xs leading-5 text-foreground [overflow-wrap:anywhere]">
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
                  className="overflow-hidden rounded-lg border border-border/50 bg-background/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5">
                    <code className="text-xs font-medium text-foreground">{terminalStructuredContent.command}</code>
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {terminalStructuredContent.completed
                        ? terminalStructuredContent.exitCode === null
                          ? "Completed"
                          : `Exit ${terminalStructuredContent.exitCode}`
                        : "Running"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-1.5 text-[11px] text-muted-foreground">
                    {commandToolArguments?.workingDirectory ? <span>cwd: {commandToolArguments.workingDirectory}</span> : null}
                    {commandToolYieldTimeMs !== null ? <span>yield: {commandToolYieldTimeMs}ms</span> : null}
                    {!commandToolArguments?.workingDirectory && terminalStructuredContent.cwd
                      ? <span>cwd: {terminalStructuredContent.cwd}</span>
                      : null}
                    <span>session: {terminalStructuredContent.sessionId}</span>
                  </div>
                  <pre className="no-scrollbar max-h-[calc(30*1.5rem)] overflow-y-auto border-t border-border/50 px-3 py-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground [overflow-wrap:anywhere]">
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
                  className="overflow-hidden rounded-lg border border-border/50 bg-background/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-1.5">
                    <code className="text-xs font-medium text-foreground">{commandToolArguments.command}</code>
                    <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {normalizedStatus === "running" ? "Running" : message.isError ? "Error" : "Completed"}
                    </span>
                  </div>
                  {(commandToolArguments.workingDirectory || commandToolYieldTimeMs !== null) ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-1.5 text-[11px] text-muted-foreground">
                      {commandToolArguments.workingDirectory ? <span>cwd: {commandToolArguments.workingDirectory}</span> : null}
                      {commandToolYieldTimeMs !== null ? <span>yield: {commandToolYieldTimeMs}ms</span> : null}
                    </div>
                  ) : null}
                  <pre className="no-scrollbar max-h-[calc(30*1.5rem)] overflow-y-auto border-t border-border/50 px-3 py-2 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground [overflow-wrap:anywhere]">
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
                className="no-scrollbar max-h-[calc(30*1.5rem)] overflow-y-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]"
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
});

ToolTranscriptMessage.displayName = "ToolTranscriptMessage";

const PrincipalExecutionTranscriptMessage = memo(function PrincipalExecutionTranscriptMessage(
  { message, session }: { message: SessionMessageRecord; session: SessionRecord },
) {
  const [isExpanded, setIsExpanded] = useState(false);
  const display = resolvePrincipalExecutionMessageDisplay(message, session);
  if (!display) {
    return null;
  }

  const Icon = display.executionType === "task" ? ListTodoIcon : GitForkIcon;
  const rawInstructions = message.text.trim();

  return (
    <div className="min-w-0 w-full max-w-3xl rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="shrink-0 text-sm font-medium text-foreground">{display.title}</span>
            <span className="truncate text-sm text-foreground" title={display.summaryLabel}>
              {display.summaryLabel}
            </span>
            {display.statusLabel ? (
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                {display.statusLabel}
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
          {display.detailLabel ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>{display.detailLabel}</span>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-background/60">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Instructions
            </div>
            <pre className="no-scrollbar max-h-[calc(30*1.5rem)] overflow-y-auto whitespace-pre-wrap break-words px-3 py-3 font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]">
              {rawInstructions.length > 0 ? rawInstructions : "No instructions were persisted."}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
});

PrincipalExecutionTranscriptMessage.displayName = "PrincipalExecutionTranscriptMessage";

const TranscriptMessageRow = memo(function TranscriptMessageRow({
  assistantContentMode,
  message,
  session,
  timestampTooltipBoundary,
  toolCallSummary,
  useLeftGutter = true,
}: {
  assistantContentMode: AssistantContentMode;
  message: SessionMessageRecord;
  session: SessionRecord;
  timestampTooltipBoundary: ChatTranscriptTimestampTooltipBoundary | null;
  toolCallSummary: ToolCallSummaryRecord | null;
  useLeftGutter?: boolean;
}) {
  const principalExecutionDisplay = resolvePrincipalExecutionMessageDisplay(message, session);
  const isUserMessage = message.role === "user" && principalExecutionDisplay === null;
  const isToolMessage = message.role === "toolResult";
  const userImageContents = isUserMessage ? resolveImageContentDisplay(message) : [];
  const assistantDisplayContents = !isUserMessage && !isToolMessage
    ? resolveAssistantContentDisplay(message, { contentMode: assistantContentMode })
    : [];
  const timestampTooltipSide = isUserMessage ? "left" : "top";
  const timestampTooltipTriggerRef = useRef<HTMLDivElement | null>(null);
  const timestampLabel = ChatTranscriptTimestampPresenter.formatMessageTimestamp(message.createdAt);

  if (!hasVisibleMessage(message, { assistantContentMode })) {
    return null;
  }

  return (
    <div
      data-transcript-message-id={message.id}
      className={`min-w-0 w-full ${isUserMessage ? "flex justify-end" : useLeftGutter ? CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS : ""}`}
    >
      <TooltipProvider delay={500} timeout={0}>
        <Tooltip
          disabled={!timestampTooltipBoundary}
          onOpenChange={(open, eventDetails) => {
            if (!ChatTranscriptTimestampPresenter.shouldApplyOpenChange({
              boundary: timestampTooltipBoundary,
              open,
              side: timestampTooltipSide,
              triggerRect: timestampTooltipTriggerRef.current?.getBoundingClientRect() ?? null,
            })) {
              eventDetails.cancel();
            }
          }}
        >
          <TooltipTrigger
            render={(
              <div
                className={`${
                  isUserMessage
                    ? "min-w-0 max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-right text-primary-foreground"
                    : isToolMessage
                    ? "min-w-0 w-full px-0 py-0 text-foreground"
                    : "min-w-0 w-full px-0 py-0 text-foreground"
                }`}
                ref={timestampTooltipTriggerRef}
              />
            )}
          >
            {isUserMessage ? (
              <div className="grid min-w-0 w-full max-w-full gap-2">
                {message.text.trim().length > 0 ? (
                  <p className="min-w-0 max-w-full whitespace-pre-wrap break-words text-right text-sm [overflow-wrap:anywhere]">
                    {message.text}
                  </p>
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
            ) : principalExecutionDisplay ? (
              <PrincipalExecutionTranscriptMessage message={message} session={session} />
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
          </TooltipTrigger>
          {timestampTooltipBoundary ? (
            <TooltipContent
              className="rounded-sm border border-border/70 bg-popover px-2 py-0.5 text-[10px] font-medium leading-4 text-popover-foreground shadow-sm [&>div:last-child]:bg-popover [&>div:last-child]:fill-popover"
              collisionAvoidance={CHAT_TRANSCRIPT_TIMESTAMP_TOOLTIP_COLLISION_AVOIDANCE}
              collisionBoundary={timestampTooltipBoundary}
              collisionPadding={8}
              side={timestampTooltipSide}
              sideOffset={6}
            >
              <time dateTime={message.createdAt}>{timestampLabel}</time>
            </TooltipContent>
          ) : null}
        </Tooltip>
      </TooltipProvider>
    </div>
  );
});

TranscriptMessageRow.displayName = "TranscriptMessageRow";

const TranscriptTurnSummaryRow = memo(function TranscriptTurnSummaryRow({
  durationLabel,
  hasHiddenMessages,
  isExpanded,
  onToggleHiddenMessages,
}: {
  durationLabel: string;
  hasHiddenMessages: boolean;
  isExpanded: boolean;
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
    </div>
  );
});

TranscriptTurnSummaryRow.displayName = "TranscriptTurnSummaryRow";

const ForkedSessionBanner = memo(function ForkedSessionBanner({
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
});

ForkedSessionBanner.displayName = "ForkedSessionBanner";

const WorkflowRunProgressStrip = memo(function WorkflowRunProgressStrip({
  organizationSlug,
  session,
}: {
  organizationSlug: string;
  session: SessionRecord;
}) {
  const workflowRun = session.associatedWorkflowRun ?? null;
  if (!workflowRun) {
    return null;
  }

  return (
    <WorkflowRunProgressStripContent
      organizationSlug={organizationSlug}
      workflowRun={workflowRun}
    />
  );
});

WorkflowRunProgressStrip.displayName = "WorkflowRunProgressStrip";

const WorkflowRunProgressStripContent = memo(function WorkflowRunProgressStripContent({
  organizationSlug,
  workflowRun,
}: {
  organizationSlug: string;
  workflowRun: NonNullable<SessionRecord["associatedWorkflowRun"]>;
}) {
  const [isExpanded, setIsExpanded] = useState(() => ChatsPagePreferenceStorage.loadWorkflowStatusExpanded());

  useEffect(() => {
    ChatsPagePreferenceStorage.saveWorkflowStatusExpanded(isExpanded);
  }, [isExpanded]);

  const progressLabel = WorkflowRunPresenter.formatProgress(workflowRun);
  const statusLabel = WorkflowRunPresenter.formatStatus(workflowRun.status);
  const currentStep = WorkflowRunPresenter.getCurrentStep(workflowRun);
  const currentStepName = currentStep?.name ?? "No current step";
  const stepListId = `workflow-run-steps-${workflowRun.id}`;
  const visibleSteps = WorkflowRunPresenter.getVisibleSteps(workflowRun);
  const expandedStepListRef = useRef<HTMLOListElement | null>(null);
  const wasExpandedRef = useRef(isExpanded);

  useEffect(() => {
    if (!isExpanded || wasExpandedRef.current) {
      wasExpandedRef.current = isExpanded;
      return;
    }

    const expandedStepList = expandedStepListRef.current;
    const targetStepId = WorkflowRunPresenter.getExpandedScrollTargetStepId(workflowRun);
    if (!expandedStepList || !targetStepId) {
      wasExpandedRef.current = isExpanded;
      return;
    }

    const animationFrameHandle = window.requestAnimationFrame(() => {
      const targetStep = expandedStepList.querySelector<HTMLElement>(`[data-workflow-step-id="${targetStepId}"]`);
      if (!targetStep) {
        return;
      }

      const centeredScrollTop = targetStep.offsetTop - expandedStepList.clientHeight / 2 + targetStep.clientHeight / 2;
      expandedStepList.scrollTo({
        behavior: "smooth",
        top: Math.max(centeredScrollTop, 0),
      });
    });

    wasExpandedRef.current = isExpanded;

    return () => {
      window.cancelAnimationFrame(animationFrameHandle);
    };
  }, [isExpanded, workflowRun]);

  return (
    <div className="border-b border-border/70 bg-background/95 px-3 pt-0 pb-1.5">
      <div
        aria-label="Workflow run progress"
        className="min-w-0"
        role="group"
      >
        <div className="flex min-h-6 min-w-0 items-center gap-2">
          <Button
            aria-controls={stepListId}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse workflow progress" : "Expand workflow progress"}
            className="-ml-1"
            onClick={() => {
              setIsExpanded((currentIsExpanded) => !currentIsExpanded);
            }}
            size="icon-sm"
            title={isExpanded ? "Collapse workflow progress" : "Expand workflow progress"}
            type="button"
            variant="ghost"
          >
            <ChevronRightIcon className={cn("transition-transform", isExpanded ? "rotate-90" : "")} />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Link
              className="inline-flex min-w-[4rem] max-w-[45%] items-center gap-1 truncate text-sm font-semibold text-foreground underline-offset-4 transition hover:text-primary hover:underline"
              params={{
                organizationSlug,
                runId: workflowRun.id,
                workflowId: workflowRun.workflowDefinitionId,
              }}
              title={workflowRun.name}
              to={OrganizationPath.route("/workflows/$workflowId/runs/$runId")}
            >
              <span className="truncate">{workflowRun.name}</span>
              <ExternalLinkIcon aria-hidden="true" className="size-3 shrink-0" />
            </Link>
            <span aria-hidden="true" className="shrink-0 text-xs text-muted-foreground">
              /
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground" title={currentStepName}>
              {currentStepName}
            </span>
          </div>
          <div className="flex h-6 shrink-0 items-center gap-2">
            <Badge
              className="h-5 px-1.5 text-[0.625rem] leading-none"
              variant={WorkflowRunPresenter.resolveRunBadgeVariant(workflowRun.status)}
            >
              {WorkflowRunPresenter.isRunning(workflowRun) ? (
                <Loader2Icon aria-hidden="true" className="animate-spin" data-icon="inline-start" />
              ) : null}
              {statusLabel}
            </Badge>
            <span className="inline-flex h-5 items-center text-xs font-medium leading-none text-muted-foreground">{progressLabel} steps</span>
          </div>
        </div>

        {isExpanded && visibleSteps.length > 0 ? (
          <ol
            aria-label="Workflow steps"
            className="mt-2 grid max-h-52 gap-1 overflow-y-auto pr-1"
            id={stepListId}
            ref={expandedStepListRef}
          >
            {visibleSteps.map((step) => (
              <li
                className="grid min-w-0 grid-cols-[0.75rem_minmax(0,1fr)_auto] items-center gap-2 text-xs"
                data-workflow-step-id={step.id}
                key={step.id}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-3 items-center justify-center rounded-full",
                    step.status === "done"
                      ? "bg-[var(--success-bg)] text-[var(--success)]"
                      : step.status === "running"
                      ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.status === "running" ? (
                    <Loader2Icon className="size-2.5 animate-spin" />
                  ) : (
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        step.status === "done" ? "bg-[var(--success)]" : "bg-muted-foreground/45",
                      )}
                    />
                  )}
                </span>
                <span className="min-w-0 truncate font-medium text-foreground">{step.name}</span>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {step.status}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </div>
  );
});

WorkflowRunProgressStripContent.displayName = "WorkflowRunProgressStripContent";

type ChatTranscriptPaneProps = {
  isTranscriptStuckToBottom: boolean;
  isLoadingOlderMessages: boolean;
  isLoadingTranscript: boolean;
  organizationSlug: string;
  onJumpToLatest: () => void;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  session: SessionRecord;
  sessionMessages: ReadonlyArray<SessionMessageRecord>;
  transcriptScrollRef: MutableRefObject<HTMLDivElement | null>;
};

/**
 * The transcript can contain large markdown trees, so keeping it memoized prevents composer draft
 * keystrokes from remounting historical assistant output when none of the transcript inputs changed.
 */
export function areChatTranscriptPanePropsEqual(previousProps: ChatTranscriptPaneProps, nextProps: ChatTranscriptPaneProps) {
  return previousProps.isTranscriptStuckToBottom === nextProps.isTranscriptStuckToBottom
    && previousProps.isLoadingOlderMessages === nextProps.isLoadingOlderMessages
    && previousProps.isLoadingTranscript === nextProps.isLoadingTranscript
    && previousProps.organizationSlug === nextProps.organizationSlug
    && previousProps.onJumpToLatest === nextProps.onJumpToLatest
    && previousProps.onScroll === nextProps.onScroll
    && previousProps.session === nextProps.session
    && previousProps.sessionMessages === nextProps.sessionMessages
    && previousProps.transcriptScrollRef === nextProps.transcriptScrollRef;
}

function ChatTranscriptPaneComponent({
  isTranscriptStuckToBottom,
  isLoadingOlderMessages,
  isLoadingTranscript,
  organizationSlug,
  onJumpToLatest,
  onScroll,
  session,
  sessionMessages,
  transcriptScrollRef,
}: ChatTranscriptPaneProps) {
  const toolCallSummaryById = useMemo(() => {
    return buildToolCallSummaryById(sessionMessages);
  }, [sessionMessages]);
  const transcriptTurns = useMemo(() => {
    return buildTranscriptTurns(sessionMessages);
  }, [sessionMessages]);
  const [expandedTurnIds, setExpandedTurnIds] = useState<Record<string, boolean>>({});
  const [transcriptViewport, setTranscriptViewport] = useState<HTMLDivElement | null>(null);
  const [transcriptMessageList, setTranscriptMessageList] = useState<HTMLDivElement | null>(null);
  const [timestampTooltipBoundary, setTimestampTooltipBoundary] = useState<ChatTranscriptTimestampTooltipBoundary | null>(null);
  const fallbackTitle = resolveSessionTitle(session, sessionMessages);
  const showTranscriptLoader = isLoadingTranscript || isLoadingOlderMessages;
  const hasVisibleTranscriptContent = transcriptTurns.some((turn) => {
    return turn.inlineMessages.length > 0 || turn.hiddenMessages.length > 0;
  });
  const showJumpToLatestButton = sessionMessages.length > 0 && !isTranscriptStuckToBottom;
  const transcriptViewportClassName = "no-scrollbar flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto pt-3 pr-1 [overflow-anchor:none]";

  useEffect(() => {
    setExpandedTurnIds({});
  }, [session.id]);

  const setTranscriptScrollElement = useCallback((element: HTMLDivElement | null) => {
    transcriptScrollRef.current = element;
    setTranscriptViewport(element);
  }, [transcriptScrollRef]);

  const updateTimestampTooltipBoundary = useCallback(() => {
    const nextBoundary = transcriptViewport && transcriptMessageList
      ? ChatTranscriptTimestampPresenter.resolveTooltipBoundary(
        transcriptViewport.getBoundingClientRect(),
        transcriptMessageList.getBoundingClientRect(),
      )
      : null;

    setTimestampTooltipBoundary((currentBoundary) => (
      ChatTranscriptTimestampPresenter.areTooltipBoundariesEqual(currentBoundary, nextBoundary)
        ? currentBoundary
        : nextBoundary
    ));
  }, [transcriptMessageList, transcriptViewport]);

  useEffect(() => {
    updateTimestampTooltipBoundary();

    if (!transcriptViewport || !transcriptMessageList) {
      return;
    }

    window.addEventListener("resize", updateTimestampTooltipBoundary);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", updateTimestampTooltipBoundary);
      };
    }

    const resizeObserver = new ResizeObserver(updateTimestampTooltipBoundary);
    resizeObserver.observe(transcriptViewport);
    resizeObserver.observe(transcriptMessageList);

    return () => {
      window.removeEventListener("resize", updateTimestampTooltipBoundary);
      resizeObserver.disconnect();
    };
  }, [transcriptMessageList, transcriptViewport, updateTimestampTooltipBoundary]);

  const handleTranscriptScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    onScroll(event);
    updateTimestampTooltipBoundary();
  }, [onScroll, updateTimestampTooltipBoundary]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
      <WorkflowRunProgressStrip organizationSlug={organizationSlug} session={session} />
      <div
        ref={setTranscriptScrollElement}
        className={transcriptViewportClassName}
        onScroll={handleTranscriptScroll}
      >
        <ForkedSessionBanner organizationSlug={organizationSlug} session={session} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!hasVisibleTranscriptContent && !showTranscriptLoader ? (
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
          ) : null}
          {showTranscriptLoader ? (
            <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} flex h-9 shrink-0 items-end pt-2`}>
              <Loader2Icon aria-hidden="true" className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : null}
          <div ref={setTranscriptMessageList} className="grid gap-3">
            {transcriptTurns.map((turn) => {
              if (turn.isRunning) {
                const githubInstallationStartActions = resolveGithubInstallationStartTurnActions(
                  turn.inlineMessages,
                  toolCallSummaryById,
                );

                return (
                  <div key={turn.turnId} className="grid gap-3">
                    {turn.inlineMessages.map((message) => (
                      <TranscriptMessageRow
                        assistantContentMode="all"
                        key={message.id}
                        message={message}
                        session={session}
                        timestampTooltipBoundary={timestampTooltipBoundary}
                        toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                      />
                    ))}
                    {githubInstallationStartActions.map((action) => (
                      <GithubInstallationStartTurnAction action={action} key={action.messageId} />
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
              const githubInstallationStartActions = resolveGithubInstallationStartTurnActions(
                [...turn.inlineMessages, ...turn.hiddenMessages],
                toolCallSummaryById,
              );

              return (
                <div key={turn.turnId} className="grid gap-3">
                  {inlineMessagesBeforeWorkedFor.map((message) => (
                    <TranscriptMessageRow
                      assistantContentMode="text-only"
                      key={message.id}
                      message={message}
                      session={session}
                      timestampTooltipBoundary={timestampTooltipBoundary}
                      toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                    />
                  ))}
                  <TranscriptTurnSummaryRow
                    durationLabel={turn.durationLabel}
                    hasHiddenMessages={hasHiddenMessages}
                    isExpanded={isExpanded}
                    onToggleHiddenMessages={() => {
                      setExpandedTurnIds((currentExpandedTurnIds) => ({
                        ...currentExpandedTurnIds,
                        [turn.turnId]: !currentExpandedTurnIds[turn.turnId],
                      }));
                    }}
                  />
                  {hasHiddenMessages && isExpanded ? (
                    <div className="grid gap-1">
                      {turn.hiddenMessages.map((message) => (
                        <TranscriptMessageRow
                          assistantContentMode="all"
                          key={message.id}
                          message={message}
                          session={session}
                          timestampTooltipBoundary={timestampTooltipBoundary}
                          toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                        />
                      ))}
                      {turn.hiddenThinkingMessages.map((message) => (
                        <TranscriptMessageRow
                          assistantContentMode="thinking-only"
                          key={`${message.id}-thinking`}
                          message={message}
                          session={session}
                          timestampTooltipBoundary={timestampTooltipBoundary}
                          toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                        />
                      ))}
                    </div>
                  ) : null}
                  {inlineMessagesAfterWorkedFor.map((message) => (
                    <TranscriptMessageRow
                      assistantContentMode="text-only"
                      key={message.id}
                      message={message}
                      session={session}
                      timestampTooltipBoundary={timestampTooltipBoundary}
                      toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                    />
                  ))}
                  {githubInstallationStartActions.map((action) => (
                    <GithubInstallationStartTurnAction action={action} key={action.messageId} />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {showJumpToLatestButton ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
          <Button
            aria-label="Jump to latest message"
            className="pointer-events-auto rounded-full border border-border/70 bg-background/95 shadow-lg backdrop-blur"
            onClick={onJumpToLatest}
            size="icon"
            title="Jump to latest message"
            variant="outline"
          >
            <ArrowDownIcon className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export const ChatTranscriptPane = memo(ChatTranscriptPaneComponent, areChatTranscriptPanePropsEqual);

ChatTranscriptPane.displayName = "ChatTranscriptPane";
