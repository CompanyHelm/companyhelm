import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChangeEvent as ReactChangeEvent,
  CSSProperties,
  DragEvent as ReactDragEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ListTodoIcon, Loader2Icon, MessageSquareIcon, Settings2Icon } from "lucide-react";
import { fetchQuery, requestSubscription, useLazyLoadQuery, useMutation, useRelayEnvironment } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useApplicationHeader } from "@/components/layout/application_breadcrumb_context";
import {
  useGraphqlSubscriptionConnectionStatus,
  useSessionTranscriptRetentionStore,
} from "@/components/relay_environment_provider";
import { useIsMobile } from "@/hooks/use-mobile";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { ChatComposerImage } from "./chat_composer_image";
import type { ChatComposerModelOption } from "./chat_composer_model_picker";
import { ChatComposerPane } from "./chat_composer_pane";
import { ChatSelectionDialog } from "./chat_selection_dialog";
import {
  type ChatsPageArchiveSessionMutation,
  type ChatsPageCreateSessionMutation,
  type ChatsPageDeleteEnvironmentMutation,
  type ChatsPageDeleteSessionQueuedMessageMutation,
  type ChatsPageDismissInboxHumanQuestionMutation,
  type ChatsPageForkSessionMutation,
  type ChatsPageGetEnvironmentVncUrlMutation,
  type ChatsPageInboxHumanQuestionsUpdatedSubscription,
  type ChatsPageInterruptSessionMutation,
  type ChatsPageMarkSessionReadMutation,
  type ChatsPagePromptSessionMutation,
  type ChatsPageQueuedMessagesQuery,
  type ChatsPageQuery,
  type ChatsPageResolveInboxHumanQuestionMutation,
  type ChatsPageSearch,
  type ChatsPageSessionEnvironmentQuery,
  type ChatsPageSessionInboxHumanQuestionsUpdatedSubscription,
  type ChatsPageSessionQueuedMessagesUpdatedSubscription,
  type ChatsPageSessionUpdatedSubscription,
  type ChatsPageStartEnvironmentMutation,
  type ChatsPageSteerSessionQueuedMessageMutation,
  type ChatsPageStopEnvironmentMutation,
  type ChatsPageUpdateSessionTitleMutation,
  type DraftComposerImageRecord,
  type InboxHumanQuestionRecord,
  type ProviderOptionRecord,
  type QueuedMessageRecord,
  type SessionEnvironmentInfoRecord,
  type SessionMessageRecord,
  type SessionRecord,
  chatsPageArchiveSessionMutationNode,
  chatsPageCreateSessionMutationNode,
  chatsPageDeleteEnvironmentMutationNode,
  chatsPageDeleteSessionQueuedMessageMutationNode,
  chatsPageDismissInboxHumanQuestionMutationNode,
  chatsPageForkSessionMutationNode,
  chatsPageGetEnvironmentVncUrlMutationNode,
  chatsPageInboxHumanQuestionsUpdatedSubscriptionNode,
  chatsPageInterruptSessionMutationNode,
  chatsPageMarkSessionReadMutationNode,
  chatsPagePromptSessionMutationNode,
  chatsPageQueuedMessagesQueryNode,
  chatsPageQueryNode,
  chatsPageResolveInboxHumanQuestionMutationNode,
  chatsPageSessionEnvironmentQueryNode,
  chatsPageSessionInboxHumanQuestionsUpdatedSubscriptionNode,
  chatsPageSessionQueuedMessagesUpdatedSubscriptionNode,
  chatsPageSessionUpdatedSubscriptionNode,
  chatsPageStartEnvironmentMutationNode,
  chatsPageSteerSessionQueuedMessageMutationNode,
  chatsPageStopEnvironmentMutationNode,
  chatsPageUpdateSessionTitleMutationNode,
} from "./chats_page_data";
import { ChatEnvironmentPanel } from "./chat_environment_panel";
import {
  CHAT_LIST_DEFAULT_WIDTH,
  CHAT_LIST_WIDTH_STORAGE_KEY,
  clampChatListWidth,
  compareInboxHumanQuestionsByCreatedAt,
  compareQueuedMessagesByTimestamp,
  compareSessionsByLatestActivity,
  filterStoreRecords,
  formatAgentMeta,
  isArchivedSession,
  loadChatListWidth,
  removeRootLinkedRecord,
  resolveComposerModelOptionId,
  resolveComposerReasoningLevel,
  resolveDraftTextareaHeightBounds,
  resolveSessionTitle,
  shouldHydrateComposerSelection,
  upsertRootLinkedRecord,
} from "./chats_page_helpers";
import { ChatListPanel } from "./chat_list_panel";
import { ChatTranscriptPane } from "./chat_transcript_pane";
import { useChatTranscript } from "./use_chat_transcript";

export function ChatsPageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <Card className="rounded-2xl border-0 bg-transparent shadow-none ring-0 lg:w-[22rem] lg:shrink-0">
        <CardHeader className="pl-3 pr-3 md:pl-4 md:pr-3">
          <CardTitle>Chats</CardTitle>
          <CardDescription>Loading agents and sessions…</CardDescription>
        </CardHeader>
        <CardContent className="pl-3 pr-3 md:pl-4 md:pr-3">
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

export function ChatsPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const environment = useRelayEnvironment();
  const subscriptionConnectionStatus = useGraphqlSubscriptionConnectionStatus();
  const sessionTranscriptRetentionStore = useSessionTranscriptRetentionStore();
  const search = useSearch({ strict: false }) as ChatsPageSearch;
  const isMobile = useIsMobile();
  const [draftMessage, setDraftMessage] = useState("");
  const [draftImages, setDraftImages] = useState<DraftComposerImageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(null);
  const [forkingTurnId, setForkingTurnId] = useState<string | null>(null);
  const [pendingCreatedSessionId, setPendingCreatedSessionId] = useState<string | null>(null);
  const [pendingCreatedSessionTranscriptReloadId, setPendingCreatedSessionTranscriptReloadId] = useState<string | null>(
    null,
  );
  const [chatListWidth, setChatListWidth] = useState(loadChatListWidth);
  const [isChatListHidden, setIsChatListHidden] = useState(false);
  const [isMobileChatListOpen, setIsMobileChatListOpen] = useState(false);
  const [isEnvironmentPanelOpen, setIsEnvironmentPanelOpen] = useState(false);
  const [isLoadingSessionEnvironment, setIsLoadingSessionEnvironment] = useState(false);
  const [sessionEnvironmentInfo, setSessionEnvironmentInfo] = useState<SessionEnvironmentInfoRecord | null>(null);
  const [sessionEnvironmentErrorMessage, setSessionEnvironmentErrorMessage] = useState<string | null>(null);
  const [actingSessionEnvironmentId, setActingSessionEnvironmentId] = useState<string | null>(null);
  const [deletingSessionEnvironmentId, setDeletingSessionEnvironmentId] = useState<string | null>(null);
  const [isResizingChatList, setIsResizingChatList] = useState(false);
  const [draftTextareaHeight, setDraftTextareaHeight] = useState<number | null>(null);
  const [isResizingDraftTextarea, setIsResizingDraftTextarea] = useState(false);
  const [composerModelOptionId, setComposerModelOptionId] = useState("");
  const [composerReasoningLevel, setComposerReasoningLevel] = useState("");
  const [sessionTitleOverridesById, setSessionTitleOverridesById] = useState<Record<string, string>>({});
  const [liveSessionHumanQuestionsBySessionId, setLiveSessionHumanQuestionsBySessionId] = useState<
    Record<string, InboxHumanQuestionRecord[]>
  >({});
  const [queuedMessages, setQueuedMessages] = useState<QueuedMessageRecord[]>([]);
  const [steeringQueuedMessageId, setSteeringQueuedMessageId] = useState<string | null>(null);
  const [deletingQueuedMessageId, setDeletingQueuedMessageId] = useState<string | null>(null);
  const [isComposerDragActive, setIsComposerDragActive] = useState(false);
  const [reconnectingSessionId, setReconnectingSessionId] = useState<string | null>(null);
  const [collapsedChatListAgentIds, setCollapsedChatListAgentIds] = useState<Record<string, boolean>>({});
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(CHAT_LIST_DEFAULT_WIDTH);
  const draftImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftTextareaResizeStartHeightRef = useRef(0);
  const draftTextareaResizeStartYRef = useRef(0);
  const composerDragDepthRef = useRef(0);
  const composerSelectionTargetKeyRef = useRef<string | null>(null);
  const markSessionReadInFlightSessionIdRef = useRef<string | null>(null);
  const queuedMessagesRequestIdRef = useRef(0);
  const activeQueuedMessagesSessionIdRef = useRef<string | null>(null);
  const data = useLazyLoadQuery<ChatsPageQuery>(
    chatsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [inboxHumanQuestions, setInboxHumanQuestions] = useState<InboxHumanQuestionRecord[]>(() => {
    return [...data.InboxHumanQuestions].sort(compareInboxHumanQuestionsByCreatedAt);
  });
  const [commitCreateSession, isCreateSessionInFlight] = useMutation<ChatsPageCreateSessionMutation>(
    chatsPageCreateSessionMutationNode,
  );
  const [commitForkSession] = useMutation<ChatsPageForkSessionMutation>(
    chatsPageForkSessionMutationNode,
  );
  const [commitArchiveSession, isArchiveSessionInFlight] = useMutation<ChatsPageArchiveSessionMutation>(
    chatsPageArchiveSessionMutationNode,
  );
  const [commitPromptSession, isPromptSessionInFlight] = useMutation<ChatsPagePromptSessionMutation>(
    chatsPagePromptSessionMutationNode,
  );
  const [commitInterruptSession, isInterruptSessionInFlight] = useMutation<ChatsPageInterruptSessionMutation>(
    chatsPageInterruptSessionMutationNode,
  );
  const [commitDismissInboxHumanQuestion, isDismissInboxHumanQuestionInFlight] = useMutation<ChatsPageDismissInboxHumanQuestionMutation>(
    chatsPageDismissInboxHumanQuestionMutationNode,
  );
  const [commitResolveInboxHumanQuestion, isResolveInboxHumanQuestionInFlight] = useMutation<ChatsPageResolveInboxHumanQuestionMutation>(
    chatsPageResolveInboxHumanQuestionMutationNode,
  );
  const [commitDeleteQueuedMessage] = useMutation<ChatsPageDeleteSessionQueuedMessageMutation>(
    chatsPageDeleteSessionQueuedMessageMutationNode,
  );
  const [commitDeleteEnvironment, isDeleteEnvironmentInFlight] = useMutation<ChatsPageDeleteEnvironmentMutation>(
    chatsPageDeleteEnvironmentMutationNode,
  );
  const [commitStartEnvironment, isStartEnvironmentInFlight] = useMutation<ChatsPageStartEnvironmentMutation>(
    chatsPageStartEnvironmentMutationNode,
  );
  const [commitGetEnvironmentVncUrl, isGetEnvironmentVncUrlInFlight] = useMutation<ChatsPageGetEnvironmentVncUrlMutation>(
    chatsPageGetEnvironmentVncUrlMutationNode,
  );
  const [commitStopEnvironment, isStopEnvironmentInFlight] = useMutation<ChatsPageStopEnvironmentMutation>(
    chatsPageStopEnvironmentMutationNode,
  );
  const [commitSteerQueuedMessage] = useMutation<ChatsPageSteerSessionQueuedMessageMutation>(
    chatsPageSteerSessionQueuedMessageMutationNode,
  );
  const [commitMarkSessionRead] = useMutation<ChatsPageMarkSessionReadMutation>(
    chatsPageMarkSessionReadMutationNode,
  );
  const [commitUpdateSessionTitle] = useMutation<ChatsPageUpdateSessionTitleMutation>(
    chatsPageUpdateSessionTitleMutationNode,
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
          modelProviderCredentialModelId: modelOption.modelProviderCredentialModelId,
          modelId: modelOption.modelId,
          name: modelOption.name,
          providerLabel: providerOption.label,
          reasoningSupported: modelOption.reasoningSupported,
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
  const latestActiveSession = useMemo(() => {
    return [...activeSessions].sort(compareSessionsByLatestActivity)[0] ?? null;
  }, [activeSessions]);
  const sessionsByAgentId = useMemo(() => {
    const nextMap = new Map<string, SessionRecord[]>();

    for (const session of activeSessions) {
      const existingSessions = nextMap.get(session.agentId) ?? [];
      existingSessions.push(session);
      nextMap.set(session.agentId, existingSessions);
    }

    for (const sessions of nextMap.values()) {
      sessions.sort(compareSessionsByLatestActivity);
    }

    return nextMap;
  }, [activeSessions]);
  const chatListAgents = useMemo(() => {
    return sortedAgents.filter((agent) => {
      return (sessionsByAgentId.get(agent.id)?.length ?? 0) > 0;
    });
  }, [sessionsByAgentId, sortedAgents]);
  const newChatAgentItems = useMemo(() => {
    return sortedAgents.map((agent) => {
      const agentMeta = formatAgentMeta(agent);

      return {
        description: agentMeta,
        id: agent.id,
        searchText: [agent.name, agentMeta].join(" "),
        title: agent.name,
      };
    });
  }, [sortedAgents]);
  const sessionById = useMemo(() => {
    return new Map(activeSessions.map((session) => [session.id, session]));
  }, [activeSessions]);
  const sessionIdsWithOpenHumanQuestions = useMemo(() => {
    return new Set(inboxHumanQuestions.map((question) => question.sessionId));
  }, [inboxHumanQuestions]);

  const resolvedSelectedSession = search.sessionId ? sessionById.get(search.sessionId) ?? null : null;
  const resolvedSelectedAgentId = search.agentId ?? resolvedSelectedSession?.agentId ?? "";
  const selectedAgent = sortedAgents.find((agent) => agent.id === resolvedSelectedAgentId) ?? null;
  const selectedSession = resolvedSelectedSession && resolvedSelectedSession.agentId === selectedAgent?.id
    ? resolvedSelectedSession
    : null;
  const selectedSessionId = selectedSession?.id ?? null;
  const selectedSessionHumanQuestion = useMemo<InboxHumanQuestionRecord | null>(() => {
    if (!selectedSessionId) {
      return null;
    }

    return [
      ...(liveSessionHumanQuestionsBySessionId[selectedSessionId]
        ?? inboxHumanQuestions.filter((question) => question.sessionId === selectedSessionId)),
    ]
      .sort(compareInboxHumanQuestionsByCreatedAt)[0] ?? null;
  }, [inboxHumanQuestions, liveSessionHumanQuestionsBySessionId, selectedSessionId]);
  const selectedComposerModelOption = composerModelOptionById.get(composerModelOptionId) ?? null;
  const shouldUseCompactComposerSettings = isMobile;
  const isSelectedSessionRunning = selectedSession?.status === "running";
  const hasDraftInput = draftMessage.trim().length > 0 || draftImages.length > 0;
  const shouldUseComposerForHumanQuestionAnswer = Boolean(selectedSessionHumanQuestion?.allowCustomAnswer)
    && draftMessage.trim().length > 0
    && draftImages.length === 0;
  const canSubmitPromptDraft = Boolean(
    selectedAgent
      && selectedComposerModelOption
      && hasDraftInput,
  );
  const isSubmittingDraft =
    isCreateSessionInFlight
    || isPromptSessionInFlight
    || isResolveInboxHumanQuestionInFlight
    || isDismissInboxHumanQuestionInFlight;
  const canSubmitDraft = Boolean(
    shouldUseComposerForHumanQuestionAnswer || canSubmitPromptDraft,
  ) && !isSubmittingDraft && !isInterruptSessionInFlight;
  const canInterruptSelectedSession = Boolean(selectedSession && isSelectedSessionRunning)
    && !hasDraftInput
    && !isSubmittingDraft
    && !isInterruptSessionInFlight;
  const shouldShowInterruptComposerAction = Boolean(selectedSession && isSelectedSessionRunning && !hasDraftInput);
  const shouldShowQueueComposerAction = Boolean(
    selectedSession
      && isSelectedSessionRunning
      && hasDraftInput
      && !shouldUseComposerForHumanQuestionAnswer,
  );
  const isReconnectingLiveUpdates = subscriptionConnectionStatus === "reconnecting"
    && reconnectingSessionId !== null
    && reconnectingSessionId === selectedSessionId;
  const chatListPanelStyle = {
    "--chats-list-width": `${chatListWidth}px`,
  } as CSSProperties;

  const updateSessionTitleOverride = useCallback((sessionId: string, messages: ReadonlyArray<SessionMessageRecord>) => {
    const nextTitle = messages.length > 0 ? resolveSessionTitle({ inferredTitle: null, userSetTitle: null }, messages) : "Untitled chat";
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

  const {
    handleTranscriptScroll,
    isTranscriptStuckToBottom,
    isLoadingOlderTranscript,
    isLoadingTranscript,
    jumpToLatestMessage,
    loadTranscriptPage,
    transcriptMessages,
    transcriptScrollRef,
  } = useChatTranscript({
    environment,
    selectedSession,
    sessionTranscriptRetentionStore,
    setErrorMessage,
    updateSessionTitleOverride,
  });

  const selectedSessionMessages = selectedSession ? transcriptMessages : [];

  useEffect(() => {
    setInboxHumanQuestions([...data.InboxHumanQuestions].sort(compareInboxHumanQuestionsByCreatedAt));
  }, [data.InboxHumanQuestions]);

  useEffect(() => {
    if (subscriptionConnectionStatus === "reconnecting") {
      setReconnectingSessionId((currentSessionId) => currentSessionId ?? selectedSessionId);
      return;
    }

    setReconnectingSessionId(null);
  }, [selectedSessionId, subscriptionConnectionStatus]);

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

  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    await new Promise<void>((resolve, reject) => {
      commitUpdateSessionTitle({
        variables: {
          input: {
            sessionId,
            title,
          },
        },
        updater: (store) => {
          upsertRootLinkedRecord(store, "Sessions", "UpdateSessionTitle");
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          setSessionTitleOverridesById((currentOverrides) => {
            if (!(sessionId in currentOverrides)) {
              return currentOverrides;
            }

            const nextOverrides = { ...currentOverrides };
            delete nextOverrides[sessionId];
            return nextOverrides;
          });
          resolve();
        },
        onError: reject,
      });
    });
  }, [commitUpdateSessionTitle]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CHAT_LIST_WIDTH_STORAGE_KEY, String(chatListWidth));
  }, [chatListWidth]);

  useEffect(() => {
    if (search.agentId || search.sessionId || !latestActiveSession) {
      return;
    }

    void navigate({
      params: {
        organizationSlug,
      },
      replace: true,
      to: OrganizationPath.route("/chats"),
      search: {
        agentId: latestActiveSession.agentId,
        sessionId: latestActiveSession.id,
      },
    });
  }, [latestActiveSession, navigate, organizationSlug, search.agentId, search.sessionId]);

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
      const response = await fetchQuery<ChatsPageSessionEnvironmentQuery>(
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

  const updateCurrentSessionEnvironmentStatus = useCallback((environmentId: string, status: string) => {
    setSessionEnvironmentInfo((currentInfo) => {
      if (!currentInfo?.currentEnvironment || currentInfo.currentEnvironment.id !== environmentId) {
        return currentInfo;
      }

      return {
        ...currentInfo,
        currentEnvironment: {
          ...currentInfo.currentEnvironment,
          status,
        },
      };
    });
  }, []);

  const clearCurrentSessionEnvironment = useCallback((environmentId: string) => {
    setSessionEnvironmentInfo((currentInfo) => {
      if (!currentInfo?.currentEnvironment || currentInfo.currentEnvironment.id !== environmentId) {
        return currentInfo;
      }

      return {
        ...currentInfo,
        currentEnvironment: null,
      };
    });
  }, []);

  const openSessionEnvironmentDesktop = useCallback(async (environmentId: string) => {
    if (
      isStartEnvironmentInFlight
      || isDeleteEnvironmentInFlight
      || isStopEnvironmentInFlight
      || isGetEnvironmentVncUrlInFlight
    ) {
      return;
    }

    setSessionEnvironmentErrorMessage(null);
    setActingSessionEnvironmentId(environmentId);

    await new Promise<void>((resolve, reject) => {
      commitGetEnvironmentVncUrl({
        variables: {
          input: {
            id: environmentId,
          },
        },
        onCompleted: (response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          const url = response.GetEnvironmentVncUrl?.url;
          if (!url) {
            reject(new Error("Environment desktop URL was not returned."));
            return;
          }

          window.open(url, "_blank", "noopener,noreferrer");
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setSessionEnvironmentErrorMessage(
        error instanceof Error ? error.message : "Failed to open environment desktop.",
      );
    });

    setActingSessionEnvironmentId(null);
  }, [
    commitGetEnvironmentVncUrl,
    isDeleteEnvironmentInFlight,
    isGetEnvironmentVncUrlInFlight,
    isStartEnvironmentInFlight,
    isStopEnvironmentInFlight,
  ]);

  const startSessionEnvironment = useCallback(async (environmentId: string) => {
    if (
      isStartEnvironmentInFlight
      || isDeleteEnvironmentInFlight
      || isStopEnvironmentInFlight
      || isGetEnvironmentVncUrlInFlight
    ) {
      return;
    }

    setSessionEnvironmentErrorMessage(null);
    setActingSessionEnvironmentId(environmentId);

    await new Promise<void>((resolve, reject) => {
      commitStartEnvironment({
        variables: {
          input: {
            id: environmentId,
          },
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    }).then(() => {
      updateCurrentSessionEnvironmentStatus(environmentId, "running");
    }).catch((error: unknown) => {
      setSessionEnvironmentErrorMessage(error instanceof Error ? error.message : "Failed to start environment.");
    });

    setActingSessionEnvironmentId(null);
  }, [
    commitStartEnvironment,
    isDeleteEnvironmentInFlight,
    isGetEnvironmentVncUrlInFlight,
    isStartEnvironmentInFlight,
    isStopEnvironmentInFlight,
    updateCurrentSessionEnvironmentStatus,
  ]);

  const stopSessionEnvironment = useCallback(async (environmentId: string) => {
    if (
      isStartEnvironmentInFlight
      || isDeleteEnvironmentInFlight
      || isStopEnvironmentInFlight
      || isGetEnvironmentVncUrlInFlight
    ) {
      return;
    }

    setSessionEnvironmentErrorMessage(null);
    setActingSessionEnvironmentId(environmentId);

    await new Promise<void>((resolve, reject) => {
      commitStopEnvironment({
        variables: {
          input: {
            id: environmentId,
          },
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    }).then(() => {
      updateCurrentSessionEnvironmentStatus(environmentId, "stopped");
    }).catch((error: unknown) => {
      setSessionEnvironmentErrorMessage(error instanceof Error ? error.message : "Failed to stop environment.");
    });

    setActingSessionEnvironmentId(null);
  }, [
    commitStopEnvironment,
    isDeleteEnvironmentInFlight,
    isGetEnvironmentVncUrlInFlight,
    isStartEnvironmentInFlight,
    isStopEnvironmentInFlight,
    updateCurrentSessionEnvironmentStatus,
  ]);

  const deleteSessionEnvironment = useCallback(async (environmentId: string, force: boolean) => {
    if (isDeleteEnvironmentInFlight) {
      return;
    }

    setSessionEnvironmentErrorMessage(null);
    setDeletingSessionEnvironmentId(environmentId);

    await new Promise<void>((resolve, reject) => {
      commitDeleteEnvironment({
        variables: {
          input: {
            force,
            id: environmentId,
          },
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    }).then(() => {
      clearCurrentSessionEnvironment(environmentId);
    }).catch((error: unknown) => {
      setSessionEnvironmentErrorMessage(error instanceof Error ? error.message : "Failed to delete environment.");
    });

    setDeletingSessionEnvironmentId(null);
  }, [clearCurrentSessionEnvironment, commitDeleteEnvironment, isDeleteEnvironmentInFlight]);

  const loadQueuedMessages = useCallback(async (sessionId: string) => {
    const requestId = queuedMessagesRequestIdRef.current + 1;
    queuedMessagesRequestIdRef.current = requestId;
    activeQueuedMessagesSessionIdRef.current = sessionId;

    try {
      const response = await fetchQuery<ChatsPageQueuedMessagesQuery>(
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
    }
  }, [environment]);

  useEffect(() => {
    const currentSelectedSessionId = selectedSession?.id ?? null;

    if (!currentSelectedSessionId) {
      setIsEnvironmentPanelOpen(false);
      setSessionEnvironmentInfo(null);
      setSessionEnvironmentErrorMessage(null);
      setIsLoadingSessionEnvironment(false);
      setActingSessionEnvironmentId(null);
      setDeletingSessionEnvironmentId(null);
      return;
    }

    if (!isEnvironmentPanelOpen) {
      return;
    }

    void loadSessionEnvironmentInfo(currentSelectedSessionId);
  }, [isEnvironmentPanelOpen, loadSessionEnvironmentInfo, selectedSession?.id]);

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
      params: {
        organizationSlug,
      },
      replace: true,
      to: OrganizationPath.route("/chats"),
      search: {
        agentId: search.agentId,
      },
    });
  }, [navigate, organizationSlug, pendingCreatedSessionId, search.agentId, search.sessionId, selectedSession]);

  useEffect(() => {
    if (!selectedSession || pendingCreatedSessionTranscriptReloadId !== selectedSession.id) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      void loadTranscriptPage({
        mode: "replace",
        sessionId: selectedSession.id,
        sessionUpdatedAt: selectedSession.updatedAt,
      }).finally(() => {
        setPendingCreatedSessionTranscriptReloadId((currentSessionId) => {
          return currentSessionId === selectedSession.id ? null : currentSessionId;
        });
      });
    }, 250);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [loadTranscriptPage, pendingCreatedSessionTranscriptReloadId, selectedSession]);

  useEffect(() => {
    if (!selectedSession) {
      queuedMessagesRequestIdRef.current += 1;
      activeQueuedMessagesSessionIdRef.current = null;
      setQueuedMessages([]);
      setDeletingQueuedMessageId(null);
      return;
    }

    void loadQueuedMessages(selectedSession.id);
  }, [loadQueuedMessages, selectedSession?.id]);

  useEffect(() => {
    const nextComposerSelectionTargetKey = selectedAgent
      ? `${selectedAgent.id}:${selectedSession?.id ?? ""}`
      : null;
    const previousComposerSelectionTargetKey = composerSelectionTargetKeyRef.current;
    composerSelectionTargetKeyRef.current = nextComposerSelectionTargetKey;

    if (!selectedAgent) {
      setComposerModelOptionId("");
      setComposerReasoningLevel("");
      return;
    }
    if (!shouldHydrateComposerSelection(
      previousComposerSelectionTargetKey,
      nextComposerSelectionTargetKey,
      composerModelOptionId,
      composerModelOptionById,
    )) {
      return;
    }

    // Streaming updates mutate the selected session record frequently. Only re-seed the draft
    // picker when the operator actually switches chat targets or the current model disappears.
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
    composerModelOptionId,
    composerModelOptions,
    selectedAgent,
    selectedSession?.id,
    selectedSession?.modelId,
    selectedSession?.modelProviderCredentialModelId,
    selectedSession?.reasoningLevel,
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

  useEffect(() => {
    if (!selectedSessionId) {
      return;
    }

    const disposable = requestSubscription<ChatsPageSessionUpdatedSubscription>(environment, {
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
        if (nextSession.id !== selectedSessionId) {
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
  }, [environment, markSessionRead, selectedSessionId]);

  useEffect(() => {
    const disposable = requestSubscription<ChatsPageInboxHumanQuestionsUpdatedSubscription>(environment, {
      subscription: chatsPageInboxHumanQuestionsUpdatedSubscriptionNode,
      variables: {},
      onNext: (response) => {
        const nextQuestions = response?.InboxHumanQuestionsUpdated;
        if (!nextQuestions) {
          return;
        }

        setInboxHumanQuestions([...nextQuestions].sort(compareInboxHumanQuestionsByCreatedAt));
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

    const disposable = requestSubscription<ChatsPageSessionInboxHumanQuestionsUpdatedSubscription>(environment, {
      subscription: chatsPageSessionInboxHumanQuestionsUpdatedSubscriptionNode,
      variables: { sessionId: selectedSession.id },
      onNext: (response) => {
        const nextQuestions = response?.SessionInboxHumanQuestionsUpdated;
        if (!nextQuestions) {
          return;
        }

        setLiveSessionHumanQuestionsBySessionId((currentValue) => ({
          ...currentValue,
          [selectedSession.id]: [...nextQuestions].sort(compareInboxHumanQuestionsByCreatedAt),
        }));
      },
      onError: (error) => {
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [environment, selectedSession?.id]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }

    const disposable = requestSubscription<ChatsPageSessionQueuedMessagesUpdatedSubscription>(environment, {
      subscription: chatsPageSessionQueuedMessagesUpdatedSubscriptionNode,
      variables: { sessionId: selectedSession.id },
      onNext: (response) => {
        const nextQueuedMessages = response?.SessionQueuedMessagesUpdated;
        if (!nextQueuedMessages) {
          return;
        }

        setQueuedMessages([...nextQueuedMessages].sort(compareQueuedMessagesByTimestamp));
      },
      onError: (error) => {
        setErrorMessage((currentMessage) => currentMessage ?? error.message);
      },
    });

    return () => {
      disposable.dispose();
    };
  }, [environment, selectedSession?.id]);

  const openDraftForAgent = useCallback(async (agentId: string) => {
    setErrorMessage(null);
    setDraftMessage("");
    setDraftImages([]);
    setIsMobileChatListOpen(false);
    await navigate({
      params: {
        organizationSlug,
      },
      to: OrganizationPath.route("/chats"),
      search: {
        agentId,
      },
    });
  }, [navigate, organizationSlug]);

  const openSession = useCallback(async (agentId: string, sessionId: string) => {
    setErrorMessage(null);
    setIsMobileChatListOpen(false);
    await navigate({
      params: {
        organizationSlug,
      },
      to: OrganizationPath.route("/chats"),
      search: {
        agentId,
        sessionId,
      },
    });
  }, [navigate, organizationSlug]);

  const toggleChatListAgentExpanded = useCallback((agentId: string) => {
    setCollapsedChatListAgentIds((current) => ({
      ...current,
      [agentId]: current[agentId] !== true,
    }));
  }, []);

  const expandChatListAgent = useCallback((agentId: string) => {
    setCollapsedChatListAgentIds((current) => {
      if (current[agentId] !== true) {
        return current;
      }

      return {
        ...current,
        [agentId]: false,
      };
    });
  }, []);

  const addDraftImageFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    try {
      const nextDraftImages = await Promise.all(files.map((file) => ChatComposerImage.fromFile(file)));
      setDraftImages((currentDraftImages) => [...currentDraftImages, ...nextDraftImages]);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to attach images.");
    }
  }, []);

  const removeDraftImage = useCallback((draftImageId: string) => {
    setDraftImages((currentDraftImages) => {
      return currentDraftImages.filter((draftImage) => draftImage.id !== draftImageId);
    });
  }, []);

  const openDraftImagePicker = useCallback(() => {
    draftImageFileInputRef.current?.click();
  }, []);

  const handleDraftImageInputChange = useCallback((event: ReactChangeEvent<HTMLInputElement>) => {
    void addDraftImageFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }, [addDraftImageFiles]);

  const handleComposerDragEnter = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!(event.dataTransfer.files.length > 0 || Array.from(event.dataTransfer.types).includes("Files"))) {
      return;
    }

    event.preventDefault();
    composerDragDepthRef.current += 1;
    setIsComposerDragActive(true);
  }, []);

  const handleComposerDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!(event.dataTransfer.files.length > 0 || Array.from(event.dataTransfer.types).includes("Files"))) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleComposerDragLeave = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!(event.dataTransfer.files.length > 0 || Array.from(event.dataTransfer.types).includes("Files"))) {
      return;
    }

    event.preventDefault();
    composerDragDepthRef.current = Math.max(0, composerDragDepthRef.current - 1);
    if (composerDragDepthRef.current === 0) {
      setIsComposerDragActive(false);
    }
  }, []);

  const handleComposerDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!(event.dataTransfer.files.length > 0 || Array.from(event.dataTransfer.types).includes("Files"))) {
      return;
    }

    event.preventDefault();
    composerDragDepthRef.current = 0;
    setIsComposerDragActive(false);
    void addDraftImageFiles(Array.from(event.dataTransfer.files));
  }, [addDraftImageFiles]);

  const startSession = useCallback(async () => {
    if (!selectedAgent || !selectedComposerModelOption) {
      return;
    }

    const userMessage = draftMessage.trim();
    const promptImages = draftImages.map((draftImage) => ({
      base64EncodedImage: draftImage.base64EncodedImage,
      mimeType: draftImage.mimeType,
    }));
    if (userMessage.length === 0 && promptImages.length === 0) {
      return;
    }
    const nextSessionId = globalThis.crypto.randomUUID();

    setErrorMessage(null);
    setPendingCreatedSessionId(nextSessionId);

    await navigate({
      params: {
        organizationSlug,
      },
      to: OrganizationPath.route("/chats"),
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
            images: promptImages.length > 0 ? promptImages : undefined,
            modelProviderCredentialModelId: selectedComposerModelOption.modelProviderCredentialModelId,
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
          setDraftImages([]);
          setPendingCreatedSessionTranscriptReloadId(createdSession.id);

          try {
            setPendingCreatedSessionId(null);
            if (search.sessionId !== createdSession.id || search.agentId !== createdSession.agentId) {
              await navigate({
                params: {
                  organizationSlug,
                },
                to: OrganizationPath.route("/chats"),
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
  }, [
    commitCreateSession,
    composerReasoningLevel,
    draftImages,
    draftMessage,
    navigate,
    organizationSlug,
    search.agentId,
    search.sessionId,
    selectedAgent,
    selectedComposerModelOption,
  ]);

  const forkSessionFromTurn = useCallback(async (turnId: string) => {
    if (!selectedSession || forkingTurnId !== null) {
      return;
    }

    setErrorMessage(null);
    setForkingTurnId(turnId);

    await new Promise<void>((resolve, reject) => {
      commitForkSession({
        variables: {
          input: {
            sessionId: selectedSession.id,
            turnId,
          },
        },
        updater: (store) => {
          const forkedSession = store.getRootField("ForkSession");
          if (!forkedSession) {
            return;
          }

          const rootRecord = store.getRoot();
          const currentSessions = filterStoreRecords(rootRecord.getLinkedRecords("Sessions") || []);
          rootRecord.setLinkedRecords(
            [
              forkedSession,
              ...currentSessions.filter((record) => record.getDataID() !== forkedSession.getDataID()),
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

          const forkedSession = response.ForkSession;
          if (!forkedSession) {
            reject(new Error("Failed to fork chat session."));
            return;
          }

          try {
            if (search.sessionId !== forkedSession.id || search.agentId !== forkedSession.agentId) {
              await navigate({
                params: {
                  organizationSlug,
                },
                to: OrganizationPath.route("/chats"),
                search: {
                  agentId: forkedSession.agentId,
                  sessionId: forkedSession.id,
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to fork chat session.");
    }).finally(() => {
      setForkingTurnId((currentTurnId) => {
        return currentTurnId === turnId ? null : currentTurnId;
      });
    });
  }, [commitForkSession, forkingTurnId, navigate, organizationSlug, search.agentId, search.sessionId, selectedSession]);

  const archiveSession = useCallback(async (session: SessionRecord) => {
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
  }, [commitArchiveSession]);

  const promptSession = useCallback(async (shouldSteer: boolean) => {
    if (!selectedSession || !selectedComposerModelOption) {
      return;
    }

    const userMessage = draftMessage.trim();
    const promptImages = draftImages.map((draftImage) => ({
      base64EncodedImage: draftImage.base64EncodedImage,
      mimeType: draftImage.mimeType,
    }));
    if (userMessage.length === 0 && promptImages.length === 0) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      commitPromptSession({
        variables: {
          input: {
            id: selectedSession.id,
            images: promptImages.length > 0 ? promptImages : undefined,
            modelProviderCredentialModelId: selectedComposerModelOption.modelProviderCredentialModelId,
            reasoningLevel: composerReasoningLevel.length > 0 ? composerReasoningLevel : undefined,
            shouldSteer,
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
          setDraftImages([]);
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send message.");
    });
  }, [commitPromptSession, composerReasoningLevel, draftImages, draftMessage, selectedComposerModelOption, selectedSession]);

  const interruptSession = useCallback(async () => {
    if (!selectedSession || !isSelectedSessionRunning) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      commitInterruptSession({
        variables: {
          input: {
            sessionId: selectedSession.id,
          },
        },
        updater: (store) => {
          upsertRootLinkedRecord(store, "Sessions", "InterruptSession");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to interrupt session.");
    });
  }, [commitInterruptSession, isSelectedSessionRunning, selectedSession]);

  const removeInboxHumanQuestion = useCallback((inboxItemId: string) => {
    setInboxHumanQuestions((currentQuestions) => {
      return currentQuestions.filter((question) => question.id !== inboxItemId);
    });
  }, []);

  const resolveHumanQuestion = useCallback(async (
    input: {
      customAnswerText?: string;
      inboxItemId: string;
      proposalId?: string;
    },
  ): Promise<boolean> => {
    setErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitResolveInboxHumanQuestion({
          variables: {
            input,
          },
          updater: (store) => {
            removeRootLinkedRecord(store, "InboxHumanQuestions", "ResolveInboxHumanQuestion");
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage.length > 0) {
              reject(new Error(nextErrorMessage));
              return;
            }

            removeInboxHumanQuestion(input.inboxItemId);
            resolve();
          },
          onError: reject,
        });
      });
      if (selectedSessionId) {
        setLiveSessionHumanQuestionsBySessionId((currentValue) => {
          const currentQuestions = currentValue[selectedSessionId];
          if (!currentQuestions) {
            return currentValue;
          }

          return {
            ...currentValue,
            [selectedSessionId]: currentQuestions.filter((question) => question.id !== input.inboxItemId),
          };
        });
      }
      return true;
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to send answer.");
      return false;
    }
  }, [commitResolveInboxHumanQuestion, removeInboxHumanQuestion, selectedSessionId]);

  const dismissHumanQuestion = useCallback(async (inboxItemId: string): Promise<boolean> => {
    setErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDismissInboxHumanQuestion({
          variables: {
            input: {
              inboxItemId,
            },
          },
          updater: (store) => {
            removeRootLinkedRecord(store, "InboxHumanQuestions", "DismissInboxHumanQuestion");
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage.length > 0) {
              reject(new Error(nextErrorMessage));
              return;
            }

            removeInboxHumanQuestion(inboxItemId);
            resolve();
          },
          onError: reject,
        });
      });
      if (selectedSessionId) {
        setLiveSessionHumanQuestionsBySessionId((currentValue) => {
          const currentQuestions = currentValue[selectedSessionId];
          if (!currentQuestions) {
            return currentValue;
          }

          return {
            ...currentValue,
            [selectedSessionId]: currentQuestions.filter((question) => question.id !== inboxItemId),
          };
        });
      }
      return true;
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to dismiss question.");
      return false;
    }
  }, [commitDismissInboxHumanQuestion, removeInboxHumanQuestion, selectedSessionId]);

  const deleteQueuedMessage = useCallback(async (queuedMessageId: string) => {
    const queuedMessage = queuedMessages.find((currentQueuedMessage) => currentQueuedMessage.id === queuedMessageId) ?? null;
    if (!queuedMessage || queuedMessage.shouldSteer || queuedMessage.status.trim().toLowerCase() !== "pending") {
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
  }, [commitDeleteQueuedMessage, queuedMessages]);

  const steerQueuedMessage = useCallback(async (queuedMessageId: string) => {
    const queuedMessage = queuedMessages.find((currentQueuedMessage) => currentQueuedMessage.id === queuedMessageId) ?? null;
    if (!queuedMessage || queuedMessage.shouldSteer || queuedMessage.status.trim().toLowerCase() !== "pending") {
      return;
    }

    setSteeringQueuedMessageId(queuedMessageId);
    await new Promise<void>((resolve, reject) => {
      commitSteerQueuedMessage({
        variables: {
          input: {
            id: queuedMessageId,
          },
        },
        onCompleted: (response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage.length > 0) {
            reject(new Error(nextErrorMessage));
            return;
          }

          const updatedQueuedMessage = response.SteerSessionQueuedMessage;
          if (!updatedQueuedMessage) {
            reject(new Error("Failed to steer queued message."));
            return;
          }

          setQueuedMessages((currentQueuedMessages) => {
            return currentQueuedMessages.map((currentQueuedMessage) => {
              return currentQueuedMessage.id === queuedMessageId
                ? {
                  ...currentQueuedMessage,
                  shouldSteer: updatedQueuedMessage.shouldSteer,
                  status: updatedQueuedMessage.status,
                  updatedAt: updatedQueuedMessage.updatedAt,
                }
                : currentQueuedMessage;
            });
          });
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to steer queued message.");
    }).finally(() => {
      setSteeringQueuedMessageId((currentSteeringQueuedMessageId) => {
        return currentSteeringQueuedMessageId === queuedMessageId ? null : currentSteeringQueuedMessageId;
      });
    });
  }, [commitSteerQueuedMessage, queuedMessages]);

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

  const startChatListResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = chatListWidth;
    setIsResizingChatList(true);
  }, [chatListWidth]);

  const startDraftTextareaResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const textarea = draftTextareaRef.current;
    if (!textarea) {
      return;
    }

    event.preventDefault();
    draftTextareaResizeStartYRef.current = event.clientY;
    draftTextareaResizeStartHeightRef.current = textarea.getBoundingClientRect().height;
    setIsResizingDraftTextarea(true);
  }, []);

  const submitDraft = useCallback(async () => {
    if (shouldShowInterruptComposerAction) {
      await interruptSession();
      return;
    }

    if (selectedSessionHumanQuestion && shouldUseComposerForHumanQuestionAnswer) {
      const customAnswerText = draftMessage.trim();
      const didResolveHumanQuestion = await resolveHumanQuestion({
        customAnswerText,
        inboxItemId: selectedSessionHumanQuestion.id,
      });
      if (!didResolveHumanQuestion) {
        return;
      }
      setDraftMessage("");
      return;
    }

    if (selectedSession) {
      await promptSession(isSelectedSessionRunning);
      return;
    }

    await startSession();
  }, [
    draftMessage,
    interruptSession,
    isSelectedSessionRunning,
    promptSession,
    resolveHumanQuestion,
    selectedSession,
    selectedSessionHumanQuestion,
    shouldShowInterruptComposerAction,
    shouldUseComposerForHumanQuestionAnswer,
    startSession,
  ]);

  const queueDraftMessage = useCallback(async () => {
    if (!selectedSession || !isSelectedSessionRunning || !hasDraftInput) {
      return;
    }

    await promptSession(false);
  }, [hasDraftInput, isSelectedSessionRunning, promptSession, selectedSession]);

  const draftSubmitAriaLabel = selectedSession
    ? shouldShowInterruptComposerAction
      ? (isInterruptSessionInFlight ? "Interrupting session" : "Interrupt session")
      : shouldUseComposerForHumanQuestionAnswer
        ? (isResolveInboxHumanQuestionInFlight ? "Sending answer" : "Send answer")
        : isPromptSessionInFlight
          ? "Sending message"
          : "Send message"
    : isCreateSessionInFlight
      ? "Creating chat"
      : "Start chat";
  const queueDraftAriaLabel = isPromptSessionInFlight ? "Queueing message" : "Queue message";
  const isDesktopChatListVisible = !isMobile && !isChatListHidden;
  const shouldShowChatListButton = isMobile ? !isMobileChatListOpen : isChatListHidden;
  const selectedSessionTitle = selectedSession
    ? resolveSessionTitle(selectedSession, selectedSessionMessages)
    : "Untitled chat";
  const selectedSessionTask = selectedSession?.associatedTask ?? null;
  const chatsHeaderTitle = selectedSession
    ? selectedSessionTask?.name ?? selectedSessionTitle
    : selectedAgent
      ? selectedAgent.name
      : "Chat";
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

    if (selectedSession || (shouldUseCompactComposerSettings && selectedAgent)) {
      actions.push(
        <Button
          key="environment-panel"
          aria-label="Show chat settings"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => {
            setIsEnvironmentPanelOpen(true);
          }}
          size="icon-sm"
          title="Show chat settings"
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
  }, [isMobile, selectedAgent, selectedSession, shouldShowChatListButton, shouldUseCompactComposerSettings, showChatList]);
  const headerContent = useMemo(() => {
    const shouldShowTaskSessionSubtitle = selectedSessionTask
      && selectedSessionTitle.trim().length > 0
      && selectedSessionTitle !== selectedSessionTask.name;

    return (
      <div className="min-w-0">
        {selectedSessionTask ? (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <Badge className="shrink-0" variant="outline">
                <ListTodoIcon className="size-3" />
                Task
              </Badge>
              <Link
                className="min-w-0 truncate text-sm font-medium text-foreground transition hover:text-primary hover:underline"
                params={{
                  organizationSlug,
                  taskId: selectedSessionTask.id,
                }}
                to={OrganizationPath.route("/tasks/$taskId")}
              >
                {chatsHeaderTitle}
              </Link>
            </div>
            {shouldShowTaskSessionSubtitle ? (
              <p className="truncate pt-0.5 text-xs text-muted-foreground">{selectedSessionTitle}</p>
            ) : null}
          </>
        ) : (
          <p className="truncate text-sm font-medium text-foreground">{chatsHeaderTitle}</p>
        )}
      </div>
    );
  }, [chatsHeaderTitle, organizationSlug, selectedSessionTask, selectedSessionTitle]);
  useApplicationHeader({
    actions: headerAction,
    className: "min-h-12",
    content: headerContent,
  });

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
        <div className="flex h-full w-full flex-col">
          <ChatListPanel
            archivingSessionId={archivingSessionId}
            chatListAgents={chatListAgents}
            collapsedChatListAgentIds={collapsedChatListAgentIds}
            isArchiveSessionInFlight={isArchiveSessionInFlight}
            onArchiveSession={(session) => {
              void archiveSession(session);
            }}
            onExpandAgent={expandChatListAgent}
            onHideChatList={hideChatList}
            onOpenDraftForAgent={(agentId) => {
              void openDraftForAgent(agentId);
            }}
            onOpenNewChat={() => {
              setIsNewChatDialogOpen(true);
            }}
            onOpenSession={(agentId, sessionId) => {
              void openSession(agentId, sessionId);
            }}
            onToggleAgentExpanded={toggleChatListAgentExpanded}
            organizationSlug={organizationSlug}
            panelMode="mobile"
            selectedAgent={selectedAgent}
            selectedSession={selectedSession}
            sessionIdsWithOpenHumanQuestions={sessionIdsWithOpenHumanQuestions}
            sessionTitleOverridesById={sessionTitleOverridesById}
            sessionsByAgentId={sessionsByAgentId}
            sortedAgents={sortedAgents}
          />
        </div>
      </SheetContent>
    </Sheet>
  ) : null;

  const newChatDialog = (
    <ChatSelectionDialog
      description="Pick an agent to open a fresh draft chat."
      items={newChatAgentItems}
      noItemsMessage="Create an agent first from the Agents page."
      noResultsMessage="No agents match your search."
      onOpenChange={setIsNewChatDialogOpen}
      onSelect={(agentId) => {
        setIsNewChatDialogOpen(false);
        expandChatListAgent(agentId);
        void openDraftForAgent(agentId);
      }}
      open={isNewChatDialogOpen}
      searchPlaceholder="Search agents"
      selectedItemId={selectedAgent?.id ?? null}
      title="Start a new chat"
    />
  );

  return (
    <main className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
      {mobileChatListOverlay}
      {newChatDialog}
      <ChatEnvironmentPanel
        actingSessionEnvironmentId={actingSessionEnvironmentId}
        composerModelOptionId={composerModelOptionId}
        composerModelOptions={composerModelOptions}
        composerReasoningLevel={composerReasoningLevel}
        deletingSessionEnvironmentId={deletingSessionEnvironmentId}
        isLoadingSessionEnvironment={isLoadingSessionEnvironment}
        isMobile={isMobile}
        isOpen={isEnvironmentPanelOpen}
        onComposerModelOptionChange={setComposerModelOptionId}
        onComposerReasoningLevelChange={setComposerReasoningLevel}
        onDeleteEnvironment={deleteSessionEnvironment}
        onManageEnvironments={() => {
          setIsEnvironmentPanelOpen(false);
          void navigate({
            params: {
              organizationSlug,
            },
            to: OrganizationPath.route("/environments"),
          });
        }}
        onOpenChange={setIsEnvironmentPanelOpen}
        onOpenEnvironmentDesktop={openSessionEnvironmentDesktop}
        onStartEnvironment={startSessionEnvironment}
        onStopEnvironment={stopSessionEnvironment}
        onUpdateSessionTitle={async (nextTitle) => {
          if (!selectedSession) {
            return;
          }

          await updateSessionTitle(selectedSession.id, nextTitle);
        }}
        selectedAgent={selectedAgent}
        selectedComposerModelOption={selectedComposerModelOption}
        selectedSession={selectedSession}
        selectedSessionTitle={selectedSessionTitle}
        sessionEnvironmentErrorMessage={sessionEnvironmentErrorMessage}
        sessionEnvironmentInfo={sessionEnvironmentInfo}
        shouldUseCompactComposerSettings={shouldUseCompactComposerSettings}
      />

      <Card className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
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
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pl-4 pr-0 pt-0 pb-0 md:pt-0 md:pb-0">
            <ChatTranscriptPane
              forkingTurnId={forkingTurnId}
              isTranscriptStuckToBottom={isTranscriptStuckToBottom}
              isLoadingOlderMessages={isLoadingOlderTranscript}
              isLoadingTranscript={isLoadingTranscript}
              onForkTurn={(turnId) => {
                void forkSessionFromTurn(turnId);
              }}
              onJumpToLatest={jumpToLatestMessage}
              onScroll={handleTranscriptScroll}
              organizationSlug={organizationSlug}
              session={selectedSession}
              sessionMessages={selectedSessionMessages}
              transcriptScrollRef={transcriptScrollRef}
            />
          </CardContent>
        ) : null}

        {selectedAgent ? (
          <ChatComposerPane
            canInterruptSelectedSession={canInterruptSelectedSession}
            canSubmitDraft={canSubmitDraft}
            composerModelOptionId={composerModelOptionId}
            composerModelOptions={composerModelOptions}
            composerReasoningLevel={composerReasoningLevel}
            deletingQueuedMessageId={deletingQueuedMessageId}
            draftImageFileInputRef={draftImageFileInputRef}
            draftImages={draftImages}
            draftMessage={draftMessage}
            draftSubmitAriaLabel={draftSubmitAriaLabel}
            draftTextareaRef={draftTextareaRef}
            hasDraftInput={hasDraftInput}
            isComposerDragActive={isComposerDragActive}
            isDismissInboxHumanQuestionInFlight={isDismissInboxHumanQuestionInFlight}
            isResolveInboxHumanQuestionInFlight={isResolveInboxHumanQuestionInFlight}
            onComposerDragEnter={handleComposerDragEnter}
            onComposerDragLeave={handleComposerDragLeave}
            onComposerDragOver={handleComposerDragOver}
            onComposerDrop={handleComposerDrop}
            onDeleteQueuedMessage={(queuedMessageId) => {
              void deleteQueuedMessage(queuedMessageId);
            }}
            onDismissHumanQuestion={(inboxItemId) => {
              void dismissHumanQuestion(inboxItemId);
            }}
            onDraftImageInputChange={handleDraftImageInputChange}
            onDraftMessageChange={setDraftMessage}
            onModelChange={setComposerModelOptionId}
            onOpenDraftImagePicker={openDraftImagePicker}
            onQueueDraft={() => {
              void queueDraftMessage();
            }}
            onReasoningLevelChange={setComposerReasoningLevel}
            onRemoveDraftImage={removeDraftImage}
            onResolveHumanQuestion={(input) => {
              void resolveHumanQuestion(input);
            }}
            onStartDraftTextareaResize={startDraftTextareaResize}
            onSteerQueuedMessage={(queuedMessageId) => {
              void steerQueuedMessage(queuedMessageId);
            }}
            onSubmitDraft={() => {
              void submitDraft();
            }}
            queueDraftAriaLabel={queueDraftAriaLabel}
            queuedMessages={queuedMessages}
            selectedSession={selectedSession}
            selectedSessionHumanQuestion={selectedSessionHumanQuestion}
            shouldShowInterruptComposerAction={shouldShowInterruptComposerAction}
            shouldShowQueueComposerAction={shouldShowQueueComposerAction}
            shouldUseCompactComposerSettings={shouldUseCompactComposerSettings}
            steeringQueuedMessageId={steeringQueuedMessageId}
          />
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
          <ChatListPanel
            archivingSessionId={archivingSessionId}
            chatListAgents={chatListAgents}
            collapsedChatListAgentIds={collapsedChatListAgentIds}
            isArchiveSessionInFlight={isArchiveSessionInFlight}
            onArchiveSession={(session) => {
              void archiveSession(session);
            }}
            onExpandAgent={expandChatListAgent}
            onHideChatList={hideChatList}
            onOpenDraftForAgent={(agentId) => {
              void openDraftForAgent(agentId);
            }}
            onOpenNewChat={() => {
              setIsNewChatDialogOpen(true);
            }}
            onOpenSession={(agentId, sessionId) => {
              void openSession(agentId, sessionId);
            }}
            onToggleAgentExpanded={toggleChatListAgentExpanded}
            organizationSlug={organizationSlug}
            panelMode="desktop"
            selectedAgent={selectedAgent}
            selectedSession={selectedSession}
            sessionIdsWithOpenHumanQuestions={sessionIdsWithOpenHumanQuestions}
            sessionTitleOverridesById={sessionTitleOverridesById}
            sessionsByAgentId={sessionsByAgentId}
            sortedAgents={sortedAgents}
          />
        </div>
      ) : null}
    </main>
  );
}
