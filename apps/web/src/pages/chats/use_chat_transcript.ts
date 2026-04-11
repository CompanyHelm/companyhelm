import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { UIEvent } from "react";
import { fetchQuery, requestSubscription } from "react-relay";
import type { GraphQLTaggedNode, IEnvironment } from "relay-runtime";
import type {
  ChatsPageSessionMessageUpdatedSubscription,
  ChatsPageTranscriptQuery,
  SessionMessageRecord,
  SessionRecord,
} from "./chats_page_data";
import {
  chatsPageSessionMessageUpdatedSubscriptionNode,
  chatsPageTranscriptQueryNode,
} from "./chats_page_data";
import {
  captureTranscriptScrollRestoreRecord,
  CHAT_TRANSCRIPT_BOTTOM_STICKY_THRESHOLD_PX,
  CHAT_TRANSCRIPT_PAGE_SIZE,
  CHAT_TRANSCRIPT_TOP_LOAD_THRESHOLD_PX,
  mergeTranscriptMessages,
  restoreTranscriptScrollPosition,
  toTranscriptMessagesFromConnection,
  type TranscriptScrollRestoreRecord,
} from "./chats_page_helpers";

type TranscriptRetentionStore = {
  read<TResponse>(sessionId: string): {
    pageResponses: TResponse[];
    sessionUpdatedAt: string;
  } | null;
  retain(input: {
    after: string | null;
    query: GraphQLTaggedNode;
    sessionId: string;
    sessionUpdatedAt: string;
    variables: {
      after: string | null;
      first: number;
      sessionId: string;
    };
  }): void;
};

export function useChatTranscript({
  environment,
  selectedSession,
  sessionTranscriptRetentionStore,
  setErrorMessage,
  updateSessionTitleOverride,
}: {
  environment: IEnvironment;
  selectedSession: SessionRecord | null;
  sessionTranscriptRetentionStore: TranscriptRetentionStore;
  setErrorMessage: (message: string | null | ((currentMessage: string | null) => string | null)) => void;
  updateSessionTitleOverride: (sessionId: string, messages: ReadonlyArray<SessionMessageRecord>) => void;
}) {
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const transcriptScrollRestoreAnimationFrameRef = useRef<number | null>(null);
  const pendingTranscriptScrollRestoreRef = useRef<TranscriptScrollRestoreRecord | null>(null);
  const isLoadingOlderTranscriptRef = useRef(false);
  const shouldStickTranscriptToBottomRef = useRef(true);
  const transcriptRequestIdRef = useRef(0);
  const activeTranscriptSessionIdRef = useRef<string | null>(null);
  const selectedSessionUpdatedAtRef = useRef<string | null>(null);
  const transcriptMessagesRef = useRef<SessionMessageRecord[]>([]);
  const transcriptHasNextPageRef = useRef(false);
  const transcriptEndCursorRef = useRef<string | null>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<SessionMessageRecord[]>([]);
  const [transcriptHasNextPage, setTranscriptHasNextPage] = useState(false);
  const [transcriptEndCursor, setTranscriptEndCursor] = useState<string | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [isLoadingOlderTranscript, setIsLoadingOlderTranscript] = useState(false);

  useEffect(() => {
    selectedSessionUpdatedAtRef.current = selectedSession?.updatedAt ?? null;
  }, [selectedSession?.id, selectedSession?.updatedAt]);

  const clearTranscriptState = useCallback(() => {
    transcriptMessagesRef.current = [];
    transcriptHasNextPageRef.current = false;
    transcriptEndCursorRef.current = null;
    setTranscriptMessages([]);
    setTranscriptHasNextPage(false);
    setTranscriptEndCursor(null);
  }, []);

  const applyTranscriptState = useCallback((
    sessionId: string,
    nextState: {
      endCursor: string | null;
      hasNextPage: boolean;
      messages: SessionMessageRecord[];
    },
  ) => {
    transcriptMessagesRef.current = nextState.messages;
    transcriptHasNextPageRef.current = nextState.hasNextPage;
    transcriptEndCursorRef.current = nextState.endCursor;
    setTranscriptMessages(nextState.messages);
    setTranscriptHasNextPage(nextState.hasNextPage);
    setTranscriptEndCursor(nextState.endCursor);
    updateSessionTitleOverride(sessionId, nextState.messages);
  }, [updateSessionTitleOverride]);

  const loadTranscriptPage = useCallback(async ({
    after = null,
    mode,
    sessionId,
    sessionUpdatedAt,
  }: {
    after?: string | null;
    mode: "prepend" | "refresh" | "replace";
    sessionId: string;
    sessionUpdatedAt: string;
  }) => {
    if (mode === "replace" || mode === "refresh") {
      const requestId = transcriptRequestIdRef.current + 1;
      transcriptRequestIdRef.current = requestId;
      pendingTranscriptScrollRestoreRef.current = null;
      shouldStickTranscriptToBottomRef.current = true;
      setErrorMessage(null);

      if (mode === "replace") {
        clearTranscriptState();
        isLoadingOlderTranscriptRef.current = false;
        setIsLoadingOlderTranscript(false);
        setIsLoadingTranscript(true);
      }

      try {
        const response = await fetchQuery<ChatsPageTranscriptQuery>(
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
        const mergedMessages = mergeTranscriptMessages(transcriptMessagesRef.current, nextMessages);
        const nextSessionUpdatedAt = selectedSessionUpdatedAtRef.current ?? sessionUpdatedAt;
        sessionTranscriptRetentionStore.retain({
          after: null,
          query: chatsPageTranscriptQueryNode,
          sessionId,
          sessionUpdatedAt: nextSessionUpdatedAt,
          variables: {
            after: null,
            first: CHAT_TRANSCRIPT_PAGE_SIZE,
            sessionId,
          },
        });
        applyTranscriptState(sessionId, {
          endCursor: mode === "replace"
            ? connection?.pageInfo.endCursor ?? null
            : transcriptEndCursorRef.current,
          hasNextPage: mode === "replace"
            ? Boolean(connection?.pageInfo.hasNextPage)
            : transcriptHasNextPageRef.current,
          messages: mergedMessages,
        });
      } catch (error) {
        if (transcriptRequestIdRef.current === requestId) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load transcript.");
        }
      } finally {
        if (
          mode === "replace"
          && transcriptRequestIdRef.current === requestId
          && activeTranscriptSessionIdRef.current === sessionId
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
    const transcriptNode = transcriptScrollRef.current;
    shouldStickTranscriptToBottomRef.current = false;
    if (transcriptNode) {
      pendingTranscriptScrollRestoreRef.current = captureTranscriptScrollRestoreRecord(transcriptNode);
    }

    isLoadingOlderTranscriptRef.current = true;
    setIsLoadingOlderTranscript(true);

    try {
      const response = await fetchQuery<ChatsPageTranscriptQuery>(
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
      const mergedMessages = mergeTranscriptMessages(transcriptMessagesRef.current, nextMessages);
      const nextSessionUpdatedAt = selectedSessionUpdatedAtRef.current ?? sessionUpdatedAt;
      sessionTranscriptRetentionStore.retain({
        after,
        query: chatsPageTranscriptQueryNode,
        sessionId,
        sessionUpdatedAt: nextSessionUpdatedAt,
        variables: {
          after,
          first: CHAT_TRANSCRIPT_PAGE_SIZE,
          sessionId,
        },
      });
      applyTranscriptState(sessionId, {
        endCursor: connection?.pageInfo.endCursor ?? null,
        hasNextPage: Boolean(connection?.pageInfo.hasNextPage),
        messages: mergedMessages,
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
    clearTranscriptState,
    environment,
    sessionTranscriptRetentionStore,
    setErrorMessage,
  ]);

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
      clearTranscriptState();
      setIsLoadingTranscript(false);
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingOlderTranscript(false);
      return;
    }

    activeTranscriptSessionIdRef.current = selectedSession.id;
    const retainedTranscript = sessionTranscriptRetentionStore.read<ChatsPageTranscriptQuery["response"]>(selectedSession.id);
    if (retainedTranscript) {
      const retainedMessages = retainedTranscript.pageResponses.reduce<SessionMessageRecord[]>((currentMessages, pageResponse) => {
        return mergeTranscriptMessages(
          currentMessages,
          toTranscriptMessagesFromConnection(pageResponse.SessionTranscriptMessages),
        );
      }, []);
      const oldestRetainedConnection = retainedTranscript.pageResponses.at(-1)?.SessionTranscriptMessages;
      applyTranscriptState(selectedSession.id, {
        endCursor: oldestRetainedConnection?.pageInfo.endCursor ?? null,
        hasNextPage: Boolean(oldestRetainedConnection?.pageInfo.hasNextPage),
        messages: retainedMessages,
      });
      setIsLoadingTranscript(false);
      isLoadingOlderTranscriptRef.current = false;
      setIsLoadingOlderTranscript(false);
      if (retainedTranscript.sessionUpdatedAt === selectedSession.updatedAt) {
        return;
      }

      void loadTranscriptPage({
        mode: "refresh",
        sessionId: selectedSession.id,
        sessionUpdatedAt: selectedSession.updatedAt,
      });
      return;
    }

    void loadTranscriptPage({
      mode: "replace",
      sessionId: selectedSession.id,
      sessionUpdatedAt: selectedSession.updatedAt,
    });
  }, [applyTranscriptState, clearTranscriptState, loadTranscriptPage, selectedSession, sessionTranscriptRetentionStore]);

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

  useLayoutEffect(() => {
    const transcriptNode = transcriptScrollRef.current;
    if (!selectedSession || !transcriptNode || isLoadingTranscript || isLoadingOlderTranscript || !transcriptHasNextPage || !transcriptEndCursor) {
      return;
    }

    const transcriptHasScrollableOverflow = transcriptNode.scrollHeight > transcriptNode.clientHeight + 1;
    if (transcriptHasScrollableOverflow) {
      return;
    }

    shouldStickTranscriptToBottomRef.current = false;
    void loadTranscriptPage({
      after: transcriptEndCursor,
      mode: "prepend",
      sessionId: selectedSession.id,
      sessionUpdatedAt: selectedSession.updatedAt,
    });
  }, [
    isLoadingOlderTranscript,
    isLoadingTranscript,
    loadTranscriptPage,
    selectedSession,
    transcriptEndCursor,
    transcriptHasNextPage,
    transcriptMessages,
  ]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    const subscriptionVariables = { sessionId: selectedSession.id };
    const disposable = requestSubscription<ChatsPageSessionMessageUpdatedSubscription>(environment, {
      subscription: chatsPageSessionMessageUpdatedSubscriptionNode,
      variables: subscriptionVariables,
      onNext: (response) => {
        const nextMessage = response?.SessionMessageUpdated;
        if (!nextMessage) {
          return;
        }

        const mergedMessages = mergeTranscriptMessages(transcriptMessagesRef.current, [nextMessage]);
        applyTranscriptState(selectedSession.id, {
          endCursor: transcriptEndCursorRef.current,
          hasNextPage: transcriptHasNextPageRef.current,
          messages: mergedMessages,
        });
      },
      onError: (error) => {
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [applyTranscriptState, environment, selectedSession, setErrorMessage]);

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
      sessionUpdatedAt: selectedSession.updatedAt,
    });
  }, [
    isLoadingOlderTranscript,
    loadTranscriptPage,
    selectedSession,
    transcriptEndCursor,
    transcriptHasNextPage,
  ]);

  return {
    handleTranscriptScroll,
    isLoadingOlderTranscript,
    isLoadingTranscript,
    loadTranscriptPage,
    setIsLoadingTranscript,
    transcriptEndCursor,
    transcriptHasNextPage,
    transcriptMessages,
    transcriptScrollRef,
  };
}
