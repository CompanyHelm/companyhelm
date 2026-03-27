import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MutableRefObject, PointerEvent as ReactPointerEvent, UIEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArchiveIcon, Loader2Icon, PanelLeftIcon, PlusIcon, SendHorizonalIcon, WrenchIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { fetchQuery, graphql, requestSubscription, useLazyLoadQuery, useMutation, useRelayEnvironment } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { chatsPageArchiveSessionMutation } from "./__generated__/chatsPageArchiveSessionMutation.graphql";
import type { chatsPageCreateSessionMutation } from "./__generated__/chatsPageCreateSessionMutation.graphql";
import type { chatsPagePromptSessionMutation } from "./__generated__/chatsPagePromptSessionMutation.graphql";
import type { chatsPageQuery } from "./__generated__/chatsPageQuery.graphql";
import type { chatsPageSessionMessageUpdatedSubscription } from "./__generated__/chatsPageSessionMessageUpdatedSubscription.graphql";
import type { chatsPageSessionUpdatedSubscription } from "./__generated__/chatsPageSessionUpdatedSubscription.graphql";
import type { chatsPageTranscriptQuery } from "./__generated__/chatsPageTranscriptQuery.graphql";

const chatsPageQueryNode = graphql`
  query chatsPageQuery {
    Agents {
      id
      name
      modelProvider
      modelName
      reasoningLevel
    }
    Sessions {
      id
      agentId
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
          role
          status
          toolCallId
          toolName
          contents {
            type
            text
            data
            mimeType
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

const chatsPageCreateSessionMutationNode = graphql`
  mutation chatsPageCreateSessionMutation($input: CreateSessionInput!) {
    CreateSession(input: $input) {
      id
      agentId
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

const chatsPageSessionMessageUpdatedSubscriptionNode = graphql`
  subscription chatsPageSessionMessageUpdatedSubscription($sessionId: ID!) {
    SessionMessageUpdated(sessionId: $sessionId) {
      id
      sessionId
      role
      status
      toolCallId
      toolName
      contents {
        type
        text
        data
        mimeType
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
type SessionRecord = chatsPageQuery["response"]["Sessions"][number];
type SessionTranscriptConnection = chatsPageTranscriptQuery["response"]["SessionTranscriptMessages"];
type SessionTranscriptEdgeRecord = SessionTranscriptConnection["edges"][number];
type SessionMessageRecord = SessionTranscriptEdgeRecord["node"];
type ChatsPageSearch = {
  agentId?: string;
  sessionId?: string;
};

const CHAT_LIST_MIN_WIDTH = 280;
const CHAT_LIST_MAX_WIDTH = 520;
const CHAT_LIST_DEFAULT_WIDTH = 352;
const CHAT_LIST_WIDTH_STORAGE_KEY = "companyhelm.chats.listWidth";
const CHAT_LIST_HIDDEN_STORAGE_KEY = "companyhelm.chats.listHidden";
const CHAT_DRAFT_MIN_LINES = 3;
const CHAT_DRAFT_MAX_LINES = 10;
const CHAT_TRANSCRIPT_PAGE_SIZE = 50;
const CHAT_TRANSCRIPT_TOP_LOAD_THRESHOLD_PX = 96;
const CHAT_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX = 96;
const CHAT_LIST_LEFT_GUTTER_CLASS = "pl-3 md:pl-4";
const CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS = "pl-5 md:pl-6";
const CHAT_LIST_SESSION_TEXT_GUTTER_CLASS = "pl-4";
const CHAT_HIDDEN_LIST_HEADER_GUTTER_CLASS = "pl-10";
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

function loadChatListHidden(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(CHAT_LIST_HIDDEN_STORAGE_KEY) === "true";
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

function toTranscriptMessagesFromConnection(connection: SessionTranscriptConnection | null | undefined): SessionMessageRecord[] {
  return [...(connection?.edges ?? [])]
    .map((edge) => edge?.node)
    .filter((message): message is SessionMessageRecord => Boolean(message))
    .sort(compareSessionMessagesByTimestamp);
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
          <blockquote className="border-l-2 border-border/70 pl-4 text-muted-foreground">
            {children}
          </blockquote>
        ),
        code: ({ children, className, ...codeProps }) => (
          <code
            {...codeProps}
            className={className || "rounded bg-muted px-1 py-0.5 font-mono text-[13px] text-foreground"}
          >
            {children}
          </code>
        ),
        h1: ({ children }) => <h1 className="text-lg font-semibold text-foreground">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-semibold text-foreground">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground">{children}</h3>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        ol: ({ children }) => <ol className="ml-5 grid list-decimal gap-2">{children}</ol>,
        p: ({ children }) => <p className="text-sm leading-7 text-pretty text-foreground">{children}</p>,
        pre: ({ children }) => (
          <pre className="my-1 overflow-x-auto rounded-xl border border-border/60 bg-muted/30 px-4 py-3 font-mono text-[13px] leading-6 text-foreground">
            {children}
          </pre>
        ),
        ul: ({ children }) => <ul className="ml-5 grid list-disc gap-2">{children}</ul>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

function ChatsThinkingIndicator({ text }: { text: string | null | undefined }) {
  const displayText = typeof text === "string" && text.trim().length > 0 ? text : "Thinking...";

  return (
    <>
      <style>{CHATS_THINKING_GRADIENT_KEYFRAMES}</style>
      <div className={`${CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS} shrink-0 pt-2`}>
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
          {displayText}
        </p>
      </div>
    </>
  );
}

function ToolTranscriptMessage({ message }: { message: SessionMessageRecord }) {
  const statusLabel = message.status.trim().toLowerCase() === "running"
    ? "Running"
    : message.isError
    ? "Error"
    : "Success";
  const visibleContents = message.contents.filter((content) => {
    if (content.type === "text") {
      return typeof content.text === "string" && content.text.trim().length > 0;
    }
    if (content.type === "image") {
      return typeof content.data === "string" && content.data.length > 0;
    }

    return false;
  });

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        <WrenchIcon className="size-4 shrink-0" />
        <span>{message.toolName ?? "Tool"}</span>
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground/70">{statusLabel}</span>
      </div>
      {visibleContents.length > 0 ? (
        <div className="mt-3 grid gap-3">
          {visibleContents.map((content, contentIndex) => {
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
                className="whitespace-pre-wrap break-words font-mono text-[13px] leading-6 text-foreground"
              >
                {content.text}
              </pre>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {message.status.trim().toLowerCase() === "running" ? "Waiting for tool output..." : "No tool output."}
        </p>
      )}
    </div>
  );
}

function ChatsTranscript({
  session,
  sessionMessages,
  transcriptScrollRef,
  hasOlderMessages,
  isLoadingOlderMessages,
  isLoadingTranscript,
  onScroll,
}: {
  session: SessionRecord;
  sessionMessages: ReadonlyArray<SessionMessageRecord>;
  transcriptScrollRef: MutableRefObject<HTMLDivElement | null>;
  hasOlderMessages: boolean;
  isLoadingOlderMessages: boolean;
  isLoadingTranscript: boolean;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
}) {
  const visibleTranscriptMessages = sessionMessages.filter((message) => {
    if (message.role === "toolResult") {
      return typeof message.toolName === "string" && message.toolName.trim().length > 0;
    }

    return (message.role === "user" || message.role === "assistant") && message.text.trim().length > 0;
  });
  const fallbackTitle = resolveSessionTitle(session, sessionMessages);

  if (visibleTranscriptMessages.length === 0 && isLoadingTranscript) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl bg-muted/20 px-4 py-10 text-center">
        <div>
          <p className="text-sm font-medium text-foreground">Loading transcript...</p>
          <p className="mt-2 text-xs/relaxed text-muted-foreground">
            Fetching the latest chat history page.
          </p>
        </div>
      </div>
    );
  }

  if (visibleTranscriptMessages.length === 0) {
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
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
      onScroll={onScroll}
    >
      {(hasOlderMessages || isLoadingOlderMessages) ? (
        <p className="px-1 text-xs text-muted-foreground">
          {isLoadingOlderMessages ? "Loading older messages..." : "Scroll up to load older messages."}
        </p>
      ) : null}
      {visibleTranscriptMessages.map((message) => {
        const isUserMessage = message.role === "user";
        const isToolMessage = message.role === "toolResult";

        return (
          <div
            key={message.id}
            className={`w-full ${isUserMessage ? "flex justify-end" : CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS}`}
          >
            <div
              className={`${
                isUserMessage
                  ? "w-fit max-w-[80%] rounded-2xl bg-primary px-4 py-3 text-right text-primary-foreground"
                  : isToolMessage
                  ? "w-full px-0 py-0 text-foreground"
                  : "w-full px-0 py-0 text-foreground"
              }`}
            >
              {isUserMessage ? (
                <p className="whitespace-pre-wrap text-right text-sm">{message.text}</p>
              ) : isToolMessage ? (
                <ToolTranscriptMessage message={message} />
              ) : (
                <div className="grid w-full gap-4 text-left">
                  <AssistantTranscriptMessage text={message.text} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChatsPageContent() {
  const navigate = useNavigate();
  const environment = useRelayEnvironment();
  const search = useSearch({ strict: false }) as ChatsPageSearch;
  const [draftMessage, setDraftMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(null);
  const [pendingCreatedSessionId, setPendingCreatedSessionId] = useState<string | null>(null);
  const [chatListWidth, setChatListWidth] = useState(loadChatListWidth);
  const [isChatListHidden, setIsChatListHidden] = useState(loadChatListHidden);
  const [isResizingChatList, setIsResizingChatList] = useState(false);
  const [draftTextareaHeight, setDraftTextareaHeight] = useState<number | null>(null);
  const [isResizingDraftTextarea, setIsResizingDraftTextarea] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(CHAT_LIST_DEFAULT_WIDTH);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextareaResizeStartHeightRef = useRef(0);
  const draftTextareaResizeStartYRef = useRef(0);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingTranscriptScrollRestoreRef = useRef<{ previousScrollHeight: number; previousScrollTop: number } | null>(
    null,
  );
  const shouldStickTranscriptToBottomRef = useRef(true);
  const transcriptRequestIdRef = useRef(0);
  const activeTranscriptSessionIdRef = useRef<string | null>(null);
  const [sessionTitleOverridesById, setSessionTitleOverridesById] = useState<Record<string, string>>({});
  const [transcriptMessages, setTranscriptMessages] = useState<SessionMessageRecord[]>([]);
  const [transcriptHasNextPage, setTranscriptHasNextPage] = useState(false);
  const [transcriptEndCursor, setTranscriptEndCursor] = useState<string | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isLoadingOlderTranscript, setIsLoadingOlderTranscript] = useState(false);
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

  const sortedAgents = useMemo(() => {
    return [...data.Agents].sort((leftAgent, rightAgent) => leftAgent.name.localeCompare(rightAgent.name));
  }, [data.Agents]);
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
  const selectedSessionMessages = selectedSession ? transcriptMessages : [];
  const isSubmittingDraft = isCreateSessionInFlight || isPromptSessionInFlight;
  const canSubmitDraft = Boolean(selectedAgent && draftMessage.trim().length > 0) && !isSubmittingDraft;
  const chatListPanelStyle = {
    "--chats-list-width": `${chatListWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CHAT_LIST_WIDTH_STORAGE_KEY, String(chatListWidth));
  }, [chatListWidth]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CHAT_LIST_HIDDEN_STORAGE_KEY, String(isChatListHidden));
  }, [isChatListHidden]);

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

    if (isLoadingOlderTranscript) {
      return;
    }

    setErrorMessage(null);
    const transcriptNode = transcriptScrollRef.current;
    if (transcriptNode) {
      pendingTranscriptScrollRestoreRef.current = {
        previousScrollHeight: transcriptNode.scrollHeight,
        previousScrollTop: transcriptNode.scrollTop,
      };
    }

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
      setIsLoadingOlderTranscript(false);
    }
  }, [
    environment,
    isLoadingOlderTranscript,
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
      transcriptRequestIdRef.current += 1;
      activeTranscriptSessionIdRef.current = null;
      pendingTranscriptScrollRestoreRef.current = null;
      shouldStickTranscriptToBottomRef.current = true;
      setTranscriptMessages([]);
      setTranscriptHasNextPage(false);
      setTranscriptEndCursor(null);
      setIsLoadingTranscript(false);
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
    if (!isResizingChatList) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - resizeStartXRef.current;
      setChatListWidth(clampChatListWidth(resizeStartWidthRef.current + delta));
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

    if (pendingTranscriptScrollRestoreRef.current) {
      const { previousScrollHeight, previousScrollTop } = pendingTranscriptScrollRestoreRef.current;
      const scrollHeightDelta = transcriptNode.scrollHeight - previousScrollHeight;
      transcriptNode.scrollTop = previousScrollTop + scrollHeightDelta;
      pendingTranscriptScrollRestoreRef.current = null;
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
      onError: (error) => {
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [environment]);

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

  const openDraftForAgent = async (agentId: string) => {
    setErrorMessage(null);
    setDraftMessage("");
    await navigate({
      to: "/chats",
      search: {
        agentId,
      },
    });
  };

  const openSession = async (agentId: string, sessionId: string) => {
    setErrorMessage(null);
    await navigate({
      to: "/chats",
      search: {
        agentId,
        sessionId,
      },
    });
  };

  const startSession = async () => {
    if (!selectedAgent) {
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
    if (!selectedSession) {
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

  const startChatListResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = chatListWidth;
    setIsResizingChatList(true);
  };

  const hideChatList = () => {
    setIsResizingChatList(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setIsChatListHidden(true);
  };

  const showChatList = () => {
    setIsChatListHidden(false);
  };

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
  const chatHeaderContentClassName = isChatListHidden
    ? CHAT_HIDDEN_LIST_HEADER_GUTTER_CLASS
    : selectedSession
      ? CHAT_TRANSCRIPT_LEFT_GUTTER_CLASS
      : "";

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      {!isChatListHidden ? (
        <div
          className="relative min-h-0 overflow-hidden w-full lg:w-[var(--chats-list-width)] lg:shrink-0"
          style={chatListPanelStyle}
        >
          <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
            <CardContent className={`no-scrollbar min-h-0 flex-1 overflow-y-auto ${CHAT_LIST_LEFT_GUTTER_CLASS} pr-3 md:pr-3`}>
              <div className="mb-2 flex items-center justify-end pr-1">
                <Button
                  aria-label="Hide chats list"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={hideChatList}
                  size="icon-sm"
                  title="Hide chats list"
                  variant="ghost"
                >
                  <PanelLeftIcon className="size-4" />
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
                                      className={`relative min-w-0 overflow-hidden ${CHAT_LIST_SESSION_TEXT_GUTTER_CLASS} text-left`}
                                      disabled={isSessionArchiving}
                                      onClick={() => {
                                        void openSession(agent.id, session.id);
                                      }}
                                      type="button"
                                    >
                                      <span className="absolute left-0 top-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                                        <Loader2Icon
                                          aria-hidden={!isSessionRunning}
                                          className={`size-3.5 text-muted-foreground ${isSessionRunning ? "animate-spin opacity-100" : "opacity-0"}`}
                                          title={isSessionRunning ? "Session running" : undefined}
                                        />
                                      </span>
                                      <p className="block min-w-0 truncate text-xs font-medium text-foreground">
                                        {resolveSessionTitleOverride(session, sessionTitleOverridesById)}
                                      </p>
                                      <p className="mt-1 block w-full truncate text-[0.7rem] text-muted-foreground">
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
          <button
            aria-label="Resize chats list"
            className={`absolute inset-y-0 -right-3 z-10 hidden w-6 items-center justify-center !cursor-ew-resize lg:flex ${
              isResizingChatList ? "bg-muted/30" : ""
            }`}
            onPointerDown={startChatListResize}
            type="button"
          >
            <span className="h-full w-px cursor-ew-resize bg-border/70" />
          </button>
        </div>
      ) : null}

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
        <CardHeader className="shrink-0 px-4 md:px-4">
          <div className={`relative flex min-w-0 flex-col gap-1 ${chatHeaderContentClassName}`}>
            {isChatListHidden ? (
              <Button
                aria-label="Show chats list"
                className="absolute left-0 top-0.5 text-muted-foreground hover:text-foreground"
                onClick={showChatList}
                size="icon-sm"
                title="Show chats list"
                variant="ghost"
              >
                <PanelLeftIcon className="size-4" />
              </Button>
            ) : null}

            <CardTitle className="min-w-0">
              {selectedSession
                ? resolveSessionTitle(selectedSession, selectedSessionMessages)
                : selectedAgent
                  ? selectedAgent.name
                  : "Chat"}
            </CardTitle>

            <CardDescription>
              {selectedSession
                ? `Updated ${formatTimestamp(selectedSession.updatedAt)}`
                : !selectedAgent
                  ? isChatListHidden
                    ? "Show the chats list to start a chat."
                    : "Choose an agent from the sidebar to start a chat."
                  : null}
            </CardDescription>
          </div>
        </CardHeader>

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
                <p className="mt-2 text-xs/relaxed text-muted-foreground">{formatAgentMeta(selectedAgent)}</p>
              </div>
            </div>
          </CardContent>
        ) : null}

        {selectedAgent && selectedSession ? (
          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-3 md:py-4">
            <ChatsTranscript
              hasOlderMessages={transcriptHasNextPage}
              isLoadingOlderMessages={isLoadingOlderTranscript}
              isLoadingTranscript={isLoadingTranscript}
              onScroll={handleTranscriptScroll}
              session={selectedSession}
              sessionMessages={selectedSessionMessages}
              transcriptScrollRef={transcriptScrollRef}
            />
            {selectedSession.isThinking ? <ChatsThinkingIndicator text={selectedSession.thinkingText} /> : null}
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
                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-background/60 px-3 py-1.5">
                    {selectedAgent.modelName || "Default model"}
                  </span>
                  <span className="rounded-full bg-background/60 px-3 py-1.5">
                    {selectedAgent.reasoningLevel || "Default reasoning"}
                  </span>
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
