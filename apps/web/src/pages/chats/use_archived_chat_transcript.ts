import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { UIEvent } from "react";
import { fetchQuery, graphql } from "react-relay";
import type { IEnvironment } from "relay-runtime";
import type { useArchivedChatTranscriptQuery } from "./__generated__/useArchivedChatTranscriptQuery.graphql";
import type { SessionMessageRecord, SessionRecord } from "./chats_page_data";
import {
  CHAT_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX,
  mergeTranscriptMessages,
  toTranscriptMessagesFromConnection,
} from "./chats_page_helpers";

const ARCHIVED_CHAT_TRANSCRIPT_PAGE_SIZE = 50;
const ARCHIVED_CHAT_TRANSCRIPT_BOTTOM_LOAD_THRESHOLD_PX = 520;

const useArchivedChatTranscriptQueryNode = graphql`
  query useArchivedChatTranscriptQuery($sessionId: ID!, $first: Int!, $after: String) {
    ArchivedSessionTranscriptMessages(sessionId: $sessionId, first: $first, after: $after) {
      edges {
        cursor
        node {
          ...chatsPageDataChatTranscriptPaneMessageFragment @relay(mask: false)
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Loads archived transcripts in natural reading order and appends later message pages as the
 * viewer approaches the bottom of the read-only transcript.
 */
export function useArchivedChatTranscript({
  environment,
  selectedSession,
  setErrorMessage,
}: {
  environment: IEnvironment;
  selectedSession: SessionRecord;
  setErrorMessage: (message: string | null) => void;
}) {
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const transcriptRequestIdRef = useRef(0);
  const transcriptEndCursorRef = useRef<string | null>(null);
  const transcriptHasNextPageRef = useRef(false);
  const isLoadingMoreTranscriptRef = useRef(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isLoadingMoreTranscript, setIsLoadingMoreTranscript] = useState(false);
  const [isTranscriptStuckToBottom, setIsTranscriptStuckToBottom] = useState(true);
  const [transcriptHasNextPage, setTranscriptHasNextPage] = useState(false);
  const [transcriptMessages, setTranscriptMessages] = useState<SessionMessageRecord[]>([]);
  const stableTranscriptMessages = useMemo(() => transcriptMessages, [transcriptMessages]);

  const applyPaginationState = useCallback((endCursor: string | null, hasNextPage: boolean) => {
    transcriptEndCursorRef.current = endCursor;
    transcriptHasNextPageRef.current = hasNextPage;
    setTranscriptHasNextPage(hasNextPage);
  }, []);

  const updateBottomStickiness = useCallback((transcriptNode: HTMLDivElement | null) => {
    if (!transcriptNode) {
      setIsTranscriptStuckToBottom(true);
      return;
    }

    const remainingScrollDistance = transcriptNode.scrollHeight
      - transcriptNode.scrollTop
      - transcriptNode.clientHeight;
    setIsTranscriptStuckToBottom(remainingScrollDistance <= CHAT_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX);
  }, []);

  const loadTranscriptPage = useCallback(async (mode: "append" | "replace") => {
    if (mode === "append" && isLoadingMoreTranscriptRef.current) {
      return;
    }
    if (mode === "append" && (!transcriptHasNextPageRef.current || !transcriptEndCursorRef.current)) {
      return;
    }

    const sessionId = selectedSession.id;
    const requestId = mode === "replace"
      ? transcriptRequestIdRef.current + 1
      : transcriptRequestIdRef.current;
    transcriptRequestIdRef.current = requestId;
    activeSessionIdRef.current = sessionId;
    setErrorMessage(null);
    if (mode === "replace") {
      applyPaginationState(null, false);
      setTranscriptMessages([]);
      setIsLoadingTranscript(true);
      setIsTranscriptStuckToBottom(false);
    } else {
      isLoadingMoreTranscriptRef.current = true;
      setIsLoadingMoreTranscript(true);
    }

    try {
      const response = await fetchQuery<useArchivedChatTranscriptQuery>(
        environment,
        useArchivedChatTranscriptQueryNode,
        {
          after: mode === "append" ? transcriptEndCursorRef.current : null,
          first: ARCHIVED_CHAT_TRANSCRIPT_PAGE_SIZE,
          sessionId,
        },
        {
          fetchPolicy: "network-only",
        },
      ).toPromise();

      if (transcriptRequestIdRef.current !== requestId || activeSessionIdRef.current !== sessionId) {
        return;
      }

      const connection = response?.ArchivedSessionTranscriptMessages;
      const nextMessages = toTranscriptMessagesFromConnection(connection);
      setTranscriptMessages((currentMessages) => {
        return mode === "append" ? mergeTranscriptMessages(currentMessages, nextMessages) : nextMessages;
      });
      applyPaginationState(
        connection?.pageInfo.endCursor ?? null,
        Boolean(connection?.pageInfo.hasNextPage),
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load archived transcript.");
    } finally {
      if (mode === "replace") {
        setIsLoadingTranscript(false);
      } else {
        isLoadingMoreTranscriptRef.current = false;
        setIsLoadingMoreTranscript(false);
      }
    }
  }, [applyPaginationState, environment, selectedSession.id, setErrorMessage]);

  useEffect(() => {
    void loadTranscriptPage("replace");
  }, [loadTranscriptPage]);

  const handleTranscriptScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const transcriptNode = event.currentTarget;
    updateBottomStickiness(transcriptNode);
    const remainingScrollDistance = transcriptNode.scrollHeight
      - transcriptNode.scrollTop
      - transcriptNode.clientHeight;
    if (remainingScrollDistance <= ARCHIVED_CHAT_TRANSCRIPT_BOTTOM_LOAD_THRESHOLD_PX) {
      void loadTranscriptPage("append");
    }
  }, [loadTranscriptPage, updateBottomStickiness]);

  const handleTranscriptWheel = useCallback(() => {
    updateBottomStickiness(transcriptScrollRef.current);
  }, [updateBottomStickiness]);

  const jumpToLatestMessage = useCallback(() => {
    const transcriptNode = transcriptScrollRef.current;
    if (!transcriptNode) {
      return;
    }

    transcriptNode.scrollTo({
      behavior: "smooth",
      top: transcriptNode.scrollHeight,
    });
    setIsTranscriptStuckToBottom(true);
  }, []);

  return {
    handleTranscriptScroll,
    handleTranscriptWheel,
    isTranscriptStuckToBottom,
    isLoadingMoreTranscript,
    isLoadingTranscript,
    jumpToLatestMessage,
    transcriptHasNextPage,
    transcriptMessages: stableTranscriptMessages,
    transcriptScrollRef,
  };
}
