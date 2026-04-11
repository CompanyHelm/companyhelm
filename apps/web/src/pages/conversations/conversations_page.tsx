import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, UIEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { MessageSquareTextIcon, XIcon } from "lucide-react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { fetchQuery, graphql, useLazyLoadQuery, useMutation, useRelayEnvironment } from "react-relay";
import { useApplicationHeader } from "@/components/layout/application_breadcrumb_context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { ConversationDeleteAction } from "./conversation_delete_action";
import { ConversationList, type ConversationListRecord } from "./conversation_list";
import {
  ConversationTranscript,
  type ConversationMessageRecord,
} from "./conversation_transcript";
import type { conversationsPageDeleteAgentConversationMutation } from "./__generated__/conversationsPageDeleteAgentConversationMutation.graphql";
import type { conversationsPageListQuery } from "./__generated__/conversationsPageListQuery.graphql";
import type { conversationsPageMessagesQuery } from "./__generated__/conversationsPageMessagesQuery.graphql";

type ConversationsPageSearch = {
  conversationId?: string;
};

type ConversationMessageConnection = conversationsPageMessagesQuery["response"]["AgentConversationMessages"];
type ConversationListResponseRecord = conversationsPageListQuery["response"]["AgentConversations"][number];
type ConversationParticipantResponseRecord = ConversationListResponseRecord["participants"][number];

type ConversationTranscriptScrollRestoreRecord = {
  anchorMessageId: string | null;
  anchorOffsetTop: number;
  previousScrollHeight: number;
  previousScrollTop: number;
};

type ConversationStoreRecord = {
  getDataID(): string;
  getValue(name: string): unknown;
};

const CONVERSATION_LIST_MIN_WIDTH = 280;
const CONVERSATION_LIST_MAX_WIDTH = 520;
const CONVERSATION_LIST_DEFAULT_WIDTH = 352;
const CONVERSATION_LIST_WIDTH_STORAGE_KEY = "companyhelm.conversations.listWidth";
const CONVERSATION_TRANSCRIPT_PAGE_SIZE = 50;
const CONVERSATION_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX = 120;
const CONVERSATION_TRANSCRIPT_TOP_LOAD_THRESHOLD_PX = 96;
const CONVERSATION_TRANSCRIPT_MESSAGE_SELECTOR = "[data-conversation-message-id]";

const conversationsPageListQueryNode = graphql`
  query conversationsPageListQuery {
    AgentConversations {
      id
      latestMessagePreview
      latestMessageAt
      createdAt
      updatedAt
      participants {
        id
        agentId
        agentName
        sessionId
        sessionTitle
      }
    }
  }
`;

const conversationsPageMessagesQueryNode = graphql`
  query conversationsPageMessagesQuery($conversationId: ID, $first: Int!, $after: String) {
    AgentConversationMessages(conversationId: $conversationId, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          conversationId
          authorParticipantId
          authorAgentId
          authorAgentName
          authorSessionId
          authorSessionTitle
          text
          createdAt
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

const conversationsPageDeleteAgentConversationMutationNode = graphql`
  mutation conversationsPageDeleteAgentConversationMutation($input: DeleteAgentConversationInput!) {
    DeleteAgentConversation(input: $input) {
      deletedConversationId
    }
  }
`;

function ConversationsPageFallback() {
  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <div className="min-h-0 flex-1 rounded-2xl border border-border/60 bg-card" />
      <div className="hidden min-h-0 w-[352px] shrink-0 rounded-2xl border border-border/60 bg-card lg:block" />
    </main>
  );
}

function clampConversationListWidth(width: number): number {
  return Math.min(CONVERSATION_LIST_MAX_WIDTH, Math.max(CONVERSATION_LIST_MIN_WIDTH, width));
}

function loadConversationListWidth(): number {
  if (typeof window === "undefined") {
    return CONVERSATION_LIST_DEFAULT_WIDTH;
  }

  const storedWidth = Number(window.localStorage.getItem(CONVERSATION_LIST_WIDTH_STORAGE_KEY));
  if (!Number.isFinite(storedWidth)) {
    return CONVERSATION_LIST_DEFAULT_WIDTH;
  }

  return clampConversationListWidth(storedWidth);
}

function formatConversationTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function compareConversationMessagesByTimestamp(
  leftMessage: Pick<ConversationMessageRecord, "createdAt" | "id">,
  rightMessage: Pick<ConversationMessageRecord, "createdAt" | "id">,
): number {
  const timestampDelta =
    new Date(leftMessage.createdAt).getTime() - new Date(rightMessage.createdAt).getTime();
  if (timestampDelta !== 0) {
    return timestampDelta;
  }

  return leftMessage.id.localeCompare(rightMessage.id);
}

function toConversationMessagesFromConnection(
  connection: ConversationMessageConnection | null | undefined,
): ConversationMessageRecord[] {
  return [...(connection?.edges ?? [])]
    .map((edge) => edge?.node)
    .filter((message): message is ConversationMessageRecord => Boolean(message))
    .sort(compareConversationMessagesByTimestamp);
}

function mergeConversationMessages(
  existingMessages: ReadonlyArray<ConversationMessageRecord>,
  incomingMessages: ReadonlyArray<ConversationMessageRecord>,
): ConversationMessageRecord[] {
  const nextMessagesById = new Map<string, ConversationMessageRecord>();

  for (const message of existingMessages) {
    nextMessagesById.set(message.id, message);
  }
  for (const message of incomingMessages) {
    nextMessagesById.set(message.id, message);
  }

  return [...nextMessagesById.values()].sort(compareConversationMessagesByTimestamp);
}

function filterStoreRecords(records: ReadonlyArray<unknown>): ConversationStoreRecord[] {
  return records.filter((record): record is ConversationStoreRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function captureTranscriptScrollRestoreRecord(
  transcriptNode: HTMLDivElement,
): ConversationTranscriptScrollRestoreRecord {
  const transcriptRect = transcriptNode.getBoundingClientRect();
  const transcriptMessageElements = transcriptNode.querySelectorAll<HTMLElement>(
    CONVERSATION_TRANSCRIPT_MESSAGE_SELECTOR,
  );

  for (const transcriptMessageElement of transcriptMessageElements) {
    const messageRect = transcriptMessageElement.getBoundingClientRect();
    if (messageRect.bottom <= transcriptRect.top) {
      continue;
    }

    return {
      anchorMessageId: transcriptMessageElement.dataset.conversationMessageId ?? null,
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
  restoreRecord: ConversationTranscriptScrollRestoreRecord,
) {
  const {
    anchorMessageId,
    anchorOffsetTop,
    previousScrollHeight,
    previousScrollTop,
  } = restoreRecord;
  const anchorElement = anchorMessageId
    ? [...transcriptNode.querySelectorAll<HTMLElement>(CONVERSATION_TRANSCRIPT_MESSAGE_SELECTOR)]
      .find((transcriptMessageElement) => transcriptMessageElement.dataset.conversationMessageId === anchorMessageId)
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

function ConversationsPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const environment = useRelayEnvironment();
  const search = useSearch({ strict: false }) as ConversationsPageSearch;
  const isMobile = useIsMobile();
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ConversationMessageRecord[]>([]);
  const transcriptHasNextPageRef = useRef(false);
  const transcriptEndCursorRef = useRef<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const transcriptRequestIdRef = useRef(0);
  const isLoadingOlderTranscriptRef = useRef(false);
  const pendingTranscriptScrollRestoreRef = useRef<ConversationTranscriptScrollRestoreRecord | null>(null);
  const transcriptScrollRestoreAnimationFrameRef = useRef<number | null>(null);
  const shouldStickTranscriptToBottomRef = useRef(true);
  const [conversationListWidth, setConversationListWidth] = useState(loadConversationListWidth);
  const [isConversationListHidden, setIsConversationListHidden] = useState(false);
  const [isMobileConversationListOpen, setIsMobileConversationListOpen] = useState(false);
  const [isResizingConversationList, setIsResizingConversationList] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessageRecord[]>([]);
  const [transcriptHasNextPage, setTranscriptHasNextPage] = useState(false);
  const [transcriptEndCursor, setTranscriptEndCursor] = useState<string | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isLoadingOlderTranscript, setIsLoadingOlderTranscript] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(CONVERSATION_LIST_DEFAULT_WIDTH);
  const listData = useLazyLoadQuery<conversationsPageListQuery>(
    conversationsPageListQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitDeleteConversation] = useMutation<conversationsPageDeleteAgentConversationMutation>(
    conversationsPageDeleteAgentConversationMutationNode,
  );

  const cancelTranscriptScrollRestoreAnimationFrame = useCallback(() => {
    if (transcriptScrollRestoreAnimationFrameRef.current === null) {
      return;
    }

    cancelAnimationFrame(transcriptScrollRestoreAnimationFrameRef.current);
    transcriptScrollRestoreAnimationFrameRef.current = null;
  }, []);

  const conversations: ConversationListRecord[] = listData.AgentConversations.map((conversation: ConversationListResponseRecord) => ({
    createdAt: conversation.createdAt,
    id: conversation.id,
    latestMessageAt: conversation.latestMessageAt,
    latestMessagePreview: conversation.latestMessagePreview,
    participants: conversation.participants.map((participant: ConversationParticipantResponseRecord) => ({
      agentId: participant.agentId,
      agentName: participant.agentName,
      id: participant.id,
      sessionId: participant.sessionId,
      sessionTitle: participant.sessionTitle,
    })),
    updatedAt: conversation.updatedAt,
  }));
  const selectedConversationId = conversations.some((conversation) => conversation.id === search.conversationId)
    ? search.conversationId
    : conversations[0]?.id;
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
  const selectedConversationUpdatedAt = selectedConversation?.latestMessageAt
    ?? selectedConversation?.updatedAt
    ?? selectedConversation?.createdAt
    ?? null;
  const selectedConversationLabel = selectedConversation
    ? selectedConversation.participants.map((participant) => participant.agentName).join(" / ")
    : null;

  const clearTranscriptState = useCallback(() => {
    messagesRef.current = [];
    transcriptHasNextPageRef.current = false;
    transcriptEndCursorRef.current = null;
    setMessages([]);
    setTranscriptHasNextPage(false);
    setTranscriptEndCursor(null);
  }, []);

  const applyTranscriptState = useCallback((nextState: {
    endCursor: string | null;
    hasNextPage: boolean;
    messages: ConversationMessageRecord[];
  }) => {
    messagesRef.current = nextState.messages;
    transcriptHasNextPageRef.current = nextState.hasNextPage;
    transcriptEndCursorRef.current = nextState.endCursor;
    setMessages(nextState.messages);
    setTranscriptHasNextPage(nextState.hasNextPage);
    setTranscriptEndCursor(nextState.endCursor);
  }, []);

  const loadTranscriptPage = useCallback(async ({
    after = null,
    conversationId,
    mode,
  }: {
    after?: string | null;
    conversationId: string;
    mode: "prepend" | "replace";
  }) => {
    if (mode === "replace") {
      const requestId = transcriptRequestIdRef.current + 1;
      transcriptRequestIdRef.current = requestId;
      activeConversationIdRef.current = conversationId;
      cancelTranscriptScrollRestoreAnimationFrame();
      pendingTranscriptScrollRestoreRef.current = null;
      shouldStickTranscriptToBottomRef.current = true;
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingOlderTranscript(false);
      setErrorMessage(null);
      clearTranscriptState();
      setIsLoadingTranscript(true);

      try {
        const response = await fetchQuery<conversationsPageMessagesQuery>(
          environment,
          conversationsPageMessagesQueryNode,
          {
            after: null,
            conversationId,
            first: CONVERSATION_TRANSCRIPT_PAGE_SIZE,
          },
        ).toPromise();

        if (
          transcriptRequestIdRef.current !== requestId
          || activeConversationIdRef.current !== conversationId
        ) {
          return;
        }

        const connection = response?.AgentConversationMessages;
        applyTranscriptState({
          endCursor: connection?.pageInfo.endCursor ?? null,
          hasNextPage: Boolean(connection?.pageInfo.hasNextPage),
          messages: toConversationMessagesFromConnection(connection),
        });
      } catch (error) {
        if (transcriptRequestIdRef.current === requestId) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load conversation transcript.");
        }
      } finally {
        if (
          transcriptRequestIdRef.current === requestId
          && activeConversationIdRef.current === conversationId
        ) {
          setIsLoadingTranscript(false);
        }
      }
      return;
    }

    if (isLoadingOlderTranscriptRef.current) {
      return;
    }

    setErrorMessage(null);
    shouldStickTranscriptToBottomRef.current = false;
    const transcriptNode = transcriptScrollRef.current;
    if (transcriptNode) {
      pendingTranscriptScrollRestoreRef.current = captureTranscriptScrollRestoreRecord(transcriptNode);
    }

    isLoadingOlderTranscriptRef.current = true;
    setIsLoadingOlderTranscript(true);

    try {
      const response = await fetchQuery<conversationsPageMessagesQuery>(
        environment,
        conversationsPageMessagesQueryNode,
        {
          after,
          conversationId,
          first: CONVERSATION_TRANSCRIPT_PAGE_SIZE,
        },
      ).toPromise();

      if (activeConversationIdRef.current !== conversationId) {
        return;
      }

      const connection = response?.AgentConversationMessages;
      const nextMessages = toConversationMessagesFromConnection(connection);
      applyTranscriptState({
        endCursor: connection?.pageInfo.endCursor ?? null,
        hasNextPage: Boolean(connection?.pageInfo.hasNextPage),
        messages: mergeConversationMessages(messagesRef.current, nextMessages),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load older messages.");
      pendingTranscriptScrollRestoreRef.current = null;
    } finally {
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingOlderTranscript(false);
    }
  }, [
    applyTranscriptState,
    cancelTranscriptScrollRestoreAnimationFrame,
    clearTranscriptState,
    environment,
  ]);

  const openConversation = useCallback((conversationId: string) => {
    void navigate({
      params: {
        organizationSlug,
      },
      search: {
        conversationId,
      },
      to: OrganizationPath.route("/conversations"),
    });
  }, [navigate, organizationSlug]);

  useEffect(() => {
    if (!selectedConversationId) {
      if (!search.conversationId) {
        return;
      }

      void navigate({
        params: {
          organizationSlug,
        },
        replace: true,
        search: {},
        to: OrganizationPath.route("/conversations"),
      });
      return;
    }

    if (selectedConversationId === search.conversationId) {
      return;
    }

    void navigate({
      params: {
        organizationSlug,
      },
      replace: true,
      search: {
        conversationId: selectedConversationId,
      },
      to: OrganizationPath.route("/conversations"),
    });
  }, [navigate, organizationSlug, search.conversationId, selectedConversationId]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    setDeletingConversationId(conversationId);
    setErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDeleteConversation({
          variables: {
            input: {
              conversationId,
            },
          },
          updater: (store: RecordSourceSelectorProxy) => {
            const payload = store.getRootField("DeleteAgentConversation");
            const deletedConversationId = String(payload?.getValue("deletedConversationId") || "");
            if (!deletedConversationId) {
              return;
            }

            const rootRecord = store.getRoot();
            const currentConversations = filterStoreRecords(
              rootRecord.getLinkedRecords("AgentConversations") || [],
            );
            const deletedConversationRecord = currentConversations.find((conversationRecord) => {
              return String(conversationRecord.getValue("id") || "") === deletedConversationId;
            });
            rootRecord.setLinkedRecords(
              currentConversations.filter((conversationRecord) => {
                return String(conversationRecord.getValue("id") || "") !== deletedConversationId;
              }),
              "AgentConversations",
            );
            if (deletedConversationRecord) {
              store.delete?.(deletedConversationRecord.getDataID());
            }
          },
          onCompleted: (
            _response: conversationsPageDeleteAgentConversationMutation["response"],
            errors: ReadonlyArray<{ message: string }> | null | undefined,
          ) => {
            const nextErrorMessage = errors?.[0]?.message;
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete conversation.");
    } finally {
      setDeletingConversationId(null);
    }
  }, [commitDeleteConversation]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CONVERSATION_LIST_WIDTH_STORAGE_KEY, String(conversationListWidth));
  }, [conversationListWidth]);

  useEffect(() => {
    const hasSelectedConversation = Boolean(search.conversationId);

    if (isMobile) {
      setIsMobileConversationListOpen(!hasSelectedConversation);
      return;
    }

    setIsMobileConversationListOpen(false);
  }, [isMobile, search.conversationId]);

  useEffect(() => {
    if (!isResizingConversationList || isMobile) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const delta = event.clientX - resizeStartXRef.current;
      setConversationListWidth(clampConversationListWidth(resizeStartWidthRef.current - delta));
    };
    const finishResize = () => {
      setIsResizingConversationList(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isMobile, isResizingConversationList]);

  useEffect(() => {
    cancelTranscriptScrollRestoreAnimationFrame();
    pendingTranscriptScrollRestoreRef.current = null;
    setErrorMessage(null);

    if (!selectedConversationId) {
      transcriptRequestIdRef.current += 1;
      activeConversationIdRef.current = null;
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingTranscript(false);
      setIsLoadingOlderTranscript(false);
      clearTranscriptState();
      return;
    }

    void loadTranscriptPage({
      conversationId: selectedConversationId,
      mode: "replace",
    });
  }, [
    cancelTranscriptScrollRestoreAnimationFrame,
    clearTranscriptState,
    loadTranscriptPage,
    selectedConversationId,
  ]);

  useEffect(() => {
    return () => {
      cancelTranscriptScrollRestoreAnimationFrame();
    };
  }, [cancelTranscriptScrollRestoreAnimationFrame]);

  useLayoutEffect(() => {
    const transcriptNode = transcriptScrollRef.current;
    if (!transcriptNode) {
      return;
    }

    const restoreRecord = pendingTranscriptScrollRestoreRef.current;
    if (restoreRecord) {
      cancelTranscriptScrollRestoreAnimationFrame();
      pendingTranscriptScrollRestoreRef.current = null;
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
  }, [cancelTranscriptScrollRestoreAnimationFrame, messages]);

  useLayoutEffect(() => {
    const transcriptNode = transcriptScrollRef.current;
    if (
      !selectedConversationId
      || !transcriptNode
      || isLoadingTranscript
      || isLoadingOlderTranscript
      || !transcriptHasNextPage
      || !transcriptEndCursor
    ) {
      return;
    }

    const transcriptHasScrollableOverflow = transcriptNode.scrollHeight > transcriptNode.clientHeight + 1;
    if (transcriptHasScrollableOverflow) {
      return;
    }

    shouldStickTranscriptToBottomRef.current = false;
    void loadTranscriptPage({
      after: transcriptEndCursor,
      conversationId: selectedConversationId,
      mode: "prepend",
    });
  }, [
    isLoadingOlderTranscript,
    isLoadingTranscript,
    loadTranscriptPage,
    messages,
    selectedConversationId,
    transcriptEndCursor,
    transcriptHasNextPage,
  ]);

  const handleTranscriptScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const transcriptNode = event.currentTarget;
    const distanceFromBottom =
      transcriptNode.scrollHeight - transcriptNode.scrollTop - transcriptNode.clientHeight;
    shouldStickTranscriptToBottomRef.current =
      distanceFromBottom <= CONVERSATION_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX;

    const isTranscriptNearTop = transcriptNode.scrollTop <= CONVERSATION_TRANSCRIPT_TOP_LOAD_THRESHOLD_PX;
    if (!selectedConversationId || !isTranscriptNearTop || !transcriptHasNextPage || isLoadingOlderTranscript || !transcriptEndCursor) {
      return;
    }

    void loadTranscriptPage({
      after: transcriptEndCursor,
      conversationId: selectedConversationId,
      mode: "prepend",
    });
  }, [
    isLoadingOlderTranscript,
    loadTranscriptPage,
    selectedConversationId,
    transcriptEndCursor,
    transcriptHasNextPage,
  ]);

  const hideConversationList = useCallback(() => {
    if (isMobile) {
      setIsMobileConversationListOpen(false);
      return;
    }

    setIsResizingConversationList(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setIsConversationListHidden(true);
  }, [isMobile]);

  const showConversationList = useCallback(() => {
    if (isMobile) {
      setIsMobileConversationListOpen(true);
      return;
    }

    setIsConversationListHidden(false);
  }, [isMobile]);

  const startConversationListResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = conversationListWidth;
    setIsResizingConversationList(true);
  };

  const isDesktopConversationListVisible = !isMobile && !isConversationListHidden;
  const shouldShowConversationListButton = isMobile ? !isMobileConversationListOpen : isConversationListHidden;
  const conversationListPanelStyle = {
    "--conversations-list-width": `${conversationListWidth}px`,
  } as CSSProperties;
  const conversationsHeaderTitle = selectedConversation
    ? selectedConversation.participants.map((participant) => participant.agentName).join(" / ")
    : "Agent Conversations";
  const conversationsHeaderDescription = selectedConversationUpdatedAt
    ? `Updated ${formatConversationTimestamp(selectedConversationUpdatedAt)}`
    : shouldShowConversationListButton
      ? isMobile
        ? "Show the conversations panel to inspect agent threads."
        : "Show the conversations list to inspect agent threads."
      : isMobile
        ? "Choose an agent conversation from the panel."
        : "Choose an agent conversation from the list.";
  const headerAction = useMemo(() => {
    if (!shouldShowConversationListButton) {
      return null;
    }

    return (
      <Button
        aria-label={isMobile ? "Show conversations panel" : "Show conversations list"}
        className="text-muted-foreground hover:text-foreground"
        onClick={showConversationList}
        size="icon-sm"
        title={isMobile ? "Show conversations panel" : "Show conversations list"}
        variant="ghost"
      >
        <MessageSquareTextIcon className="size-4" />
      </Button>
    );
  }, [isMobile, shouldShowConversationListButton, showConversationList]);
  const headerContent = useMemo(() => {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{conversationsHeaderTitle}</p>
        {conversationsHeaderDescription ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {conversationsHeaderDescription}
          </p>
        ) : null}
      </div>
    );
  }, [conversationsHeaderDescription, conversationsHeaderTitle]);
  useApplicationHeader({
    actions: headerAction,
    content: headerContent,
  });

  const renderConversationListPanel = (panelMode: "desktop" | "mobile") => {
    const isMobilePanel = panelMode === "mobile";
    const hideButtonLabel = isMobilePanel ? "Close conversations panel" : "Hide conversations list";

    if (isMobilePanel) {
      return (
        <div className="app-shell-sidebar flex h-full flex-col bg-sidebar text-sidebar-foreground">
          <div className="flex items-center justify-between gap-3 border-b border-sidebar-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">Agent Conversations</p>
            </div>
            <Button
              aria-label={hideButtonLabel}
              className="-mr-1 shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={hideConversationList}
              size="icon-sm"
              title={hideButtonLabel}
              variant="ghost"
            >
              <XIcon className="size-4" />
            </Button>
          </div>

          <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4">
            <ConversationList
              conversations={conversations}
              emptyStateTone="mobile"
              onSelect={(conversationId) => {
                openConversation(conversationId);
                setIsMobileConversationListOpen(false);
              }}
              selectedConversationId={selectedConversationId}
              tone="mobile"
            />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
          <CardContent className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">Agent Conversations</p>
              <Button
                aria-label={hideButtonLabel}
                className="text-muted-foreground hover:text-foreground"
                onClick={hideConversationList}
                size="icon-sm"
                title={hideButtonLabel}
                variant="ghost"
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <ConversationList
              conversations={conversations}
              onSelect={openConversation}
              selectedConversationId={selectedConversationId}
            />
          </CardContent>
        </Card>
      </div>
    );
  };

  const mobileConversationListOverlay = isMobile ? (
    <Sheet open={isMobileConversationListOpen} onOpenChange={setIsMobileConversationListOpen}>
      <SheetContent
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-mobile="true"
        showCloseButton={false}
        side="right"
        className="app-shell-sidebar !w-[80vw] !max-w-[80vw] border-l border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
      >
        <div className="flex h-full w-full flex-col">{renderConversationListPanel("mobile")}</div>
      </SheetContent>
    </Sheet>
  ) : null;

  return (
    <>
      {mobileConversationListOverlay}
      <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <ConversationTranscript
            conversation={selectedConversation}
            errorMessage={errorMessage}
            headerAction={selectedConversation && selectedConversationLabel
              ? (
                <ConversationDeleteAction
                  buttonClassName="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  buttonTitle={
                    deletingConversationId === selectedConversation.id
                      ? "Deleting conversation..."
                      : "Delete conversation"
                  }
                  conversationLabel={selectedConversationLabel}
                  isDeleting={deletingConversationId === selectedConversation.id}
                  onDelete={() => deleteConversation(selectedConversation.id)}
                />
              )
              : null}
            isLoadingOlderMessages={isLoadingOlderTranscript}
            isLoadingTranscript={isLoadingTranscript}
            messages={messages}
            onScroll={handleTranscriptScroll}
            transcriptScrollRef={transcriptScrollRef}
          />
        </div>
        {isDesktopConversationListVisible ? (
          <div
            className="relative hidden min-h-0 overflow-hidden w-full lg:flex lg:w-[var(--conversations-list-width)] lg:shrink-0"
            style={conversationListPanelStyle}
          >
            <button
              aria-label="Resize conversations list"
              className={`absolute inset-y-0 -left-3 z-10 hidden w-6 items-center justify-center !cursor-ew-resize lg:flex ${
                isResizingConversationList ? "bg-muted/30" : ""
              }`}
              onPointerDown={startConversationListResize}
              type="button"
            >
              <span className="h-full w-px cursor-ew-resize bg-border/70" />
            </button>
            <div className="min-h-0 flex-1">
              {renderConversationListPanel("desktop")}
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

export function ConversationsPage() {
  return (
    <Suspense fallback={<ConversationsPageFallback />}>
      <ConversationsPageContent />
    </Suspense>
  );
}
