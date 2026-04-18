import type { ReactNode } from "react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { Loader2Icon } from "lucide-react";
import { CompanyHelmComputeProvider } from "@/companyhelm_compute_provider";
import { formatProviderLabel as formatModelProviderLabel } from "../model-provider-credentials/provider_label";
import type { ChatComposerModelOption } from "./chat_composer_model_picker";
import type {
  AgentRecord,
  InboxHumanQuestionRecord,
  QueuedMessageRecord,
  SessionMessageContentRecord,
  SessionMessageRecord,
  SessionRecord,
  SessionTranscriptConnection,
} from "./chats_page_data";

export const CHAT_LIST_MIN_WIDTH = 280;
export const CHAT_LIST_MAX_WIDTH = 520;
export const CHAT_LIST_DEFAULT_WIDTH = 352;
export const CHAT_LIST_WIDTH_STORAGE_KEY = "companyhelm.chats.listWidth";
export const CHAT_DRAFT_MIN_LINES = 1;
export const CHAT_DRAFT_MAX_LINES = 10;
export const CHAT_IMAGE_INPUT_ACCEPT = "image/jpeg,image/png";
export const CHAT_TRANSCRIPT_PAGE_SIZE = 50;
export const CHAT_TRANSCRIPT_TOP_LOAD_MIN_THRESHOLD_PX = 240;
export const CHAT_TRANSCRIPT_TOP_LOAD_MAX_THRESHOLD_PX = 480;
export const CHAT_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX = 96;
export const CHAT_LIST_LEFT_GUTTER_CLASS = "pl-3 md:pl-4";
export const CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS = "pl-5 md:pl-6";
export const CHATS_THINKING_GRADIENT_KEYFRAMES = `
@keyframes chats-thinking-gradient {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}
`;

type TerminalStructuredContentRecord = {
  type: "terminal";
  command: string;
  completed: boolean;
  cwd: string | null;
  exitCode: number | null;
  sessionId: string;
};

export type ToolCallSummaryRecord = {
  argumentsValue: SessionMessageContentRecord["arguments"];
  argumentsText: string | null;
  toolName: string | null;
};

export type CommandToolArgumentsRecord = {
  command: string;
  workingDirectory: string | null;
  yieldTimeMs: number | null;
};

type AssistantDisplayContentRecord = {
  text: string;
  type: "text" | "thinking";
};

export type AssistantContentMode = "all" | "text-only" | "thinking-only";

export type TranscriptScrollRestoreRecord = {
  anchorMessageId: string | null;
  anchorOffsetTop: number;
  previousScrollHeight: number;
  previousScrollTop: number;
};

export type TranscriptTurnRecord = {
  durationLabel: string;
  hiddenMessages: SessionMessageRecord[];
  hiddenThinkingMessages: SessionMessageRecord[];
  inlineMessages: SessionMessageRecord[];
  isRunning: boolean;
  turnId: string;
};

export function resolveTranscriptTopLoadThresholdPx(transcriptViewportHeight: number): number {
  const proportionalThreshold = Math.round(transcriptViewportHeight * 0.35);
  return Math.max(
    CHAT_TRANSCRIPT_TOP_LOAD_MIN_THRESHOLD_PX,
    Math.min(CHAT_TRANSCRIPT_TOP_LOAD_MAX_THRESHOLD_PX, proportionalThreshold),
  );
}

const CHAT_TRANSCRIPT_MESSAGE_SELECTOR = "[data-transcript-message-id]";

export function resolveInlineImageDataUrl(image: {
  base64EncodedImage: string;
  mimeType: string;
}): string {
  return `data:${image.mimeType};base64,${image.base64EncodedImage}`;
}

export function hasDraggedFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }
  if (dataTransfer.files.length > 0) {
    return true;
  }
  if (dataTransfer.items.length > 0) {
    return Array.from(dataTransfer.items).some((item) => item.kind === "file");
  }

  return Array.from(dataTransfer.types).includes("Files");
}

export function resolveDraftTextareaHeightBounds(textarea: HTMLTextAreaElement): { maxHeight: number; minHeight: number } {
  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
  const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;

  return {
    maxHeight: lineHeight * CHAT_DRAFT_MAX_LINES + paddingTop + paddingBottom,
    minHeight: lineHeight * CHAT_DRAFT_MIN_LINES + paddingTop + paddingBottom,
  };
}

export function clampChatListWidth(width: number): number {
  return Math.min(CHAT_LIST_MAX_WIDTH, Math.max(CHAT_LIST_MIN_WIDTH, width));
}

function parseTerminalStructuredContent(
  content: Pick<SessionMessageContentRecord, "structuredContent">,
): TerminalStructuredContentRecord | null {
  if (!content.structuredContent || typeof content.structuredContent !== "object") {
    return null;
  }

  const parsedContent = content.structuredContent as Partial<TerminalStructuredContentRecord>;
  if (
    parsedContent.type !== "terminal"
    || typeof parsedContent.command !== "string"
    || typeof parsedContent.completed !== "boolean"
    || typeof parsedContent.sessionId !== "string"
  ) {
    return null;
  }

  return {
    type: "terminal",
    command: parsedContent.command,
    completed: parsedContent.completed,
    cwd: typeof parsedContent.cwd === "string" ? parsedContent.cwd : null,
    exitCode: typeof parsedContent.exitCode === "number" ? parsedContent.exitCode : null,
    sessionId: parsedContent.sessionId,
  };
}

function sanitizeTerminalDisplayOutput(text: string): string {
  let output = text;
  const outputMarker = "output:\n";
  const outputMarkerIndex = output.indexOf(outputMarker);
  if (outputMarkerIndex >= 0) {
    output = output.slice(outputMarkerIndex + outputMarker.length);
  }

  const outputLines = output.split(/\r?\n/u);
  while (outputLines.length > 0) {
    const firstLine = outputLines[0]?.trim() ?? "";
    if (firstLine.length === 0) {
      outputLines.shift();
      continue;
    }
    if (
      firstLine.includes("/tmp/companyhelm/")
      || firstLine.includes(".command.sh")
      || firstLine.includes(".rc")
      || firstLine.includes("rc=$?")
      || firstLine.includes("printf '%s' \"$rc\"")
    ) {
      outputLines.shift();
      continue;
    }
    break;
  }

  return outputLines.join("\n").replace(/(?:\r?\n[ \t]*)+$/u, "");
}

function formatToolArguments(argumentsValue: SessionMessageContentRecord["arguments"]): string | null {
  if (typeof argumentsValue === "undefined" || argumentsValue === null) {
    return null;
  }
  if (typeof argumentsValue === "string") {
    return argumentsValue.trim().length > 0 ? argumentsValue : null;
  }

  try {
    return JSON.stringify(argumentsValue, null, 2);
  } catch {
    return null;
  }
}

function resolveToolDisplayName(toolName: string): string {
  if (toolName === "gh_exec") {
    return "Github";
  }

  return toolName;
}

export function formatComputeProviderLabel(definition: {
  name?: string | null;
  provider: "e2b" | string;
}): string {
  return CompanyHelmComputeProvider.formatProviderLabel(definition);
}

export function formatAgentMeta(agent: Pick<AgentRecord, "modelName" | "modelProvider" | "reasoningLevel">): string {
  const formattedParts = [
    agent.modelProvider ? formatModelProviderLabel(agent.modelProvider) : null,
    typeof agent.modelName === "string" && agent.modelName.trim().length > 0 ? agent.modelName : null,
    typeof agent.reasoningLevel === "string" && agent.reasoningLevel.trim().length > 0 ? agent.reasoningLevel : null,
  ].filter((part): part is string => typeof part === "string" && part.trim().length > 0);

  return formattedParts.length > 0 ? formattedParts.join(" • ") : "No model configured";
}

function parseCommandToolArguments(argumentsValue: SessionMessageContentRecord["arguments"]): CommandToolArgumentsRecord | null {
  if (!argumentsValue || typeof argumentsValue !== "object" || Array.isArray(argumentsValue)) {
    return null;
  }

  const parsedArguments = argumentsValue as Record<string, unknown>;
  if (typeof parsedArguments.command !== "string" || parsedArguments.command.trim().length === 0) {
    return null;
  }

  const workingDirectory = typeof parsedArguments.workingDirectory === "string" && parsedArguments.workingDirectory.trim().length > 0
    ? parsedArguments.workingDirectory
    : null;
  const yieldTimeMs = typeof parsedArguments.yield_time_ms === "number"
    ? parsedArguments.yield_time_ms
    : typeof parsedArguments.yieldTimeMs === "number"
    ? parsedArguments.yieldTimeMs
    : null;

  return {
    command: parsedArguments.command,
    workingDirectory,
    yieldTimeMs,
  };
}

function isCommandToolName(toolName: string | null | undefined): boolean {
  return toolName === "execute_command" || toolName === "bash_exec" || toolName === "pty_exec";
}

export function buildToolCallSummaryById(
  messages: ReadonlyArray<SessionMessageRecord>,
): Map<string, ToolCallSummaryRecord> {
  const summaries = new Map<string, ToolCallSummaryRecord>();
  for (const message of messages) {
    for (const content of message.contents) {
      if (content.type !== "toolCall" || typeof content.toolCallId !== "string" || content.toolCallId.length === 0) {
        continue;
      }

      summaries.set(content.toolCallId, {
        argumentsValue: content.arguments,
        argumentsText: formatToolArguments(content.arguments),
        toolName: typeof content.toolName === "string" ? content.toolName : null,
      });
    }
  }

  return summaries;
}

function resolveAssistantDisplayContents(
  message: SessionMessageRecord,
  options: { contentMode?: AssistantContentMode } = {},
): AssistantDisplayContentRecord[] {
  const contentMode = options.contentMode ?? "all";
  const contentBlocks = message.contents.flatMap((content): AssistantDisplayContentRecord[] => {
    if ((content.type !== "text" && content.type !== "thinking") || typeof content.text !== "string") {
      return [];
    }
    if (content.type === "thinking" && contentMode === "text-only") {
      return [];
    }
    if (content.type === "text" && contentMode === "thinking-only") {
      return [];
    }
    if (content.text.trim().length === 0) {
      return [];
    }

    return [{
      text: content.text,
      type: content.type,
    }];
  });
  if (contentBlocks.length > 0) {
    return contentBlocks;
  }
  if (contentMode === "thinking-only") {
    return [];
  }
  if (typeof message.errorMessage === "string" && message.errorMessage.trim().length > 0) {
    return [{
      text: message.errorMessage,
      type: "text",
    }];
  }
  if (message.text.trim().length === 0) {
    return [];
  }

  return [{
    text: message.text,
    type: "text",
  }];
}

function resolveImageDisplayContents(
  message: SessionMessageRecord,
): Array<{ data: string; mimeType: string }> {
  return message.contents.flatMap((content) => {
    if (content.type !== "image" || !content.data || !content.mimeType) {
      return [];
    }

    return [{
      data: content.data,
      mimeType: content.mimeType,
    }];
  });
}

export function loadChatListWidth(): number {
  if (typeof window === "undefined") {
    return CHAT_LIST_DEFAULT_WIDTH;
  }

  const storedWidth = Number(window.localStorage.getItem(CHAT_LIST_WIDTH_STORAGE_KEY));
  if (!Number.isFinite(storedWidth)) {
    return CHAT_LIST_DEFAULT_WIDTH;
  }

  return clampChatListWidth(storedWidth);
}

export function resolveComposerModelOptionId(
  modelOptions: ReadonlyArray<ChatComposerModelOption>,
  preferredModelProviderCredentialModelId: string | null | undefined,
  preferredModelId: string | null | undefined,
  fallbackModelProviderCredentialModelId: string | null | undefined,
): string {
  if (preferredModelProviderCredentialModelId) {
    const matchedPreferredOption = modelOptions.find((modelOption) => {
      return modelOption.modelProviderCredentialModelId === preferredModelProviderCredentialModelId;
    });
    if (matchedPreferredOption) {
      return matchedPreferredOption.id;
    }
  }
  if (preferredModelId) {
    const matchedModelOption = modelOptions.find((modelOption) => modelOption.modelId === preferredModelId);
    if (matchedModelOption) {
      return matchedModelOption.id;
    }
  }
  if (fallbackModelProviderCredentialModelId) {
    const matchedFallbackOption = modelOptions.find((modelOption) => {
      return modelOption.modelProviderCredentialModelId === fallbackModelProviderCredentialModelId;
    });
    if (matchedFallbackOption) {
      return matchedFallbackOption.id;
    }
  }

  return modelOptions[0]?.id ?? "";
}

export function resolveComposerReasoningLevel(
  modelOption: ChatComposerModelOption | null,
  preferredReasoningLevel: string | null | undefined,
): string {
  const supportedLevels = modelOption?.reasoningLevels ?? [];
  if (supportedLevels.length === 0) {
    return "";
  }
  if (preferredReasoningLevel && supportedLevels.includes(preferredReasoningLevel)) {
    return preferredReasoningLevel;
  }

  return supportedLevels[0] ?? "";
}

export function shouldHydrateComposerSelection(
  previousTargetKey: string | null,
  nextTargetKey: string | null,
  currentModelOptionId: string,
  modelOptionById: ReadonlyMap<string, ChatComposerModelOption>,
): boolean {
  if (nextTargetKey === null) {
    return true;
  }
  if (previousTargetKey !== nextTargetKey) {
    return true;
  }

  return !modelOptionById.has(currentModelOptionId);
}

export function formatSessionTitle(messages: ReadonlyArray<Pick<SessionMessageRecord, "role" | "text">>): string {
  const normalizedMessage = (
    messages.find((message) => message.role === "user" && message.text.trim().length > 0)?.text
    ?? messages.find((message) => message.text.trim().length > 0)?.text
    ?? ""
  ).trim();
  if (normalizedMessage.length === 0) {
    return "Untitled chat";
  }

  const firstLine = normalizedMessage.split(/\r?\n/, 1)[0] ?? normalizedMessage;
  if (firstLine.length <= 72) {
    return firstLine;
  }

  return `${firstLine.slice(0, 69).trimEnd()}...`;
}

export function resolvePersistedSessionTitle(session: Pick<SessionRecord, "inferredTitle" | "userSetTitle">): string | null {
  if (typeof session.userSetTitle === "string" && session.userSetTitle.length > 0) {
    return session.userSetTitle;
  }

  if (typeof session.inferredTitle === "string" && session.inferredTitle.length > 0) {
    return session.inferredTitle;
  }

  return null;
}

export function resolveSessionTitle(
  session: Pick<SessionRecord, "inferredTitle" | "userSetTitle">,
  messages: ReadonlyArray<Pick<SessionMessageRecord, "role" | "text">>,
): string {
  return resolvePersistedSessionTitle(session) ?? formatSessionTitle(messages);
}

function compareSessionMessagesByTimestamp(leftMessage: SessionMessageRecord, rightMessage: SessionMessageRecord): number {
  const leftTimestamp = new Date(leftMessage.createdAt).getTime();
  const rightTimestamp = new Date(rightMessage.createdAt).getTime();
  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return leftMessage.id.localeCompare(rightMessage.id);
}

export function compareQueuedMessagesByTimestamp(leftMessage: QueuedMessageRecord, rightMessage: QueuedMessageRecord): number {
  const leftTimestamp = new Date(leftMessage.createdAt).getTime();
  const rightTimestamp = new Date(rightMessage.createdAt).getTime();
  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return leftMessage.id.localeCompare(rightMessage.id);
}

export function normalizeQueuedMessageStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function resolveQueuedMessagePreview(text: string): string {
  const [firstLine = ""] = text.split(/\r?\n/u);

  return firstLine;
}

export function compareSessionsByLatestActivity(leftSession: SessionRecord, rightSession: SessionRecord): number {
  const leftTimestamp = new Date(leftSession.lastUserMessageAt ?? leftSession.createdAt).getTime();
  const rightTimestamp = new Date(rightSession.lastUserMessageAt ?? rightSession.createdAt).getTime();
  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  const leftCreatedAt = new Date(leftSession.createdAt).getTime();
  const rightCreatedAt = new Date(rightSession.createdAt).getTime();
  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return leftSession.id.localeCompare(rightSession.id);
}

export function compareInboxHumanQuestionsByCreatedAt(leftQuestion: InboxHumanQuestionRecord, rightQuestion: InboxHumanQuestionRecord): number {
  const leftTimestamp = new Date(leftQuestion.createdAt).getTime();
  const rightTimestamp = new Date(rightQuestion.createdAt).getTime();
  if (leftTimestamp !== rightTimestamp) {
    return rightTimestamp - leftTimestamp;
  }

  return leftQuestion.id.localeCompare(rightQuestion.id);
}

function hasVisibleTranscriptMessage(
  message: SessionMessageRecord,
  options: { assistantContentMode?: AssistantContentMode } = {},
): boolean {
  if (message.role === "toolResult") {
    return typeof message.toolName === "string" && message.toolName.trim().length > 0;
  }
  if (message.role === "assistant") {
    return resolveAssistantDisplayContents(message, {
      contentMode: options.assistantContentMode ?? "all",
    }).length > 0;
  }

  return message.role === "user"
    && (message.text.trim().length > 0 || resolveImageDisplayContents(message).length > 0);
}

function formatTurnDuration(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "<1s";
  }

  const totalSeconds = milliseconds / 1000;
  if (totalSeconds < 10) {
    return `${Math.max(0.1, Math.round(totalSeconds * 10) / 10)}s`;
  }
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)}s`;
  }

  const roundedSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;
  if (minutes < 60) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

function resolveToolExecutionDurationLabel(
  message: Pick<SessionMessageRecord, "createdAt" | "updatedAt">,
): string | null {
  const startedAtMilliseconds = new Date(message.createdAt).getTime();
  const endedAtMilliseconds = new Date(message.updatedAt).getTime();
  if (!Number.isFinite(startedAtMilliseconds) || !Number.isFinite(endedAtMilliseconds)) {
    return null;
  }

  return formatTurnDuration(Math.max(0, endedAtMilliseconds - startedAtMilliseconds));
}

export function buildTranscriptTurns(messages: ReadonlyArray<SessionMessageRecord>): TranscriptTurnRecord[] {
  const groupedTurns: Array<{ messages: SessionMessageRecord[]; turnId: string }> = [];

  for (const message of messages) {
    const normalizedTurnId = resolveTurnIdentifier(message);
    const lastGroupedTurn = groupedTurns.at(-1);
    if (!lastGroupedTurn || lastGroupedTurn.turnId !== normalizedTurnId) {
      groupedTurns.push({
        messages: [message],
        turnId: normalizedTurnId,
      });
      continue;
    }

    lastGroupedTurn.messages.push(message);
  }

  return groupedTurns.map(({ messages: turnMessages, turnId }) => {
    const turnRecord = turnMessages.find((message) => message.turn)?.turn ?? null;
    const isRunning = turnRecord?.endedAt == null;
    if (isRunning) {
      return {
        durationLabel: "",
        hiddenMessages: [],
        hiddenThinkingMessages: [],
        inlineMessages: turnMessages.filter((message) => hasVisibleTranscriptMessage(message, { assistantContentMode: "all" })),
        isRunning: true,
        turnId,
      };
    }

    const renderableMessages = turnMessages.filter((message) => hasVisibleTranscriptMessage(message, { assistantContentMode: "all" }));
    const firstUserMessage = renderableMessages.find((message) => message.role === "user") ?? null;
    const lastAssistantMessage = [...renderableMessages]
      .reverse()
      .find((message) => message.role === "assistant" && hasVisibleTranscriptMessage(message, { assistantContentMode: "text-only" }))
      ?? null;
    const inlineMessageIds = new Set(
      [firstUserMessage?.id ?? null, lastAssistantMessage?.id ?? null].filter((messageId): messageId is string => Boolean(messageId)),
    );

    if (inlineMessageIds.size === 0 && renderableMessages.length > 0) {
      inlineMessageIds.add(renderableMessages.at(-1)?.id ?? renderableMessages[0]!.id);
    }

    const turnWindow = resolveTurnWindow(turnMessages);
    const hiddenThinkingMessages = lastAssistantMessage
      && inlineMessageIds.has(lastAssistantMessage.id)
      && hasVisibleTranscriptMessage(lastAssistantMessage, { assistantContentMode: "thinking-only" })
      ? [lastAssistantMessage]
      : [];

    return {
      durationLabel: formatTurnDuration(turnWindow.endedAt - turnWindow.startedAt),
      hiddenMessages: renderableMessages.filter((message) => !inlineMessageIds.has(message.id)),
      hiddenThinkingMessages,
      inlineMessages: renderableMessages.filter((message) => inlineMessageIds.has(message.id)),
      isRunning: false,
      turnId,
    };
  });
}

export function toTranscriptMessagesFromConnection(connection: SessionTranscriptConnection | null | undefined): SessionMessageRecord[] {
  return [...(connection?.edges ?? [])]
    .map((edge) => edge?.node)
    .filter((message): message is SessionMessageRecord => Boolean(message))
    .sort(compareSessionMessagesByTimestamp);
}

function resolveTurnIdentifier(message: Pick<SessionMessageRecord, "turn" | "turnId" | "id">): string {
  if (message.turn && typeof message.turn.id === "string" && message.turn.id.trim().length > 0) {
    return message.turn.id;
  }
  if (message.turnId.trim().length > 0) {
    return message.turnId;
  }

  return message.id;
}

function resolveTurnWindow(
  messages: ReadonlyArray<Pick<SessionMessageRecord, "createdAt" | "turn" | "updatedAt">>,
): { endedAt: number; startedAt: number } {
  const firstTurn = messages.find((message) => message.turn)?.turn ?? null;
  const startedAt = firstTurn ? new Date(firstTurn.startedAt).getTime() : Math.min(...messages.map((message) => new Date(message.createdAt).getTime()));
  const endedAt = firstTurn?.endedAt
    ? new Date(firstTurn.endedAt).getTime()
    : Math.max(...messages.map((message) => new Date(message.updatedAt).getTime()));

  return {
    endedAt,
    startedAt,
  };
}

export function mergeTranscriptMessages(
  existingMessages: ReadonlyArray<SessionMessageRecord>,
  incomingMessages: ReadonlyArray<SessionMessageRecord>,
): SessionMessageRecord[] {
  const nextMessagesById = new Map<string, SessionMessageRecord>();

  for (const message of existingMessages) {
    nextMessagesById.set(message.id, message);
  }
  for (const message of incomingMessages) {
    nextMessagesById.set(message.id, message);
  }

  return [...nextMessagesById.values()].sort(compareSessionMessagesByTimestamp);
}

/**
 * Captures the first visible transcript message before prepending another page so scroll restoration
 * can keep that same message pinned to the same viewport offset after the DOM grows upward.
 */
export function captureTranscriptScrollRestoreRecord(transcriptNode: HTMLDivElement): TranscriptScrollRestoreRecord {
  const transcriptRect = transcriptNode.getBoundingClientRect();
  const transcriptMessageElements = transcriptNode.querySelectorAll<HTMLElement>(CHAT_TRANSCRIPT_MESSAGE_SELECTOR);

  for (const transcriptMessageElement of transcriptMessageElements) {
    const messageRect = transcriptMessageElement.getBoundingClientRect();
    if (messageRect.bottom <= transcriptRect.top) {
      continue;
    }

    return {
      anchorMessageId: transcriptMessageElement.dataset.transcriptMessageId ?? null,
      anchorOffsetTop: messageRect.top - transcriptRect.top,
      previousScrollHeight: transcriptNode.scrollHeight,
      previousScrollTop: transcriptNode.scrollTop,
    };
  }

  return {
    anchorMessageId: null,
    anchorOffsetTop: 0,
    previousScrollHeight: transcriptNode.scrollHeight,
    previousScrollTop: transcriptNode.scrollTop,
  };
}

export function restoreTranscriptScrollPosition(
  transcriptNode: HTMLDivElement,
  restoreRecord: TranscriptScrollRestoreRecord,
) {
  const {
    anchorMessageId,
    anchorOffsetTop,
    previousScrollHeight,
    previousScrollTop,
  } = restoreRecord;
  const anchorElement = anchorMessageId
    ? [...transcriptNode.querySelectorAll<HTMLElement>(CHAT_TRANSCRIPT_MESSAGE_SELECTOR)]
      .find((transcriptMessageElement) => transcriptMessageElement.dataset.transcriptMessageId === anchorMessageId)
    : null;

  if (anchorElement) {
    const transcriptRect = transcriptNode.getBoundingClientRect();
    const anchorRect = anchorElement.getBoundingClientRect();
    transcriptNode.scrollTop += (anchorRect.top - transcriptRect.top) - anchorOffsetTop;
    return;
  }

  const scrollHeightDelta = transcriptNode.scrollHeight - previousScrollHeight;
  transcriptNode.scrollTop = previousScrollTop + scrollHeightDelta;
}

export function resolveSessionTitleOverride(
  session: Pick<SessionRecord, "associatedTask" | "id" | "inferredTitle" | "userSetTitle">,
  titleOverridesBySessionId: Readonly<Record<string, string>>,
): string {
  if (session.associatedTask) {
    return session.associatedTask.name;
  }

  return resolvePersistedSessionTitle(session) ?? titleOverridesBySessionId[session.id] ?? "Untitled chat";
}

export function isArchivedSession(session: Pick<SessionRecord, "status">): boolean {
  return session.status.trim().toLowerCase() === "archived";
}

export function isRunningSession(session: Pick<SessionRecord, "status">): boolean {
  return session.status.trim().toLowerCase() === "running";
}

export function renderSessionListStatusIndicator(
  input: {
    hasOpenHumanQuestion: boolean;
    hasUnread: boolean;
    isSessionRunning: boolean;
  },
): ReactNode {
  if (input.hasOpenHumanQuestion) {
    return (
      <span
        className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[10px] font-semibold leading-none text-amber-600"
        title="Pending human question"
      >
        ?
      </span>
    );
  }

  if (input.isSessionRunning) {
    return (
      <span title="Session running">
        <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" />
      </span>
    );
  }

  if (input.hasUnread) {
    return <span className="size-2 rounded-full bg-blue-500" />;
  }

  return null;
}

export function filterStoreRecords(records: ReadonlyArray<unknown>): Array<{ getDataID(): string }> {
  return records.filter((record): record is { getDataID(): string } => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

export function upsertRootLinkedRecord(
  store: RecordSourceSelectorProxy,
  fieldName: string,
  rootFieldName: string,
  args?: Record<string, unknown>,
): void {
  const rootRecord = store.getRoot();
  const nextRecord = store.getRootField(rootFieldName);
  if (!nextRecord) {
    return;
  }

  const currentRecords = filterStoreRecords(rootRecord.getLinkedRecords(fieldName, args) || []);
  const existingIndex = currentRecords.findIndex((record) => record.getDataID() === nextRecord.getDataID());
  if (existingIndex >= 0) {
    const nextRecords = [...currentRecords];
    nextRecords.splice(existingIndex, 1, nextRecord);
    rootRecord.setLinkedRecords(nextRecords, fieldName, args);
    return;
  }

  rootRecord.setLinkedRecords([...currentRecords, nextRecord], fieldName, args);
}

export function removeRootLinkedRecord(
  store: RecordSourceSelectorProxy,
  fieldName: string,
  rootFieldName: string,
  args?: Record<string, unknown>,
): void {
  const rootRecord = store.getRoot();
  const resolvedRecord = store.getRootField(rootFieldName);
  const resolvedRecordId = resolvedRecord?.getDataID();
  if (!resolvedRecordId) {
    return;
  }

  const currentRecords = filterStoreRecords(rootRecord.getLinkedRecords(fieldName, args) || []);
  rootRecord.setLinkedRecords(
    currentRecords.filter((record) => record.getDataID() !== resolvedRecordId),
    fieldName,
    args,
  );
}

export function resolveAssistantContentDisplay(
  message: SessionMessageRecord,
  options: { contentMode?: AssistantContentMode } = {},
): AssistantDisplayContentRecord[] {
  return resolveAssistantDisplayContents(message, options);
}

export function resolveImageContentDisplay(
  message: SessionMessageRecord,
): Array<{ data: string; mimeType: string }> {
  return resolveImageDisplayContents(message);
}

export function resolveToolCallDisplay(
  toolName: string,
): string {
  return resolveToolDisplayName(toolName);
}

export function resolveCommandToolArguments(
  argumentsValue: SessionMessageContentRecord["arguments"],
): CommandToolArgumentsRecord | null {
  return parseCommandToolArguments(argumentsValue);
}

export function resolveToolExecutionDuration(
  message: Pick<SessionMessageRecord, "createdAt" | "updatedAt">,
): string | null {
  return resolveToolExecutionDurationLabel(message);
}

export function sanitizeCommandOutput(text: string): string {
  return sanitizeTerminalDisplayOutput(text);
}

export function resolveTerminalStructuredContent(
  content: Pick<SessionMessageContentRecord, "structuredContent">,
): TerminalStructuredContentRecord | null {
  return parseTerminalStructuredContent(content);
}

export function isCommandTool(toolName: string | null | undefined): boolean {
  return isCommandToolName(toolName);
}

export function hasVisibleMessage(
  message: SessionMessageRecord,
  options: { assistantContentMode?: AssistantContentMode } = {},
): boolean {
  return hasVisibleTranscriptMessage(message, options);
}
