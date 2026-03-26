import { Suspense, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { MessageSquarePlusIcon, SendHorizonalIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      userMessage
      createdAt
      updatedAt
    }
  }
`;

type AgentRecord = chatsPageQuery["response"]["Agents"][number];
type SessionRecord = chatsPageQuery["response"]["Sessions"][number];

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
    <main className="flex flex-1 flex-col gap-6 lg:min-h-0 lg:flex-row">
      <Card className="rounded-2xl border border-border/60 shadow-sm lg:w-[22rem] lg:shrink-0">
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

      <Card className="flex min-h-[32rem] flex-1 flex-col rounded-2xl border border-border/60 shadow-sm">
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

  const sortedAgents = useMemo(() => {
    return [...data.Agents].sort((leftAgent, rightAgent) => leftAgent.name.localeCompare(rightAgent.name));
  }, [data.Agents]);
  const sessionsByAgentId = useMemo(() => {
    const nextMap = new Map<string, SessionRecord[]>();

    for (const session of data.Sessions) {
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
  }, [data.Sessions]);
  const sessionById = useMemo(() => {
    return new Map(data.Sessions.map((session) => [session.id, session]));
  }, [data.Sessions]);

  const resolvedSelectedSession = search.sessionId ? sessionById.get(search.sessionId) ?? null : null;
  const resolvedSelectedAgentId = search.agentId ?? resolvedSelectedSession?.agentId ?? "";
  const selectedAgent = sortedAgents.find((agent) => agent.id === resolvedSelectedAgentId) ?? null;
  const selectedSession = resolvedSelectedSession && resolvedSelectedSession.agentId === selectedAgent?.id
    ? resolvedSelectedSession
    : null;
  const canSubmitDraft = Boolean(selectedAgent && draftMessage.trim().length > 0) && !isCreateSessionInFlight;

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

  return (
    <main className="flex flex-1 flex-col gap-6 lg:min-h-0 lg:flex-row">
      <Card className="rounded-2xl border border-border/60 shadow-sm lg:w-[22rem] lg:shrink-0">
        <CardHeader>
          <CardTitle>Chats</CardTitle>
          <CardDescription>Select an agent, start a new chat, or reopen an existing session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
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
                    <Button
                      onClick={() => {
                        void openDraftForAgent(agent.id);
                      }}
                      size="sm"
                      type="button"
                      variant={isAgentSelected && !selectedSession ? "default" : "outline"}
                    >
                      <MessageSquarePlusIcon />
                      Create chat
                    </Button>
                  </div>

                  {agentSessions.length > 0 ? (
                    <ul className="mt-3 grid gap-2 border-t border-border/60 pt-3" role="list" aria-label={`${agent.name} sessions`}>
                      {agentSessions.map((session) => {
                        const isSessionSelected = selectedSession?.id === session.id;

                        return (
                          <li key={session.id}>
                            <button
                              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                                isSessionSelected
                                  ? "border-primary/60 bg-primary/10"
                                  : "border-border/60 bg-background hover:bg-muted/40"
                              }`}
                              onClick={() => {
                                void openSession(agent.id, session.id);
                              }}
                              type="button"
                            >
                              <p className="truncate text-xs font-medium text-foreground">
                                {formatSessionTitle(session.userMessage)}
                              </p>
                              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                                {formatTimestamp(session.updatedAt)}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">No chats yet.</p>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="flex min-h-[32rem] flex-1 flex-col rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/60">
          <CardTitle>{selectedAgent ? selectedAgent.name : "Chat"}</CardTitle>
          <CardDescription>
            {selectedSession
              ? `Session ${selectedSession.id}`
              : selectedAgent
                ? "New chat draft"
                : "Choose an agent from the sidebar to start a chat."}
          </CardDescription>
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
                <textarea
                  id="chat-draft-message"
                  className="min-h-32 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                  onChange={(event) => {
                    setDraftMessage(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      event.preventDefault();
                      void startSession();
                    }
                  }}
                  placeholder="Ask the agent to summarize a repo, draft a plan, or investigate a problem."
                  rows={6}
                  value={draftMessage}
                />
                <div className="flex justify-end">
                  <Button
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

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Model</p>
                <p className="mt-3 text-sm text-foreground">{selectedSession.modelId}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Reasoning</p>
                <p className="mt-3 text-sm text-foreground">
                  {selectedSession.reasoningLevel.length > 0 ? selectedSession.reasoningLevel : "Default"}
                </p>
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
