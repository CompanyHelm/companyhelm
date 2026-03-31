import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, PointerEvent as ReactPointerEvent, UIEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArchiveIcon,
  ChevronRightIcon,
  Loader2Icon,
  MessageSquareIcon,
  PlusIcon,
  SendHorizonalIcon,
  Settings2Icon,
  Trash2Icon,
  WrenchIcon,
  XIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { fetchQuery, graphql, requestSubscription, useLazyLoadQuery, useMutation, useRelayEnvironment } from "react-relay";
import { useApplicationHeader } from "@/components/layout/application_breadcrumb_context";
import { useGraphqlSubscriptionConnectionStatus } from "@/components/relay_environment_provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChatComposerModelPicker, type ChatComposerModelOption } from "./chat_composer_model_picker";
import { ChatsContextUsageIndicator } from "./context_usage_indicator";
import type { chatsPageArchiveSessionMutation } from "./__generated__/chatsPageArchiveSessionMutation.graphql";
import type { chatsPageCreateSessionMutation } from "./__generated__/chatsPageCreateSessionMutation.graphql";
import type { chatsPageMarkSessionReadMutation } from "./__generated__/chatsPageMarkSessionReadMutation.graphql";
import type { chatsPagePromptSessionMutation } from "./__generated__/chatsPagePromptSessionMutation.graphql";
import type { chatsPageQueuedMessagesQuery } from "./__generated__/chatsPageQueuedMessagesQuery.graphql";
import type { chatsPageQuery } from "./__generated__/chatsPageQuery.graphql";
import type { chatsPageDeleteSessionQueuedMessageMutation } from "./__generated__/chatsPageDeleteSessionQueuedMessageMutation.graphql";
import type { chatsPageSessionEnvironmentQuery } from "./__generated__/chatsPageSessionEnvironmentQuery.graphql";
import type { chatsPageSessionMessageUpdatedSubscription } from "./__generated__/chatsPageSessionMessageUpdatedSubscription.graphql";
import type { chatsPageSessionQueuedMessagesUpdatedSubscription } from "./__generated__/chatsPageSessionQueuedMessagesUpdatedSubscription.graphql";
import type { chatsPageSessionUpdatedSubscription } from "./__generated__/chatsPageSessionUpdatedSubscription.graphql";
import type { chatsPageTranscriptQuery } from "./__generated__/chatsPageTranscriptQuery.graphql";

const chatsPageQueryNode = graphql`
  query chatsPageQuery {
    Agents {
      id
      name
      modelProviderCredentialId
      modelProviderCredentialModelId
      modelProvider
      modelName
      reasoningLevel
    }
    AgentCreateOptions {
      id
      label
      modelProvider
      defaultModelId
      defaultReasoningLevel
      models {
        id
        modelId
        name
        description
        reasoningLevels
      }
    }
    Sessions {
      id
      agentId
      hasUnread
      currentContextTokens
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

const chatsPageTranscriptQueryNode = graphql`
  query chatsPageTranscriptQuery($sessionId: ID!, $first: Int!, $after: String) {
    SessionTranscriptMessages(sessionId: $sessionId, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          sessionId
          turnId
          turn {
            id
            sessionId
            startedAt
            endedAt
          }
          role
          status
          toolCallId
          toolName
          contents {
            type
            text
            data
            mimeType
            structuredContent
            arguments
            toolCallId
            toolName
          }
          text
          isError
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const chatsPageQueuedMessagesQueryNode = graphql`
  query chatsPageQueuedMessagesQuery($sessionId: ID!) {
    SessionQueuedMessages(sessionId: $sessionId) {
      id
      sessionId
      text
      shouldSteer
      status
      createdAt
      updatedAt
    }
  }
`;

const chatsPageSessionEnvironmentQueryNode = graphql`
  query chatsPageSessionEnvironmentQuery($sessionId: ID!) {
    SessionEnvironment(sessionId: $sessionId) {
      currentEnvironment {
        id
        displayName
        provider
        providerDefinitionName
        providerEnvironmentId
        status
        platform
        cpuCount
        memoryGb
        diskSpaceGb
      }
      agentDefaultComputeProviderDefinition {
        id
        name
        provider
      }
    }
  }
`;

const chatsPageDeleteSessionQueuedMessageMutationNode = graphql`
  mutation chatsPageDeleteSessionQueuedMessageMutation($input: DeleteSessionQueuedMessageInput!) {
    DeleteSessionQueuedMessage(input: $input) {
      id
      sessionId
      text
      shouldSteer
      status
      createdAt
      updatedAt
    }
  }
`;

const chatsPageCreateSessionMutationNode = graphql`
  mutation chatsPageCreateSessionMutation($input: CreateSessionInput!) {
    CreateSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

const chatsPageArchiveSessionMutationNode = graphql`
  mutation chatsPageArchiveSessionMutation($input: ArchiveSessionInput!) {
    ArchiveSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      isThinking
      status
      thinkingText
      createdAt
      updatedAt
    }
  }
`;

const chatsPagePromptSessionMutationNode = graphql`
  mutation chatsPagePromptSessionMutation($input: PromptSessionInput!) {
    PromptSession(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

const chatsPageMarkSessionReadMutationNode = graphql`
  mutation chatsPageMarkSessionReadMutation($input: MarkSessionReadInput!) {
    MarkSessionRead(input: $input) {
      id
      agentId
      hasUnread
      currentContextTokens
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

const chatsPageSessionUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionUpdatedSubscription {
    SessionUpdated {
      id
      agentId
      hasUnread
      currentContextTokens
      isCompacting
      maxContextTokens
      modelProviderCredentialModelId
      modelId
      reasoningLevel
      inferredTitle
      isThinking
      status
      thinkingText
      createdAt
      updatedAt
      userSetTitle
    }
  }
`;

const chatsPageSessionQueuedMessagesUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionQueuedMessagesUpdatedSubscription($sessionId: ID!) {
    SessionQueuedMessagesUpdated(sessionId: $sessionId) {
      id
      sessionId
      text
      shouldSteer
      status
      createdAt
      updatedAt
    }
  }
`;

const chatsPageSessionMessageUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionMessageUpdatedSubscription($sessionId: ID!) {
    SessionMessageUpdated(sessionId: $sessionId) {
      id
      sessionId
      turnId
      turn {
        id
        sessionId
        startedAt
        endedAt
      }
      role
      status
      toolCallId
      toolName
      contents {
        type
        text
        data
        mimeType
        structuredContent
        arguments
        toolCallId
        toolName
      }
      text
      isError
      createdAt
      updatedAt
    }
  }
`;

type AgentRecord = chatsPageQuery["response"]["Agents"][number];
type ProviderOptionRecord = chatsPageQuery["response"]["AgentCreateOptions"][number];
type QueuedMessageRecord = chatsPageQueuedMessagesQuery["response"]["SessionQueuedMessages"][number];
type SessionRecord = chatsPageQuery["response"]["Sessions"][number];
type SessionTranscriptConnection = chatsPageTranscriptQuery["response"]["SessionTranscriptMessages"];
type SessionTranscriptEdgeRecord = SessionTranscriptConnection["edges"][number];
type SessionMessageRecord = SessionTranscriptEdgeRecord["node"];
type SessionMessageContentRecord = SessionMessageRecord["contents"][number];
type SessionEnvironmentInfoRecord = chatsPageSessionEnvironmentQuery["response"]["SessionEnvironment"];
type ChatsPageSearch = {
  agentId?: string;
  sessionId?: string;
};

const CHAT_LIST_MIN_WIDTH = 280;
const CHAT_LIST_MAX_WIDTH = 520;
const CHAT_LIST_DEFAULT_WIDTH = 352;
const CHAT_LIST_WIDTH_STORAGE_KEY = "companyhelm.chats.listWidth";
const CHAT_DRAFT_MIN_LINES = 3;
const CHAT_DRAFT_MAX_LINES = 10;
const CHAT_TRANSCRIPT_PAGE_SIZE = 50;
const CHAT_TRANSCRIPT_TOP_LOAD_THRESHOLD_PX = 96;
const CHAT_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX = 96;
const CHAT_LIST_LEFT_GUTTER_CLASS = "pl-3 md:pl-4";
const CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS = "pl-5 md:pl-6";
const CHATS_THINKING_GRADIENT_KEYFRAMES = `
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

type ToolCallSummaryRecord = {
  argumentsValue: SessionMessageContentRecord["arguments"];
  argumentsText: string | null;
  toolName: string | null;
};

type CommandToolArgumentsRecord = {
  command: string;
  workingDirectory: string | null;
  yieldTimeMs: number | null;
};

type AssistantDisplayContentRecord = {
  text: string;
  type: "text" | "thinking";
};

type TranscriptScrollRestoreRecord = {
  anchorMessageId: string | null;
  anchorOffsetTop: number;
  previousScrollHeight: number;
  previousScrollTop: number;
};

type TranscriptTurnRecord = {
  durationLabel: string;
  hiddenMessages: SessionMessageRecord[];
  inlineMessages: SessionMessageRecord[];
  isRunning: boolean;
  turnId: string;
};

const CHAT_TRANSCRIPT_MESSAGE_SELECTOR = "[data-transcript-message-id]";

function resolveDraftTextareaHeightBounds(textarea: HTMLTextAreaElement): { maxHeight: number; minHeight: number } {
  const computedStyle = window.getComputedStyle(textarea);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
  const paddingTop = Number.parseFloat(computedStyle.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(computedStyle.paddingBottom) || 0;

  return {
    maxHeight: lineHeight * CHAT_DRAFT_MAX_LINES + paddingTop + paddingBottom,
    minHeight: lineHeight * CHAT_DRAFT_MIN_LINES + paddingTop + paddingBottom,
  };
}

function clampChatListWidth(width: number): number {
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

function formatComputeProviderLabel(provider: "daytona" | "e2b" | string): string {
  return provider === "e2b" ? "E2B" : provider === "daytona" ? "Daytona" : provider;
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

function buildToolCallSummaryById(
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
  options: { includeThinking?: boolean } = {},
): AssistantDisplayContentRecord[] {
  const includeThinking = options.includeThinking ?? true;
  const contentBlocks = message.contents.flatMap((content): AssistantDisplayContentRecord[] => {
    if ((content.type !== "text" && content.type !== "thinking") || typeof content.text !== "string") {
      return [];
    }
    if (content.type === "thinking" && !includeThinking) {
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
  if (message.text.trim().length === 0) {
    return [];
  }

  return [{
    text: message.text,
    type: "text",
  }];
}

function loadChatListWidth(): number {
  if (typeof window === "undefined") {
    return CHAT_LIST_DEFAULT_WIDTH;
  }

  const storedWidth = Number(window.localStorage.getItem(CHAT_LIST_WIDTH_STORAGE_KEY));
  if (!Number.isFinite(storedWidth)) {
    return CHAT_LIST_DEFAULT_WIDTH;
  }

  return clampChatListWidth(storedWidth);
}

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatAgentMeta(agent: Pick<AgentRecord, "modelProvider" | "modelName" | "reasoningLevel">): string {
  const segments = [agent.modelProvider, agent.modelName, agent.reasoningLevel].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return segments.length > 0 ? segments.join(" • ") : "No default model configured";
}

function resolveComposerModelOptionId(
  modelOptions: ReadonlyArray<ChatComposerModelOption>,
  preferredModelOptionId: string | null | undefined,
  preferredModelId: string | null | undefined,
  fallbackModelOptionId: string | null | undefined,
): string {
  if (preferredModelOptionId && modelOptions.some((modelOption) => modelOption.id === preferredModelOptionId)) {
    return preferredModelOptionId;
  }
  if (preferredModelId) {
    const matchedModelOption = modelOptions.find((modelOption) => modelOption.modelId === preferredModelId);
    if (matchedModelOption) {
      return matchedModelOption.id;
    }
  }
  if (fallbackModelOptionId && modelOptions.some((modelOption) => modelOption.id === fallbackModelOptionId)) {
    return fallbackModelOptionId;
  }

  return modelOptions[0]?.id ?? "";
}

function resolveComposerReasoningLevel(
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

function formatSessionTitle(messages: ReadonlyArray<Pick<SessionMessageRecord, "role" | "text">>): string {
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

function resolvePersistedSessionTitle(session: Pick<SessionRecord, "inferredTitle" | "userSetTitle">): string | null {
  if (typeof session.inferredTitle === "string" && session.inferredTitle.length > 0) {
    return session.inferredTitle;
  }

  if (typeof session.userSetTitle === "string" && session.userSetTitle.length > 0) {
    return session.userSetTitle;
  }

  return null;
}

function resolveSessionTitle(
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

function compareQueuedMessagesByTimestamp(leftMessage: QueuedMessageRecord, rightMessage: QueuedMessageRecord): number {
  const leftTimestamp = new Date(leftMessage.createdAt).getTime();
  const rightTimestamp = new Date(rightMessage.createdAt).getTime();
  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp - rightTimestamp;
  }

  return leftMessage.id.localeCompare(rightMessage.id);
}

function hasVisibleTranscriptMessage(
  message: SessionMessageRecord,
  options: { includeThinking?: boolean } = {},
): boolean {
  if (message.role === "toolResult") {
    return typeof message.toolName === "string" && message.toolName.trim().length > 0;
  }
  if (message.role === "assistant") {
    return resolveAssistantDisplayContents(message, options).length > 0;
  }

  return message.role === "user" && message.text.trim().length > 0;
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

function buildTranscriptTurns(
  messages: ReadonlyArray<SessionMessageRecord>,
  session: Pick<SessionRecord, "status">,
): TranscriptTurnRecord[] {
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

  const runningTurnId = isRunningSession(session)
    ? [...groupedTurns]
      .reverse()
      .find(({ messages: turnMessages }) => turnMessages.some((message) => message.status === "running"))
      ?.turnId ?? null
    : null;
  return groupedTurns.map(({ messages: turnMessages, turnId }) => {
    const isRunning = runningTurnId === turnId;
    if (isRunning) {
      return {
        durationLabel: "",
        hiddenMessages: [],
        inlineMessages: turnMessages.filter((message) => hasVisibleTranscriptMessage(message, { includeThinking: true })),
        isRunning: true,
        turnId,
      };
    }

    const renderableMessages = turnMessages.filter((message) => hasVisibleTranscriptMessage(message, { includeThinking: true }));
    const firstUserMessage = renderableMessages.find((message) => message.role === "user") ?? null;
    const lastAssistantMessage = [...renderableMessages]
      .reverse()
      .find((message) => message.role === "assistant" && hasVisibleTranscriptMessage(message, { includeThinking: false }))
      ?? null;
    const inlineMessageIds = new Set(
      [firstUserMessage?.id ?? null, lastAssistantMessage?.id ?? null].filter((messageId): messageId is string => Boolean(messageId)),
    );

    if (inlineMessageIds.size === 0 && renderableMessages.length > 0) {
      inlineMessageIds.add(renderableMessages.at(-1)?.id ?? renderableMessages[0]!.id);
    }

    const turnWindow = resolveTurnWindow(turnMessages);

    return {
      durationLabel: formatTurnDuration(turnWindow.endedAt - turnWindow.startedAt),
      hiddenMessages: renderableMessages.filter((message) => !inlineMessageIds.has(message.id)),
      inlineMessages: renderableMessages.filter((message) => inlineMessageIds.has(message.id)),
      isRunning: false,
      turnId,
    };
  });
}

function toTranscriptMessagesFromConnection(connection: SessionTranscriptConnection | null | undefined): SessionMessageRecord[] {
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

function mergeTranscriptMessages(
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
function captureTranscriptScrollRestoreRecord(transcriptNode: HTMLDivElement): TranscriptScrollRestoreRecord {
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

function restoreTranscriptScrollPosition(
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

function resolveSessionTitleOverride(
  session: Pick<SessionRecord, "id" | "inferredTitle" | "userSetTitle">,
  titleOverridesBySessionId: Readonly<Record<string, string>>,
): string {
  return resolvePersistedSessionTitle(session) ?? titleOverridesBySessionId[session.id] ?? "Untitled chat";
}

function isArchivedSession(session: Pick<SessionRecord, "status">): boolean {
  return session.status.trim().toLowerCase() === "archived";
}

function isRunningSession(session: Pick<SessionRecord, "status">): boolean {
  return session.status.trim().toLowerCase() === "running";
}

function filterStoreRecords(records: ReadonlyArray<unknown>): Array<{ getDataID(): string }> {
  return records.filter((record): record is { getDataID(): string } => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function upsertRootLinkedRecord(
  store: {
    getRoot(): {
      getLinkedRecords(name: string, args?: Record<string, unknown>): ReadonlyArray<unknown> | null;
      setLinkedRecords(
        records: ReadonlyArray<{ getDataID(): string }>,
        name: string,
        args?: Record<string, unknown>,
      ): void;
    };
    getRootField(name: string): { getDataID(): string } | null;
  },
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

function ChatsPageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <Card className="rounded-2xl border-0 bg-transparent shadow-none ring-0 lg:w-[22rem] lg:shrink-0">
        <CardHeader className={`${CHAT_LIST_LEFT_GUTTER_CLASS} pr-3 md:pr-3`}>
          <CardTitle>Chats</CardTitle>
          <CardDescription>Loading agents and sessions…</CardDescription>
        </CardHeader>
        <CardContent className={`${CHAT_LIST_LEFT_GUTTER_CLASS} pr-3 md:pr-3`}>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading chats…
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col rounded-2xl border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="px-2 md:px-3">
          <CardTitle>Chat</CardTitle>
          <CardDescription>Loading selected chat…</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function AssistantTranscriptMessage({ text }: { text: string }) {
  return (
    <div className="min-w-0 w-full">
      <ReactMarkdown
        components={{
          a: ({ children, ...anchorProps }) => (
            <a
              {...anchorProps}
              className="font-medium text-foreground underline underline-offset-4"
              rel="noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="min-w-0 border-l-2 border-border/70 pl-4 text-muted-foreground [overflow-wrap:anywhere]">
              {children}
            </blockquote>
          ),
          code: ({ children, className, ...codeProps }) => (
            <code
              {...codeProps}
              className={[
                className,
                "max-w-full break-words [overflow-wrap:anywhere]",
                "rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground",
              ].filter(Boolean).join(" ")}
            >
              {children}
            </code>
          ),
          h1: ({ children }) => <h1 className="min-w-0 text-lg font-semibold text-foreground">{children}</h1>,
          h2: ({ children }) => <h2 className="min-w-0 text-base font-semibold text-foreground">{children}</h2>,
          h3: ({ children }) => <h3 className="min-w-0 text-sm font-semibold text-foreground">{children}</h3>,
          li: ({ children }) => <li className="min-w-0 pl-1">{children}</li>,
          ol: ({ children }) => <ol className="ml-5 grid min-w-0 list-decimal gap-2">{children}</ol>,
          p: ({ children }) => (
            <p className="min-w-0 text-sm leading-7 text-pretty text-foreground break-words [overflow-wrap:anywhere]">
              {children}
            </p>
          ),
          pre: ({ children }) => (
            <pre className="my-1 w-full max-w-full overflow-x-auto overflow-y-hidden rounded-xl border border-border/60 bg-muted/30 px-4 py-3 font-mono text-[13px] leading-6 text-foreground [&>code]:block [&>code]:w-max [&>code]:min-w-full [&>code]:bg-transparent [&>code]:p-0 [&>code]:whitespace-pre [&>code]:break-normal [&>code]:[overflow-wrap:normal]">
              {children}
            </pre>
          ),
          ul: ({ children }) => <ul className="ml-5 grid min-w-0 list-disc gap-2">{children}</ul>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function ChatsThinkingIndicator({ visible }: { visible: boolean }) {
  return (
    <>
      <style>{CHATS_THINKING_GRADIENT_KEYFRAMES}</style>
      <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} flex h-9 shrink-0 items-end pt-2`}>
        {visible ? (
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
        ) : null}
      </div>
    </>
  );
}

function ChatsQueuedMessagesComposerList({
  deletingQueuedMessageId,
  isLoading,
  onDelete,
  queuedMessages,
}: {
  deletingQueuedMessageId: string | null;
  isLoading: boolean;
  onDelete: (queuedMessageId: string) => void;
  queuedMessages: ReadonlyArray<QueuedMessageRecord>;
}) {
  if (!isLoading && queuedMessages.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-border/60 px-2.5 pt-2.5 pb-2">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Pending queue
        </p>
        {isLoading ? <Loader2Icon className="size-3.5 animate-spin text-muted-foreground" /> : null}
      </div>
      <div className="grid gap-2">
        {queuedMessages.map((queuedMessage) => {
          const canDelete = !queuedMessage.shouldSteer && queuedMessage.status.trim().toLowerCase() === "pending";
          const isDeleting = deletingQueuedMessageId === queuedMessage.id;

          return (
            <div
              className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 px-3 py-2.5"
              key={queuedMessage.id}
            >
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {queuedMessage.shouldSteer ? "Steer" : "Queued"}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {formatTimestamp(queuedMessage.createdAt)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground [overflow-wrap:anywhere]">
                  {queuedMessage.text}
                </p>
              </div>
              {canDelete ? (
                <button
                  aria-label="Delete queued message"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isDeleting}
                  onClick={() => onDelete(queuedMessage.id)}
                  title={isDeleting ? "Deleting queued message..." : "Delete queued message"}
                  type="button"
                >
                  {isDeleting ? <Loader2Icon className="size-4 animate-spin" /> : <Trash2Icon className="size-4" />}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChatsReconnectBanner({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="shrink-0 px-2 pt-4 md:px-3 md:pt-5">
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        <span>Reconnecting live updates...</span>
      </div>
    </div>
  );
}

function ToolTranscriptMessage(
  { message, toolCallSummary }: { message: SessionMessageRecord; toolCallSummary: ToolCallSummaryRecord | null },
) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusLabel = message.status.trim().toLowerCase() === "running"
    ? "Running"
    : message.isError
    ? "Error"
    : "Success";
  const visibleContents = message.contents.filter((content) => {
    if (parseTerminalStructuredContent(content)) {
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
  const defaultToolName = resolveToolDisplayName(toolCallSummary?.toolName ?? message.toolName ?? "Tool");
  const commandToolArguments = parseCommandToolArguments(toolCallSummary?.argumentsValue);
  const commandToolYieldTimeMs = commandToolArguments?.yieldTimeMs ?? null;
  const isCommandTool = defaultToolName === "execute_command" && commandToolArguments !== null;
  const collapsedSummary = isCommandTool ? commandToolArguments.command : defaultToolName;

  return (
    <div className="min-w-0 w-full max-w-3xl rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {isCommandTool ? (
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background/70 font-mono text-xs font-semibold text-foreground">
              $
            </span>
          ) : (
            <WrenchIcon className="size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className={isCommandTool
                ? "truncate font-mono text-sm text-foreground"
                : "truncate text-sm font-medium text-foreground"}
              title={collapsedSummary}
            >
              {collapsedSummary}
            </span>
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {statusLabel}
            </span>
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
            const terminalStructuredContent = parseTerminalStructuredContent(content);
            if (terminalStructuredContent) {
              const terminalOutputText = typeof content.text === "string"
                ? sanitizeTerminalDisplayOutput(content.text)
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
                  <pre className="border-t border-border/60 px-3 py-3 whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]">
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

            return (
              <pre
                key={`${message.id}-content-${contentIndex}`}
                className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground [overflow-wrap:anywhere]"
              >
                {content.text}
              </pre>
            );
          }) : (
            <p className="text-sm text-muted-foreground">
              {message.status.trim().toLowerCase() === "running" ? "Waiting for tool output..." : "No tool output."}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TranscriptMessageRow({
  includeThinking,
  message,
  toolCallSummary,
  useLeftGutter = true,
}: {
  includeThinking: boolean;
  message: SessionMessageRecord;
  toolCallSummary: ToolCallSummaryRecord | null;
  useLeftGutter?: boolean;
}) {
  if (!hasVisibleTranscriptMessage(message, { includeThinking })) {
    return null;
  }

  const isUserMessage = message.role === "user";
  const isToolMessage = message.role === "toolResult";
  const assistantDisplayContents = !isUserMessage && !isToolMessage
    ? resolveAssistantDisplayContents(message, { includeThinking })
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
          <p className="whitespace-pre-wrap break-words text-right text-sm [overflow-wrap:anywhere]">{message.text}</p>
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

function ChatsTranscript({
  session,
  sessionMessages,
  transcriptScrollRef,
  isLoadingOlderMessages,
  isLoadingTranscript,
  onScroll,
}: {
  session: SessionRecord;
  sessionMessages: ReadonlyArray<SessionMessageRecord>;
  transcriptScrollRef: MutableRefObject<HTMLDivElement | null>;
  isLoadingOlderMessages: boolean;
  isLoadingTranscript: boolean;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
}) {
  const toolCallSummaryById = useMemo(() => {
    return buildToolCallSummaryById(sessionMessages);
  }, [sessionMessages]);
  const transcriptTurns = useMemo(() => {
    return buildTranscriptTurns(sessionMessages, session);
  }, [session, sessionMessages]);
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
    );
  }

  return (
    <div
      ref={transcriptScrollRef}
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 [overflow-anchor:none]"
      onScroll={onScroll}
    >
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
                  includeThinking={true}
                  key={message.id}
                  message={message}
                  toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                />
              ))}
            </div>
          );
        }

        const hasHiddenMessages = turn.hiddenMessages.length > 0;
        const isExpanded = expandedTurnIds[turn.turnId] === true;

        return (
          <div key={turn.turnId} className="grid gap-3">
            {turn.inlineMessages.map((message) => (
              <TranscriptMessageRow
                includeThinking={false}
                key={message.id}
                message={message}
                toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
              />
            ))}
            <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} min-w-0`}>
              {hasHiddenMessages ? (
                <button
                  aria-expanded={isExpanded}
                  className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
                  onClick={() => {
                    setExpandedTurnIds((currentExpandedTurnIds) => ({
                      ...currentExpandedTurnIds,
                      [turn.turnId]: !currentExpandedTurnIds[turn.turnId],
                    }));
                  }}
                  type="button"
                >
                  <ChevronRightIcon className={`size-3.5 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  <span>Worked for {turn.durationLabel}</span>
                </button>
              ) : (
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Worked for {turn.durationLabel}
                </div>
              )}
            </div>
            {hasHiddenMessages && isExpanded ? (
              <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} min-w-0`}>
                <div className="grid gap-3 rounded-2xl border border-border/60 bg-muted/10 px-4 py-4">
                  {turn.hiddenMessages.map((message) => (
                    <TranscriptMessageRow
                      includeThinking={true}
                      key={message.id}
                      message={message}
                      toolCallSummary={message.toolCallId ? toolCallSummaryById.get(message.toolCallId) ?? null : null}
                      useLeftGutter={false}
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ChatsPageContent() {
  const navigate = useNavigate();
  const environment = useRelayEnvironment();
  const subscriptionConnectionStatus = useGraphqlSubscriptionConnectionStatus();
  const search = useSearch({ strict: false }) as ChatsPageSearch;
  const isMobile = useIsMobile();
  const [draftMessage, setDraftMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(null);
  const [pendingCreatedSessionId, setPendingCreatedSessionId] = useState<string | null>(null);
  const [chatListWidth, setChatListWidth] = useState(loadChatListWidth);
  const [isChatListHidden, setIsChatListHidden] = useState(false);
  const [isMobileChatListOpen, setIsMobileChatListOpen] = useState(false);
  const [isEnvironmentPanelOpen, setIsEnvironmentPanelOpen] = useState(false);
  const [isLoadingSessionEnvironment, setIsLoadingSessionEnvironment] = useState(false);
  const [sessionEnvironmentInfo, setSessionEnvironmentInfo] = useState<SessionEnvironmentInfoRecord | null>(null);
  const [sessionEnvironmentErrorMessage, setSessionEnvironmentErrorMessage] = useState<string | null>(null);
  const [isResizingChatList, setIsResizingChatList] = useState(false);
  const [draftTextareaHeight, setDraftTextareaHeight] = useState<number | null>(null);
  const [isResizingDraftTextarea, setIsResizingDraftTextarea] = useState(false);
  const [composerModelOptionId, setComposerModelOptionId] = useState("");
  const [composerReasoningLevel, setComposerReasoningLevel] = useState("");
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(CHAT_LIST_DEFAULT_WIDTH);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextareaResizeStartHeightRef = useRef(0);
  const draftTextareaResizeStartYRef = useRef(0);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const transcriptScrollRestoreAnimationFrameRef = useRef<number | null>(null);
  const pendingTranscriptScrollRestoreRef = useRef<TranscriptScrollRestoreRecord | null>(
    null,
  );
  const isLoadingOlderTranscriptRef = useRef(false);
  const shouldStickTranscriptToBottomRef = useRef(true);
  const transcriptRequestIdRef = useRef(0);
  const activeTranscriptSessionIdRef = useRef<string | null>(null);
  const markSessionReadInFlightSessionIdRef = useRef<string | null>(null);
  const [sessionTitleOverridesById, setSessionTitleOverridesById] = useState<Record<string, string>>({});
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessageRecord[]>([]);
  const [isLoadingQueuedMessages, setIsLoadingQueuedMessages] = useState(false);
  const [deletingQueuedMessageId, setDeletingQueuedMessageId] = useState<string | null>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<SessionMessageRecord[]>([]);
  const [transcriptHasNextPage, setTranscriptHasNextPage] = useState(false);
  const [transcriptEndCursor, setTranscriptEndCursor] = useState<string | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isLoadingOlderTranscript, setIsLoadingOlderTranscript] = useState(false);
  const queuedMessagesRequestIdRef = useRef(0);
  const activeQueuedMessagesSessionIdRef = useRef<string | null>(null);
  const data = useLazyLoadQuery<chatsPageQuery>(
    chatsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateSession, isCreateSessionInFlight] = useMutation<chatsPageCreateSessionMutation>(
    chatsPageCreateSessionMutationNode,
  );
  const [commitArchiveSession, isArchiveSessionInFlight] = useMutation<chatsPageArchiveSessionMutation>(
    chatsPageArchiveSessionMutationNode,
  );
  const [commitPromptSession, isPromptSessionInFlight] = useMutation<chatsPagePromptSessionMutation>(
    chatsPagePromptSessionMutationNode,
  );
  const [commitDeleteQueuedMessage] = useMutation<chatsPageDeleteSessionQueuedMessageMutation>(
    chatsPageDeleteSessionQueuedMessageMutationNode,
  );
  const [commitMarkSessionRead] = useMutation<chatsPageMarkSessionReadMutation>(
    chatsPageMarkSessionReadMutationNode,
  );

  const sortedAgents = useMemo(() => {
    return [...data.Agents].sort((leftAgent, rightAgent) => leftAgent.name.localeCompare(rightAgent.name));
  }, [data.Agents]);
  const providerOptions = useMemo(() => {
    return data.AgentCreateOptions.map((providerOption): ProviderOptionRecord => providerOption);
  }, [data.AgentCreateOptions]);
  const composerModelOptions = useMemo<ChatComposerModelOption[]>(() => {
    return providerOptions
      .flatMap((providerOption) => {
        return providerOption.models.map((modelOption) => ({
          description: modelOption.description,
          id: modelOption.id,
          modelId: modelOption.modelId,
          name: modelOption.name,
          providerLabel: providerOption.label,
          reasoningLevels: [...modelOption.reasoningLevels],
        }));
      })
      .sort((leftModelOption, rightModelOption) => {
        const providerComparison = leftModelOption.providerLabel.localeCompare(rightModelOption.providerLabel);
        if (providerComparison !== 0) {
          return providerComparison;
        }

        return leftModelOption.name.localeCompare(rightModelOption.name);
      });
  }, [providerOptions]);
  const composerModelOptionById = useMemo(() => {
    return new Map(composerModelOptions.map((modelOption) => [modelOption.id, modelOption]));
  }, [composerModelOptions]);
  const activeSessions = useMemo(() => {
    return data.Sessions.filter((session) => !isArchivedSession(session));
  }, [data.Sessions]);
  const sessionsByAgentId = useMemo(() => {
    const nextMap = new Map<string, SessionRecord[]>();

    for (const session of activeSessions) {
      const existingSessions = nextMap.get(session.agentId) ?? [];
      existingSessions.push(session);
      nextMap.set(session.agentId, existingSessions);
    }

    for (const sessions of nextMap.values()) {
      sessions.sort((leftSession, rightSession) => {
        return new Date(rightSession.updatedAt).getTime() - new Date(leftSession.updatedAt).getTime();
      });
    }

    return nextMap;
  }, [activeSessions]);
  const sessionById = useMemo(() => {
    return new Map(activeSessions.map((session) => [session.id, session]));
  }, [activeSessions]);

  const resolvedSelectedSession = search.sessionId ? sessionById.get(search.sessionId) ?? null : null;
  const resolvedSelectedAgentId = search.agentId ?? resolvedSelectedSession?.agentId ?? "";
  const selectedAgent = sortedAgents.find((agent) => agent.id === resolvedSelectedAgentId) ?? null;
  const selectedSession = resolvedSelectedSession && resolvedSelectedSession.agentId === selectedAgent?.id
    ? resolvedSelectedSession
    : null;
  const selectedComposerModelOption = composerModelOptionById.get(composerModelOptionId) ?? null;
  const selectedSessionMessages = selectedSession ? transcriptMessages : [];
  const isSubmittingDraft = isCreateSessionInFlight || isPromptSessionInFlight;
  const canSubmitDraft = Boolean(selectedAgent && selectedComposerModelOption && draftMessage.trim().length > 0) && !isSubmittingDraft;
  const isReconnectingLiveUpdates = subscriptionConnectionStatus === "reconnecting";
  const chatListPanelStyle = {
    "--chats-list-width": `${chatListWidth}px`,
  } as CSSProperties;

  const markSessionRead = useCallback((sessionId: string) => {
    if (sessionId.length === 0 || markSessionReadInFlightSessionIdRef.current === sessionId) {
      return;
    }

    markSessionReadInFlightSessionIdRef.current = sessionId;
    commitMarkSessionRead({
      variables: {
        input: {
          sessionId,
        },
      },
      updater: (store) => {
        upsertRootLinkedRecord(store, "Sessions", "MarkSessionRead");
      },
      onCompleted: () => {
        if (markSessionReadInFlightSessionIdRef.current === sessionId) {
          markSessionReadInFlightSessionIdRef.current = null;
        }
      },
      onError: (error) => {
        if (markSessionReadInFlightSessionIdRef.current === sessionId) {
          markSessionReadInFlightSessionIdRef.current = null;
        }
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });
  }, [commitMarkSessionRead]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CHAT_LIST_WIDTH_STORAGE_KEY, String(chatListWidth));
  }, [chatListWidth]);

  useEffect(() => {
    const hasSelectedChatTarget = Boolean(search.agentId || search.sessionId);

    if (isMobile) {
      setIsMobileChatListOpen(!hasSelectedChatTarget);
      return;
    }

    setIsMobileChatListOpen(false);
  }, [isMobile, search.agentId, search.sessionId]);

  useEffect(() => {
    if (!selectedSession?.hasUnread) {
      return;
    }

    markSessionRead(selectedSession.id);
  }, [markSessionRead, selectedSession?.hasUnread, selectedSession?.id]);

  const loadSessionEnvironmentInfo = useCallback(async (sessionId: string) => {
    setIsLoadingSessionEnvironment(true);
    setSessionEnvironmentErrorMessage(null);

    try {
      const response = await fetchQuery<chatsPageSessionEnvironmentQuery>(
        environment,
        chatsPageSessionEnvironmentQueryNode,
        {
          sessionId,
        },
        {
          fetchPolicy: "network-only",
        },
      ).toPromise();

      setSessionEnvironmentInfo(response?.SessionEnvironment ?? null);
    } catch (error) {
      setSessionEnvironmentInfo(null);
      setSessionEnvironmentErrorMessage(error instanceof Error ? error.message : "Failed to load environment.");
    } finally {
      setIsLoadingSessionEnvironment(false);
    }
  }, [environment]);

  const loadQueuedMessages = useCallback(async (sessionId: string) => {
    const requestId = queuedMessagesRequestIdRef.current + 1;
    queuedMessagesRequestIdRef.current = requestId;
    activeQueuedMessagesSessionIdRef.current = sessionId;
    setIsLoadingQueuedMessages(true);

    try {
      const response = await fetchQuery<chatsPageQueuedMessagesQuery>(
        environment,
        chatsPageQueuedMessagesQueryNode,
        {
          sessionId,
        },
        {
          fetchPolicy: "network-only",
        },
      ).toPromise();

      if (queuedMessagesRequestIdRef.current !== requestId || activeQueuedMessagesSessionIdRef.current !== sessionId) {
        return;
      }

      const nextQueuedMessages = [...(response?.SessionQueuedMessages ?? [])].sort(compareQueuedMessagesByTimestamp);
      setQueuedMessages(nextQueuedMessages);
    } catch (error) {
      if (queuedMessagesRequestIdRef.current !== requestId || activeQueuedMessagesSessionIdRef.current !== sessionId) {
        return;
      }

      setQueuedMessages([]);
      setErrorMessage((currentMessage) => currentMessage ?? (error instanceof Error ? error.message : "Failed to load queued messages."));
    } finally {
      if (queuedMessagesRequestIdRef.current === requestId && activeQueuedMessagesSessionIdRef.current === sessionId) {
        setIsLoadingQueuedMessages(false);
      }
    }
  }, [environment]);

  useEffect(() => {
    if (!selectedSession) {
      setIsEnvironmentPanelOpen(false);
      setSessionEnvironmentInfo(null);
      setSessionEnvironmentErrorMessage(null);
      setIsLoadingSessionEnvironment(false);
      return;
    }

    if (!isEnvironmentPanelOpen) {
      return;
    }

    void loadSessionEnvironmentInfo(selectedSession.id);
  }, [isEnvironmentPanelOpen, loadSessionEnvironmentInfo, selectedSession]);

  const updateSessionTitleOverride = useCallback((sessionId: string, messages: ReadonlyArray<SessionMessageRecord>) => {
    const nextTitle = formatSessionTitle(messages);
    setSessionTitleOverridesById((currentOverrides) => {
      if (currentOverrides[sessionId] === nextTitle) {
        return currentOverrides;
      }

      return {
        ...currentOverrides,
        [sessionId]: nextTitle,
      };
    });
  }, []);

  const loadTranscriptPage = useCallback(async ({
    after = null,
    mode,
    sessionId,
  }: {
    after?: string | null;
    mode: "prepend" | "replace";
    sessionId: string;
  }) => {
    if (mode === "replace") {
      const requestId = transcriptRequestIdRef.current + 1;
      transcriptRequestIdRef.current = requestId;
      pendingTranscriptScrollRestoreRef.current = null;
      shouldStickTranscriptToBottomRef.current = true;
      setErrorMessage(null);
      setTranscriptMessages([]);
      setTranscriptHasNextPage(false);
      setTranscriptEndCursor(null);
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingOlderTranscript(false);
      setIsLoadingTranscript(true);

      try {
        const response = await fetchQuery<chatsPageTranscriptQuery>(
          environment,
          chatsPageTranscriptQueryNode,
          {
            sessionId,
            first: CHAT_TRANSCRIPT_PAGE_SIZE,
            after: null,
          },
        ).toPromise();

        if (transcriptRequestIdRef.current !== requestId || activeTranscriptSessionIdRef.current !== sessionId) {
          return;
        }

        const connection = response?.SessionTranscriptMessages;
        const nextMessages = toTranscriptMessagesFromConnection(connection);
        setTranscriptMessages((currentMessages) => {
          const mergedMessages = mergeTranscriptMessages(currentMessages, nextMessages);
          updateSessionTitleOverride(sessionId, mergedMessages);
          return mergedMessages;
        });
        setTranscriptHasNextPage(Boolean(connection?.pageInfo.hasNextPage));
        setTranscriptEndCursor(connection?.pageInfo.endCursor ?? null);
      } catch (error) {
        if (transcriptRequestIdRef.current === requestId) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load transcript.");
        }
      } finally {
        if (transcriptRequestIdRef.current === requestId && activeTranscriptSessionIdRef.current === sessionId) {
          setIsLoadingTranscript(false);
        }
      }
      return;
    }

    if (isLoadingOlderTranscriptRef.current) {
      return;
    }

    setErrorMessage(null);
    const transcriptNode = transcriptScrollRef.current;
    shouldStickTranscriptToBottomRef.current = false;
    if (transcriptNode) {
      pendingTranscriptScrollRestoreRef.current = captureTranscriptScrollRestoreRecord(transcriptNode);
    }

    isLoadingOlderTranscriptRef.current = true;
    setIsLoadingOlderTranscript(true);

    try {
      const response = await fetchQuery<chatsPageTranscriptQuery>(
        environment,
        chatsPageTranscriptQueryNode,
        {
          sessionId,
          first: CHAT_TRANSCRIPT_PAGE_SIZE,
          after,
        },
      ).toPromise();

      if (activeTranscriptSessionIdRef.current !== sessionId) {
        return;
      }

      const connection = response?.SessionTranscriptMessages;
      const nextMessages = toTranscriptMessagesFromConnection(connection);
      setTranscriptMessages((currentMessages) => {
        const mergedMessages = mergeTranscriptMessages(currentMessages, nextMessages);
        updateSessionTitleOverride(sessionId, mergedMessages);
        return mergedMessages;
      });
      setTranscriptHasNextPage(Boolean(connection?.pageInfo.hasNextPage));
      setTranscriptEndCursor(connection?.pageInfo.endCursor ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load older messages.");
      pendingTranscriptScrollRestoreRef.current = null;
    } finally {
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingOlderTranscript(false);
    }
  }, [
    environment,
    updateSessionTitleOverride,
  ]);

  useEffect(() => {
    if (!search.agentId || !search.sessionId || selectedSession) {
      if (selectedSession && pendingCreatedSessionId === selectedSession.id) {
        setPendingCreatedSessionId(null);
      }
      return;
    }
    if (pendingCreatedSessionId && search.sessionId === pendingCreatedSessionId) {
      return;
    }

    void navigate({
      replace: true,
      to: "/chats",
      search: {
        agentId: search.agentId,
      },
    });
  }, [navigate, pendingCreatedSessionId, search.agentId, search.sessionId, selectedSession]);

  useEffect(() => {
    if (!selectedSession) {
      if (transcriptScrollRestoreAnimationFrameRef.current !== null) {
        cancelAnimationFrame(transcriptScrollRestoreAnimationFrameRef.current);
        transcriptScrollRestoreAnimationFrameRef.current = null;
      }
      transcriptRequestIdRef.current += 1;
      activeTranscriptSessionIdRef.current = null;
      pendingTranscriptScrollRestoreRef.current = null;
      shouldStickTranscriptToBottomRef.current = true;
      setTranscriptMessages([]);
      setTranscriptHasNextPage(false);
      setTranscriptEndCursor(null);
      setIsLoadingTranscript(false);
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingOlderTranscript(false);
      return;
    }

    activeTranscriptSessionIdRef.current = selectedSession.id;
    void loadTranscriptPage({
      mode: "replace",
      sessionId: selectedSession.id,
    });
  }, [loadTranscriptPage, selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession) {
      queuedMessagesRequestIdRef.current += 1;
      activeQueuedMessagesSessionIdRef.current = null;
      setQueuedMessages([]);
      setIsLoadingQueuedMessages(false);
      setDeletingQueuedMessageId(null);
      return;
    }

    void loadQueuedMessages(selectedSession.id);
  }, [loadQueuedMessages, selectedSession?.id]);

  useEffect(() => {
    if (!selectedAgent) {
      setComposerModelOptionId("");
      setComposerReasoningLevel("");
      return;
    }

    const nextModelOptionId = resolveComposerModelOptionId(
      composerModelOptions,
      selectedSession?.modelProviderCredentialModelId ?? null,
      selectedSession?.modelId ?? null,
      selectedAgent.modelProviderCredentialModelId ?? null,
    );
    const nextModelOption = composerModelOptionById.get(nextModelOptionId) ?? null;
    const nextReasoningLevel = resolveComposerReasoningLevel(
      nextModelOption,
      selectedSession?.reasoningLevel ?? selectedAgent.reasoningLevel,
    );

    setComposerModelOptionId(nextModelOptionId);
    setComposerReasoningLevel(nextReasoningLevel);
  }, [
    composerModelOptionById,
    composerModelOptions,
    selectedAgent,
    selectedSession,
  ]);

  useEffect(() => {
    const nextModelOption = composerModelOptionById.get(composerModelOptionId) ?? null;
    const nextReasoningLevel = resolveComposerReasoningLevel(nextModelOption, composerReasoningLevel);
    if (nextReasoningLevel === composerReasoningLevel) {
      return;
    }

    setComposerReasoningLevel(nextReasoningLevel);
  }, [composerModelOptionById, composerModelOptionId, composerReasoningLevel]);

  useEffect(() => {
    if (!isResizingChatList) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - resizeStartXRef.current;
      setChatListWidth(clampChatListWidth(resizeStartWidthRef.current - delta));
    };
    const handlePointerUp = () => {
      setIsResizingChatList(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingChatList]);

  useEffect(() => {
    if (!isResizingDraftTextarea) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const textarea = draftTextareaRef.current;
      if (!textarea) {
        return;
      }

      const { maxHeight, minHeight } = resolveDraftTextareaHeightBounds(textarea);
      const delta = draftTextareaResizeStartYRef.current - event.clientY;
      const nextHeight = Math.min(maxHeight, Math.max(minHeight, draftTextareaResizeStartHeightRef.current + delta));

      setDraftTextareaHeight(nextHeight);
    };
    const handlePointerUp = () => {
      setIsResizingDraftTextarea(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingDraftTextarea]);

  useEffect(() => {
    const textarea = draftTextareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    const { maxHeight, minHeight } = resolveDraftTextareaHeightBounds(textarea);
    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, draftTextareaHeight ?? minHeight, minHeight),
      maxHeight,
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > nextHeight ? "auto" : "hidden";
  }, [draftMessage, draftTextareaHeight, selectedAgent?.id, selectedSession?.id]);

  useLayoutEffect(() => {
    const transcriptNode = transcriptScrollRef.current;
    if (!transcriptNode) {
      return;
    }

    if (transcriptScrollRestoreAnimationFrameRef.current !== null) {
      cancelAnimationFrame(transcriptScrollRestoreAnimationFrameRef.current);
      transcriptScrollRestoreAnimationFrameRef.current = null;
    }

    if (pendingTranscriptScrollRestoreRef.current) {
      const restoreRecord = pendingTranscriptScrollRestoreRef.current;
      pendingTranscriptScrollRestoreRef.current = null;
      shouldStickTranscriptToBottomRef.current = false;
      restoreTranscriptScrollPosition(transcriptNode, restoreRecord);
      transcriptScrollRestoreAnimationFrameRef.current = requestAnimationFrame(() => {
        const currentTranscriptNode = transcriptScrollRef.current;
        if (!currentTranscriptNode) {
          transcriptScrollRestoreAnimationFrameRef.current = null;
          return;
        }

        restoreTranscriptScrollPosition(currentTranscriptNode, restoreRecord);
        transcriptScrollRestoreAnimationFrameRef.current = null;
      });
      return;
    }

    if (!shouldStickTranscriptToBottomRef.current) {
      return;
    }

    transcriptNode.scrollTop = transcriptNode.scrollHeight;
  }, [transcriptMessages]);

  const handleTranscriptScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const transcriptNode = event.currentTarget;
    const distanceFromBottom =
      transcriptNode.scrollHeight - transcriptNode.scrollTop - transcriptNode.clientHeight;
    shouldStickTranscriptToBottomRef.current =
      distanceFromBottom <= CHAT_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX;

    const isTranscriptNearTop = transcriptNode.scrollTop <= CHAT_TRANSCRIPT_TOP_LOAD_THRESHOLD_PX;
    if (!selectedSession || !isTranscriptNearTop || !transcriptHasNextPage || isLoadingOlderTranscript) {
      return;
    }

    void loadTranscriptPage({
      after: transcriptEndCursor,
      mode: "prepend",
      sessionId: selectedSession.id,
    });
  }, [
    isLoadingOlderTranscript,
    loadTranscriptPage,
    selectedSession,
    transcriptEndCursor,
    transcriptHasNextPage,
  ]);

  useEffect(() => {
    const disposable = requestSubscription<chatsPageSessionUpdatedSubscription>(environment, {
      subscription: chatsPageSessionUpdatedSubscriptionNode,
      variables: {},
      updater: (store) => {
        upsertRootLinkedRecord(store, "Sessions", "SessionUpdated");
      },
      onNext: (response) => {
        const nextSession = response?.SessionUpdated;
        if (!nextSession) {
          return;
        }
        if (nextSession.id !== selectedSession?.id) {
          return;
        }
        if (nextSession.status !== "stopped" || !nextSession.hasUnread) {
          return;
        }

        markSessionRead(nextSession.id);
      },
      onError: (error) => {
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [environment, markSessionRead, selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    const subscriptionVariables = { sessionId: selectedSession.id };
    const disposable = requestSubscription<chatsPageSessionMessageUpdatedSubscription>(environment, {
      subscription: chatsPageSessionMessageUpdatedSubscriptionNode,
      variables: subscriptionVariables,
      onNext: (response) => {
        const nextMessage = response?.SessionMessageUpdated;
        if (!nextMessage) {
          return;
        }

        setTranscriptMessages((currentMessages) => {
          const mergedMessages = mergeTranscriptMessages(currentMessages, [nextMessage]);
          updateSessionTitleOverride(selectedSession.id, mergedMessages);
          return mergedMessages;
        });
      },
      onError: (error) => {
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [environment, selectedSession?.id, updateSessionTitleOverride]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    const subscriptionVariables = { sessionId: selectedSession.id };
    const disposable = requestSubscription<chatsPageSessionQueuedMessagesUpdatedSubscription>(environment, {
      subscription: chatsPageSessionQueuedMessagesUpdatedSubscriptionNode,
      variables: subscriptionVariables,
      onNext: (response) => {
        const nextQueuedMessages = response?.SessionQueuedMessagesUpdated;
        if (!nextQueuedMessages) {
          return;
        }

        setQueuedMessages([...nextQueuedMessages].sort(compareQueuedMessagesByTimestamp));
        setIsLoadingQueuedMessages(false);
      },
      onError: (error) => {
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [environment, selectedSession?.id]);

  const openDraftForAgent = async (agentId: string) => {
    setErrorMessage(null);
    setDraftMessage("");
    setIsMobileChatListOpen(false);
    await navigate({
      to: "/chats",
      search: {
        agentId,
      },
    });
  };

  const openSession = async (agentId: string, sessionId: string) => {
    setErrorMessage(null);
    setIsMobileChatListOpen(false);
    await navigate({
      to: "/chats",
      search: {
        agentId,
        sessionId,
      },
    });
  };

  const startSession = async () => {
    if (!selectedAgent || !selectedComposerModelOption) {
      return;
    }

    const userMessage = draftMessage.trim();
    if (userMessage.length === 0) {
      return;
    }
    const nextSessionId = globalThis.crypto.randomUUID();

    setErrorMessage(null);
    setPendingCreatedSessionId(nextSessionId);

    await navigate({
      to: "/chats",
      search: {
        agentId: selectedAgent.id,
        sessionId: nextSessionId,
      },
    });

    await new Promise<void>((resolve, reject) => {
      commitCreateSession({
        variables: {
          input: {
            agentId: selectedAgent.id,
            modelProviderCredentialModelId: selectedComposerModelOption.id,
            reasoningLevel: composerReasoningLevel.length > 0 ? composerReasoningLevel : undefined,
            sessionId: nextSessionId,
            userMessage,
          },
        },
        updater: (store) => {
          const createdSession = store.getRootField("CreateSession");
          if (!createdSession) {
            return;
          }

          const rootRecord = store.getRoot();
          const currentSessions = filterStoreRecords(rootRecord.getLinkedRecords("Sessions") || []);
          rootRecord.setLinkedRecords(
            [
              createdSession,
              ...currentSessions.filter((record) => record.getDataID() !== createdSession.getDataID()),
            ],
            "Sessions",
          );
        },
        onCompleted: async (response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          const createdSession = response.CreateSession;
          if (!createdSession) {
            reject(new Error("Failed to create chat session."));
            return;
          }

          setDraftMessage("");

          try {
            setPendingCreatedSessionId(null);
            if (search.sessionId !== createdSession.id || search.agentId !== createdSession.agentId) {
              await navigate({
                to: "/chats",
                search: {
                  agentId: createdSession.agentId,
                  sessionId: createdSession.id,
                },
              });
            }
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setPendingCreatedSessionId(null);
      setErrorMessage(error instanceof Error ? error.message : "Failed to create chat session.");
    });
  };

  const archiveSession = async (session: SessionRecord) => {
    setErrorMessage(null);
    setArchivingSessionId(session.id);

    await new Promise<void>((resolve, reject) => {
      commitArchiveSession({
        variables: {
          input: {
            id: session.id,
          },
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to archive chat session.");
    }).finally(() => {
      setArchivingSessionId(null);
    });
  };

  const promptSession = async () => {
    if (!selectedSession || !selectedComposerModelOption) {
      return;
    }

    const userMessage = draftMessage.trim();
    if (userMessage.length === 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      commitPromptSession({
        variables: {
          input: {
            id: selectedSession.id,
            modelProviderCredentialModelId: selectedComposerModelOption.id,
            reasoningLevel: composerReasoningLevel.length > 0 ? composerReasoningLevel : undefined,
            shouldSteer: false,
            userMessage,
          },
        },
        updater: (store) => {
          upsertRootLinkedRecord(store, "Sessions", "PromptSession");
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          setDraftMessage("");
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send message.");
    });
  };

  const deleteQueuedMessage = async (queuedMessageId: string) => {
    const queuedMessage = queuedMessages.find((currentQueuedMessage) => currentQueuedMessage.id === queuedMessageId) ?? null;
    if (!queuedMessage || queuedMessage.shouldSteer) {
      return;
    }

    setDeletingQueuedMessageId(queuedMessageId);
    await new Promise<void>((resolve, reject) => {
      commitDeleteQueuedMessage({
        variables: {
          input: {
            id: queuedMessageId,
          },
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          setQueuedMessages((currentQueuedMessages) => {
            return currentQueuedMessages.filter((currentQueuedMessage) => currentQueuedMessage.id !== queuedMessageId);
          });
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete queued message.");
    }).finally(() => {
      setDeletingQueuedMessageId((currentDeletingQueuedMessageId) => {
        return currentDeletingQueuedMessageId === queuedMessageId ? null : currentDeletingQueuedMessageId;
      });
    });
  };

  const startChatListResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = chatListWidth;
    setIsResizingChatList(true);
  };

  const hideChatList = useCallback(() => {
    if (isMobile) {
      setIsMobileChatListOpen(false);
      return;
    }

    setIsResizingChatList(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setIsChatListHidden(true);
  }, [isMobile]);

  const showChatList = useCallback(() => {
    if (isMobile) {
      setIsMobileChatListOpen(true);
      return;
    }

    setIsChatListHidden(false);
  }, [isMobile]);

  const startDraftTextareaResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const textarea = draftTextareaRef.current;
    if (!textarea) {
      return;
    }

    event.preventDefault();
    draftTextareaResizeStartYRef.current = event.clientY;
    draftTextareaResizeStartHeightRef.current = textarea.getBoundingClientRect().height;
    setIsResizingDraftTextarea(true);
  };

  const submitDraft = async () => {
    if (selectedSession) {
      await promptSession();
      return;
    }

    await startSession();
  };

  const draftSubmitAriaLabel = selectedSession
    ? isPromptSessionInFlight
      ? "Sending message"
      : "Send message"
    : isCreateSessionInFlight
      ? "Creating chat"
      : "Start chat";
  const isDesktopChatListVisible = !isMobile && !isChatListHidden;
  const shouldShowChatListButton = isMobile ? !isMobileChatListOpen : isChatListHidden;
  const chatsHeaderTitle = selectedSession
    ? resolveSessionTitle(selectedSession, selectedSessionMessages)
    : selectedAgent
      ? selectedAgent.name
      : "Chat";
  const chatsHeaderDescription = selectedSession
    ? `Updated ${formatTimestamp(selectedSession.updatedAt)}`
    : selectedAgent
      ? "New chat"
      : shouldShowChatListButton
        ? isMobile
          ? "Show the chats panel to start a chat."
          : "Show the chats list to start a chat."
        : isMobile
          ? "Choose an agent from the panel to start a chat."
          : "Choose an agent from the panel to start a chat.";
  const headerAction = useMemo(() => {
    const actions: JSX.Element[] = [];

    if (shouldShowChatListButton) {
      actions.push(
        <Button
          key="chats-panel"
          aria-label={isMobile ? "Show chats panel" : "Show chats list"}
          className="text-muted-foreground hover:text-foreground"
          onClick={showChatList}
          size="icon-sm"
          title={isMobile ? "Show chats panel" : "Show chats list"}
          variant="ghost"
        >
          <MessageSquareIcon className="size-4" />
        </Button>,
      );
    }

    if (selectedSession) {
      actions.push(
        <Button
          key="environment-panel"
          aria-label="Show environment details"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            setIsEnvironmentPanelOpen(true);
          }}
          size="icon-sm"
          title="Show environment details"
          variant="ghost"
        >
          <Settings2Icon className="size-4" />
        </Button>,
      );
    }

    if (actions.length === 0) {
      return null;
    }

    return <>{actions}</>;
  }, [isMobile, selectedSession, shouldShowChatListButton, showChatList]);
  const headerContent = useMemo(() => {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{chatsHeaderTitle}</p>
        {chatsHeaderDescription ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {chatsHeaderDescription}
          </p>
        ) : null}
      </div>
    );
  }, [chatsHeaderDescription, chatsHeaderTitle]);
  useApplicationHeader({
    actions: headerAction,
    content: headerContent,
  });
  const renderChatListPanel = (panelMode: "desktop" | "mobile") => {
    const isMobilePanel = panelMode === "mobile";
    const hideButtonLabel = isMobilePanel ? "Close chats panel" : "Hide chats list";

    if (isMobilePanel) {
      return (
        <div className="app-shell-sidebar flex h-full flex-col bg-sidebar text-sidebar-foreground">
          <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">Chats</p>
            </div>
            <Button
              aria-label={hideButtonLabel}
              className="-mr-1 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={hideChatList}
              size="icon-sm"
              title={hideButtonLabel}
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
            {sortedAgents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-sidebar-border bg-sidebar-accent/25 px-4 py-10 text-center">
                <p className="text-sm font-medium text-sidebar-foreground">No agents yet</p>
                <p className="mt-2 text-xs/relaxed text-sidebar-foreground/65">
                  Create an agent first from the <Link className="text-sidebar-primary hover:underline" to="/agents">Agents</Link> page.
                </p>
              </div>
            ) : null}

            <ul className="grid gap-3" role="list" aria-label="Agents">
              {sortedAgents.map((agent) => {
                const agentSessions = sessionsByAgentId.get(agent.id) ?? [];
                const isAgentSelected = selectedAgent?.id === agent.id;

                return (
                  <li
                    key={agent.id}
                    className="px-0 py-2"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="min-w-0 flex-1 rounded-md px-1 py-1 text-left"
                        onClick={() => {
                          void openDraftForAgent(agent.id);
                        }}
                        type="button"
                      >
                        <p className="truncate text-sm font-medium text-sidebar-foreground">{agent.name}</p>
                        <p className="mt-1 text-xs/relaxed text-sidebar-foreground/65">{formatAgentMeta(agent)}</p>
                      </button>
                    </div>

                    <div className="mt-3">
                      <button
                        aria-label={`Create chat for ${agent.name}`}
                        className={`flex w-full items-center justify-center rounded-lg px-2 py-3 text-sm font-medium transition ${
                          isAgentSelected && !selectedSession
                            ? "bg-sidebar-primary text-sidebar-primary-foreground"
                            : "bg-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                        onClick={() => {
                          void openDraftForAgent(agent.id);
                        }}
                        type="button"
                      >
                        <PlusIcon className="size-5" />
                      </button>

                      {agentSessions.length > 0 ? (
                        <ul className="mt-2 grid gap-2" role="list" aria-label={`${agent.name} sessions`}>
                          {agentSessions.map((session) => {
                            const isSessionSelected = selectedSession?.id === session.id;
                            const isSessionArchiving = isArchiveSessionInFlight && archivingSessionId === session.id;
                            const isSessionRunning = isRunningSession(session);

                            return (
                              <li key={session.id}>
                                <div
                                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg px-1 py-2 transition ${
                                    isSessionSelected
                                      ? "bg-sidebar-accent"
                                      : "bg-transparent hover:bg-sidebar-accent/70"
                                  }`}
                                >
                                  <button
                                    className="min-w-0 overflow-hidden pr-1 text-left"
                                    disabled={isSessionArchiving}
                                    onClick={() => {
                                      void openSession(agent.id, session.id);
                                    }}
                                    type="button"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                        {isSessionRunning ? (
                                          <Loader2Icon
                                            className="size-3.5 animate-spin text-sidebar-foreground/70"
                                            title="Session running"
                                          />
                                        ) : session.hasUnread ? (
                                          <span className="size-2 rounded-full bg-blue-500" />
                                        ) : null}
                                      </span>
                                      <p className="block min-w-0 truncate text-xs font-medium text-sidebar-foreground">
                                        {resolveSessionTitleOverride(session, sessionTitleOverridesById)}
                                      </p>
                                    </div>
                                    <p className="mt-1 block w-full truncate pl-6 text-[0.7rem] text-sidebar-foreground/55">
                                      {isSessionArchiving ? "Archiving..." : formatTimestamp(session.updatedAt)}
                                    </p>
                                  </button>
                                  <div className="flex shrink-0 items-start gap-2">
                                    <button
                                      aria-label={`Archive ${resolveSessionTitleOverride(session, sessionTitleOverridesById)}`}
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                      disabled={isSessionArchiving}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void archiveSession(session);
                                      }}
                                      title={isSessionArchiving ? "Archiving..." : "Archive chat"}
                                      type="button"
                                    >
                                      <ArchiveIcon className="size-4" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-sidebar-foreground/55">No chats yet.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div>
        <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
          <CardContent className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${CHAT_LIST_LEFT_GUTTER_CLASS} pr-3 md:pr-3`}>
            <div className="mb-2 flex items-center justify-end pr-1">
              <Button
                aria-label={hideButtonLabel}
                className="text-muted-foreground hover:text-foreground"
                onClick={hideChatList}
                size="icon-sm"
                title={hideButtonLabel}
                variant="ghost"
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            {sortedAgents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No agents yet</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  Create an agent first from the <Link className="text-primary hover:underline" to="/agents">Agents</Link> page.
                </p>
              </div>
            ) : null}

            <ul className="grid gap-3" role="list" aria-label="Agents">
              {sortedAgents.map((agent) => {
                const agentSessions = sessionsByAgentId.get(agent.id) ?? [];
                const isAgentSelected = selectedAgent?.id === agent.id;

                return (
                  <li
                    key={agent.id}
                    className="px-0 py-2"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="min-w-0 flex-1 pl-1 text-left"
                        onClick={() => {
                          void openDraftForAgent(agent.id);
                        }}
                        type="button"
                      >
                        <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="mt-1 text-xs/relaxed text-muted-foreground/85">{formatAgentMeta(agent)}</p>
                      </button>
                    </div>

                    <div className="mt-3">
                      <button
                        aria-label={`Create chat for ${agent.name}`}
                        className={`flex w-full items-center justify-center rounded-lg px-2 py-3 text-sm font-medium transition ${
                          isAgentSelected && !selectedSession
                            ? "bg-primary/12 text-primary"
                            : "bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        }`}
                        onClick={() => {
                          void openDraftForAgent(agent.id);
                        }}
                        type="button"
                      >
                        <PlusIcon className="size-5" />
                      </button>

                      {agentSessions.length > 0 ? (
                        <ul className="mt-2 grid gap-2" role="list" aria-label={`${agent.name} sessions`}>
                          {agentSessions.map((session) => {
                            const isSessionSelected = selectedSession?.id === session.id;
                            const isSessionArchiving = isArchiveSessionInFlight && archivingSessionId === session.id;
                            const isSessionRunning = isRunningSession(session);

                            return (
                              <li key={session.id}>
                                <div
                                  className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg px-1 py-2 transition ${
                                    isSessionSelected
                                      ? "bg-muted/45"
                                      : "bg-transparent hover:bg-muted/30"
                                  }`}
                                >
                                  <button
                                    className="min-w-0 overflow-hidden pr-1 text-left"
                                    disabled={isSessionArchiving}
                                    onClick={() => {
                                      void openSession(agent.id, session.id);
                                    }}
                                    type="button"
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                                        {isSessionRunning ? (
                                          <Loader2Icon
                                            className="size-3.5 animate-spin text-muted-foreground"
                                            title="Session running"
                                          />
                                        ) : session.hasUnread ? (
                                          <span className="size-2 rounded-full bg-blue-500" />
                                        ) : null}
                                      </span>
                                      <p className="block min-w-0 truncate text-xs font-medium text-foreground">
                                        {resolveSessionTitleOverride(session, sessionTitleOverridesById)}
                                      </p>
                                    </div>
                                    <p className="mt-1 block w-full truncate pl-6 text-[0.7rem] text-muted-foreground">
                                      {isSessionArchiving ? "Archiving..." : formatTimestamp(session.updatedAt)}
                                    </p>
                                  </button>
                                  <div className="flex shrink-0 items-start gap-2">
                                    <button
                                      aria-label={`Archive ${resolveSessionTitleOverride(session, sessionTitleOverridesById)}`}
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-muted-foreground transition hover:bg-muted/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                                      disabled={isSessionArchiving}
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        void archiveSession(session);
                                      }}
                                      title={isSessionArchiving ? "Archiving..." : "Archive chat"}
                                      type="button"
                                    >
                                      <ArchiveIcon className="size-4" />
                                    </button>
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No chats yet.</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };
  const mobileChatListOverlay = isMobile ? (
    <Sheet open={isMobileChatListOpen} onOpenChange={setIsMobileChatListOpen}>
      <SheetContent
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-mobile="true"
        showCloseButton={false}
        side="right"
        className="app-shell-sidebar !w-[80vw] !max-w-[80vw] border-l border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <div className="flex h-full w-full flex-col">{renderChatListPanel("mobile")}</div>
      </SheetContent>
    </Sheet>
  ) : null;
  const currentSessionEnvironment = sessionEnvironmentInfo?.currentEnvironment ?? null;
  const agentDefaultComputeProviderDefinition = sessionEnvironmentInfo?.agentDefaultComputeProviderDefinition ?? null;
  const environmentDetailsPanel = selectedSession ? (
    <Sheet open={isEnvironmentPanelOpen} onOpenChange={setIsEnvironmentPanelOpen}>
      <SheetContent
        className={isMobile
          ? "h-auto max-h-[80vh] border-t border-border bg-background"
          : "w-full max-w-md border-l border-border bg-background"}
        side={isMobile ? "bottom" : "right"}
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5">
          <SheetTitle>Environment</SheetTitle>
          <SheetDescription>
            Review the current reusable environment for this chat session and the agent&apos;s fallback compute provider.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          {sessionEnvironmentErrorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {sessionEnvironmentErrorMessage}
            </div>
          ) : null}

          <section className="grid gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Current environment
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This is the reusable environment CompanyHelm would attach to the current session right now.
              </p>
            </div>

            {isLoadingSessionEnvironment ? (
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Loading environment…
              </div>
            ) : currentSessionEnvironment ? (
              <button
                className="grid gap-3 rounded-xl border border-border/60 bg-card/50 p-4 text-left transition hover:border-border hover:bg-card"
                onClick={() => {
                  setIsEnvironmentPanelOpen(false);
                  void navigate({
                    to: "/environments",
                  });
                }}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {currentSessionEnvironment.displayName ?? currentSessionEnvironment.providerEnvironmentId}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {currentSessionEnvironment.providerDefinitionName ?? "Unnamed definition"} • {formatComputeProviderLabel(currentSessionEnvironment.provider)}
                    </p>
                  </div>
                  <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Status: {currentSessionEnvironment.status}</p>
                  <p>Platform: {currentSessionEnvironment.platform}</p>
                  <p>CPU: {currentSessionEnvironment.cpuCount}</p>
                  <p>Memory: {currentSessionEnvironment.memoryGb} GB</p>
                  <p>Disk: {currentSessionEnvironment.diskSpaceGb} GB</p>
                </div>
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                No reusable environment is currently attached to this session.
              </div>
            )}
          </section>

          <section className="grid gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Agent default
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This provider definition is used only if CompanyHelm needs to provision a fresh environment.
              </p>
            </div>

            {agentDefaultComputeProviderDefinition ? (
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-sm font-medium text-foreground">{agentDefaultComputeProviderDefinition.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatComputeProviderLabel(agentDefaultComputeProviderDefinition.provider)}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
                No default compute provider is configured for this agent.
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  ) : null;

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      {mobileChatListOverlay}
      {environmentDetailsPanel}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
        <ChatsReconnectBanner visible={isReconnectingLiveUpdates} />

        {errorMessage ? (
          <div className="shrink-0 px-2 pt-4 md:px-3 md:pt-5">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          </div>
        ) : null}

        {!selectedAgent ? (
          <CardContent className="flex flex-1 items-center justify-center px-2 md:px-3">
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium text-foreground">Pick an agent to begin</p>
              <p className="mt-2 text-sm/relaxed text-muted-foreground">
                The chats page mirrors the agent-first workflow from `companyhelm-web`: choose an agent, open a blank draft, then create the session on first send.
              </p>
            </div>
          </CardContent>
        ) : null}

        {selectedAgent && !selectedSession ? (
          <CardContent className="flex flex-1 items-center justify-center px-2 md:px-3">
            <div className="max-w-xl text-center">
              <p className="text-sm font-medium text-foreground">Start a new chat with {selectedAgent.name}</p>
              <p className="mt-2 text-sm/relaxed text-muted-foreground">
                Sending this message creates the session and moves this page to the session URL.
              </p>
              <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-left">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Selected agent</p>
                <p className="mt-3 text-sm font-medium text-foreground">{selectedAgent.name}</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  {selectedComposerModelOption
                    ? [
                      selectedComposerModelOption.providerLabel,
                      selectedComposerModelOption.name,
                      composerReasoningLevel || null,
                    ].filter(Boolean).join(" • ")
                    : formatAgentMeta(selectedAgent)}
                </p>
              </div>
            </div>
          </CardContent>
        ) : null}

        {selectedAgent && selectedSession ? (
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 md:py-4">
            <ChatsTranscript
              isLoadingOlderMessages={isLoadingOlderTranscript}
              isLoadingTranscript={isLoadingTranscript}
              onScroll={handleTranscriptScroll}
              session={selectedSession}
              sessionMessages={selectedSessionMessages}
              transcriptScrollRef={transcriptScrollRef}
            />
            <ChatsThinkingIndicator visible={selectedSession.isThinking} />
          </CardContent>
        ) : null}

        {selectedAgent ? (
          <div className="relative shrink-0 border-t border-border/60 px-3 pt-3 pb-2 md:px-4 md:pt-3 md:pb-3">
            <button
              aria-label="Resize message input"
              className="absolute inset-x-0 -top-3 z-10 h-6 cursor-move bg-transparent"
              onPointerDown={startDraftTextareaResize}
              type="button"
            />
            <div className="rounded-[1.5rem] bg-input/20 ring-1 ring-input transition focus-within:ring-ring/40">
              {selectedSession ? (
                <ChatsQueuedMessagesComposerList
                  deletingQueuedMessageId={deletingQueuedMessageId}
                  isLoading={isLoadingQueuedMessages}
                  onDelete={(queuedMessageId) => {
                    void deleteQueuedMessage(queuedMessageId);
                  }}
                  queuedMessages={queuedMessages}
                />
              ) : null}
              <div>
                <textarea
                  id="chat-draft-message"
                  ref={draftTextareaRef}
                  className="min-h-[4.5rem] max-h-[15rem] w-full resize-none bg-transparent px-3 pt-3 pb-3 pr-14 text-sm outline-none"
                  onChange={(event) => {
                    setDraftMessage(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                      return;
                    }

                    event.preventDefault();
                    void submitDraft();
                  }}
                  placeholder="Ask the agent to summarize a repo, draft a plan, or investigate a problem."
                  rows={CHAT_DRAFT_MIN_LINES}
                  value={draftMessage}
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-2.5 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <ChatComposerModelPicker
                    modelOptions={composerModelOptions}
                    onModelChange={setComposerModelOptionId}
                    onReasoningLevelChange={setComposerReasoningLevel}
                    reasoningLevel={composerReasoningLevel}
                    selectedModelOptionId={composerModelOptionId}
                  />
                  {selectedSession ? (
                    <ChatsContextUsageIndicator
                      currentContextTokens={selectedSession.currentContextTokens}
                      isCompacting={selectedSession.isCompacting}
                      maxContextTokens={selectedSession.maxContextTokens}
                    />
                  ) : null}
                </div>
                <Button
                  aria-label={draftSubmitAriaLabel}
                  className="h-10 w-10 shrink-0 rounded-full px-0"
                  disabled={!canSubmitDraft}
                  onClick={() => {
                    void submitDraft();
                  }}
                  type="button"
                >
                  <SendHorizonalIcon className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      {isDesktopChatListVisible ? (
        <div
          className="relative min-h-0 overflow-hidden w-full lg:w-[var(--chats-list-width)] lg:shrink-0"
          style={chatListPanelStyle}
        >
          <button
            aria-label="Resize chats list"
            className={`absolute inset-y-0 -left-3 z-10 hidden w-6 items-center justify-center !cursor-ew-resize lg:flex ${
              isResizingChatList ? "bg-muted/30" : ""
            }`}
            onPointerDown={startChatListResize}
            type="button"
          >
            <span className="h-full w-px cursor-ew-resize bg-border/70" />
          </button>
          {renderChatListPanel("desktop")}
        </div>
      ) : null}
    </main>
  );
}

export function ChatsPage() {
  return (
    <Suspense fallback={<ChatsPageFallback />}>
      <ChatsPageContent />
    </Suspense>
  );
}
