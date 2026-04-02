import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { MessageSquareTextIcon, XIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { useApplicationHeader } from "@/components/layout/application_breadcrumb_context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { ConversationList, type ConversationListRecord } from "./conversation_list";
import {
  ConversationTranscript,
  type ConversationMessageRecord,
} from "./conversation_transcript";
import type { conversationsPageListQuery } from "./__generated__/conversationsPageListQuery.graphql";
import type { conversationsPageMessagesQuery } from "./__generated__/conversationsPageMessagesQuery.graphql";

type ConversationsPageSearch = {
  conversationId?: string;
};

const CONVERSATION_LIST_MIN_WIDTH = 280;
const CONVERSATION_LIST_MAX_WIDTH = 520;
const CONVERSATION_LIST_DEFAULT_WIDTH = 352;
const CONVERSATION_LIST_WIDTH_STORAGE_KEY = "companyhelm.conversations.listWidth";

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
  query conversationsPageMessagesQuery($conversationId: ID) {
    AgentConversationMessages(conversationId: $conversationId) {
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
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function ConversationsPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as ConversationsPageSearch;
  const isMobile = useIsMobile();
  const [conversationListWidth, setConversationListWidth] = useState(loadConversationListWidth);
  const [isConversationListHidden, setIsConversationListHidden] = useState(false);
  const [isMobileConversationListOpen, setIsMobileConversationListOpen] = useState(false);
  const [isResizingConversationList, setIsResizingConversationList] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(CONVERSATION_LIST_DEFAULT_WIDTH);
  const listData = useLazyLoadQuery<conversationsPageListQuery>(
    conversationsPageListQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );

  const conversations: ConversationListRecord[] = listData.AgentConversations.map((conversation) => ({
    createdAt: conversation.createdAt,
    id: conversation.id,
    latestMessageAt: conversation.latestMessageAt,
    latestMessagePreview: conversation.latestMessagePreview,
    participants: conversation.participants.map((participant) => ({
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
  const messagesData = useLazyLoadQuery<conversationsPageMessagesQuery>(
    conversationsPageMessagesQueryNode,
    {
      conversationId: selectedConversationId ?? null,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const messages: ConversationMessageRecord[] = selectedConversationId
    ? messagesData.AgentConversationMessages.map((message) => ({
      authorAgentId: message.authorAgentId,
      authorAgentName: message.authorAgentName,
      authorParticipantId: message.authorParticipantId,
      authorSessionId: message.authorSessionId,
      authorSessionTitle: message.authorSessionTitle,
      conversationId: message.conversationId,
      createdAt: message.createdAt,
      id: message.id,
      text: message.text,
    }))
    : [];

  const openConversation = useCallback((conversationId: string) => {
    void navigate({
      search: {
        conversationId,
      },
      to: "/conversations",
    });
  }, [navigate]);

  useEffect(() => {
    if (!selectedConversationId || selectedConversationId === search.conversationId) {
      return;
    }

    void navigate({
      replace: true,
      search: {
        conversationId: selectedConversationId,
      },
      to: "/conversations",
    });
  }, [navigate, search.conversationId, selectedConversationId]);

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
      setConversationListWidth(clampConversationListWidth(resizeStartWidthRef.current + delta));
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
          <CardContent className="no-scrollbar min-h-0 flex-1 overflow-y-auto pl-3 pr-3">
            <div className="mb-2 flex items-center justify-between gap-3 px-1">
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
            messages={messages}
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
