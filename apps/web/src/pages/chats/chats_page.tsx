import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArchiveIcon, Loader2Icon, PlusIcon, SendHorizonalIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { chatsPageArchiveSessionMutation } from "./__generated__/chatsPageArchiveSessionMutation.graphql";
import type { chatsPageCreateSessionMutation } from "./__generated__/chatsPageCreateSessionMutation.graphql";
import type { chatsPageQuery } from "./__generated__/chatsPageQuery.graphql";

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
      status
      userMessage
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
      modelId
      reasoningLevel
      status
      userMessage
      createdAt
      updatedAt
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
      status
      userMessage
      createdAt
      updatedAt
    }
  }
`;

type AgentRecord = chatsPageQuery["response"]["Agents"][number];
type SessionRecord = chatsPageQuery["response"]["Sessions"][number];

const CHAT_LIST_MIN_WIDTH = 280;
const CHAT_LIST_MAX_WIDTH = 520;
const CHAT_LIST_DEFAULT_WIDTH = 352;
const CHAT_LIST_WIDTH_STORAGE_KEY = "companyhelm.chats.listWidth";

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

function formatReasoningLabel(reasoningLevel: string): string {
  return reasoningLevel.trim().length > 0 ? reasoningLevel : "Default reasoning";
}

function formatSessionMeta(session: Pick<SessionRecord, "modelId" | "reasoningLevel">): string {
  const segments = [session.modelId, formatReasoningLabel(session.reasoningLevel)].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return segments.length > 0 ? segments.join(" • ") : "No session model selected";
}

function formatDraftMeta(agent: Pick<AgentRecord, "modelName" | "reasoningLevel">): string {
  const segments = [agent.modelName, agent.reasoningLevel].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
  return segments.length > 0 ? segments.join(" • ") : "No default model configured";
}

function formatSessionTitle(userMessage: string): string {
  const normalizedMessage = userMessage.trim();
  if (normalizedMessage.length === 0) {
    return "Untitled chat";
  }

  const firstLine = normalizedMessage.split(/\r?\n/, 1)[0] ?? normalizedMessage;
  if (firstLine.length <= 72) {
    return firstLine;
  }

  return `${firstLine.slice(0, 69).trimEnd()}...`;
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

function ChatsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6 lg:min-h-0 lg:gap-0 lg:flex-row">
      <Card className="rounded-2xl border-0 bg-transparent shadow-none lg:w-[22rem] lg:shrink-0">
        <CardHeader>
          <CardTitle>Chats</CardTitle>
          <CardDescription>Loading agents and sessions…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading chats…
          </div>
        </CardContent>
      </Card>

      <Card className="flex min-h-[32rem] flex-1 flex-col rounded-2xl border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>Loading selected chat…</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}

function ChatsPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const [draftMessage, setDraftMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [archivingSessionId, setArchivingSessionId] = useState<string | null>(null);
  const [chatListWidth, setChatListWidth] = useState(loadChatListWidth);
  const [isResizingChatList, setIsResizingChatList] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(CHAT_LIST_DEFAULT_WIDTH);
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
  const canSubmitDraft = Boolean(selectedAgent && draftMessage.trim().length > 0) && !isCreateSessionInFlight;
  const chatListPanelStyle: CSSProperties = {
    "--chats-list-width": `${chatListWidth}px`,
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CHAT_LIST_WIDTH_STORAGE_KEY, String(chatListWidth));
  }, [chatListWidth]);

  useEffect(() => {
    if (!search.agentId || !search.sessionId || selectedSession) {
      return;
    }

    void navigate({
      replace: true,
      to: "/chats",
      search: {
        agentId: search.agentId,
      },
    });
  }, [navigate, search.agentId, search.sessionId, selectedSession]);

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

    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitCreateSession({
        variables: {
          input: {
            agentId: selectedAgent.id,
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
            await navigate({
              to: "/chats",
              search: {
                agentId: createdSession.agentId,
                sessionId: createdSession.id,
              },
            });
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
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

  const startChatListResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = chatListWidth;
    setIsResizingChatList(true);
  };

  return (
    <main className="flex flex-1 flex-col gap-6 lg:min-h-0 lg:gap-0 lg:flex-row">
      <div
        className="relative w-full lg:w-[var(--chats-list-width)] lg:shrink-0"
        style={chatListPanelStyle}
      >
        <Card className="flex h-full min-h-[32rem] flex-col rounded-2xl border-0 bg-transparent shadow-none">
          <CardHeader>
            <CardTitle>Chats</CardTitle>
            <CardDescription>Select an agent, start a new chat, or reopen an existing session.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
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
                    className={`rounded-xl border px-3 py-3 transition ${
                      isAgentSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-border/60 bg-card/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => {
                          void openDraftForAgent(agent.id);
                        }}
                        type="button"
                      >
                        <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
                        <p className="mt-1 text-xs/relaxed text-muted-foreground">{formatAgentMeta(agent)}</p>
                      </button>
                    </div>

                    <div className="mt-3 border-t border-border/60 pt-3">
                      <button
                        aria-label={`Create chat for ${agent.name}`}
                        className={`flex w-full items-center justify-center rounded-lg border px-3 py-3 text-sm font-medium transition ${
                          isAgentSelected && !selectedSession
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
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
                                  className={`flex items-start gap-2 rounded-lg border px-3 py-2 transition ${
                                    isSessionSelected
                                      ? "border-primary/60 bg-primary/10"
                                      : "border-border/60 bg-background hover:bg-muted/40"
                                  }`}
                                >
                                  <button
                                    className="min-w-0 flex-1 text-left"
                                    disabled={isSessionArchiving}
                                    onClick={() => {
                                      void openSession(agent.id, session.id);
                                    }}
                                    type="button"
                                  >
                                    <p className="truncate text-xs font-medium text-foreground">
                                      {formatSessionTitle(session.userMessage)}
                                    </p>
                                    <p className="mt-1 text-[0.7rem] text-muted-foreground">
                                      {isSessionArchiving
                                        ? "Archiving..."
                                        : isSessionRunning
                                          ? `Running • ${formatTimestamp(session.updatedAt)}`
                                          : formatTimestamp(session.updatedAt)}
                                    </p>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <button
                                      aria-label={`Archive ${formatSessionTitle(session.userMessage)}`}
                                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
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
                                    {isSessionRunning ? (
                                      <Loader2Icon
                                        aria-label="Session running"
                                        className="size-4 shrink-0 animate-spin text-muted-foreground"
                                        title="Session running"
                                      />
                                    ) : null}
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
          className={`absolute inset-y-0 -right-3 z-10 hidden w-6 items-center justify-center lg:flex lg:cursor-ew-resize ${
            isResizingChatList ? "bg-muted/30" : ""
          }`}
          onPointerDown={startChatListResize}
          type="button"
        >
          <span className="h-full w-px bg-border/70" />
        </button>
      </div>

      <Card className="flex min-h-[32rem] flex-1 flex-col rounded-2xl border-0 bg-transparent shadow-none">
        <CardHeader>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <CardTitle>{selectedAgent ? selectedAgent.name : "Chat"}</CardTitle>
              {selectedSession ? (
                <p className="text-xs font-medium text-muted-foreground/80">{formatSessionMeta(selectedSession)}</p>
              ) : selectedAgent ? (
                <p className="text-xs font-medium text-muted-foreground/80">{formatDraftMeta(selectedAgent)}</p>
              ) : null}
            </div>
            <CardDescription>
              {selectedSession
                ? `Updated ${formatTimestamp(selectedSession.updatedAt)}`
                : selectedAgent
                  ? "New chat draft"
                  : "Choose an agent from the sidebar to start a chat."}
            </CardDescription>
          </div>
        </CardHeader>

        {errorMessage ? (
          <div className="px-6 pt-6">
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          </div>
        ) : null}

        {!selectedAgent ? (
          <CardContent className="flex flex-1 items-center justify-center">
            <div className="max-w-sm text-center">
              <p className="text-sm font-medium text-foreground">Pick an agent to begin</p>
              <p className="mt-2 text-sm/relaxed text-muted-foreground">
                The chats page mirrors the agent-first workflow from `companyhelm-web`: choose an agent, open a blank draft, then create the session on first send.
              </p>
            </div>
          </CardContent>
        ) : null}

        {selectedAgent && !selectedSession ? (
          <>
            <CardContent className="flex flex-1 items-center justify-center">
              <div className="max-w-xl text-center">
                <p className="text-sm font-medium text-foreground">Start a new chat with {selectedAgent.name}</p>
                <p className="mt-2 text-sm/relaxed text-muted-foreground">
                  The first message creates the session and moves this page to the session URL.
                </p>
                <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-left">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Selected agent</p>
                  <p className="mt-3 text-sm font-medium text-foreground">{selectedAgent.name}</p>
                  <p className="mt-2 text-xs/relaxed text-muted-foreground">{formatAgentMeta(selectedAgent)}</p>
                </div>
              </div>
            </CardContent>

            <div className="border-t border-border/60 p-4 md:p-6">
              <div className="grid gap-3">
                <label className="text-xs font-medium text-foreground" htmlFor="chat-draft-message">
                  First message
                </label>
                <div className="flex items-end gap-3">
                  <textarea
                    id="chat-draft-message"
                    className="min-h-32 flex-1 rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    onChange={(event) => {
                      setDraftMessage(event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                        return;
                      }

                      event.preventDefault();
                      void startSession();
                    }}
                    placeholder="Ask the agent to summarize a repo, draft a plan, or investigate a problem."
                    rows={6}
                    value={draftMessage}
                  />
                  <Button
                    className="shrink-0"
                    disabled={!canSubmitDraft}
                    onClick={() => {
                      void startSession();
                    }}
                    size="lg"
                    type="button"
                  >
                    <SendHorizonalIcon />
                    {isCreateSessionInFlight ? "Creating chat..." : "Start chat"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {selectedAgent && selectedSession ? (
          <CardContent className="flex flex-1 flex-col gap-6 p-6">
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">First message</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{selectedSession.userMessage}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Status</p>
                <p className="mt-3 text-sm text-foreground">{selectedSession.status}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Created</p>
                <p className="mt-3 text-sm text-foreground">{formatTimestamp(selectedSession.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
                <p className="mt-3 text-sm text-foreground">{formatTimestamp(selectedSession.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
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
