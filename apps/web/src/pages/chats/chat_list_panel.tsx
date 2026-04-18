import { Link } from "@tanstack/react-router";
import { ArchiveIcon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import type { AgentRecord, SessionRecord } from "./chats_page_data";
import {
  CHAT_LIST_LEFT_GUTTER_CLASS,
  isRunningSession,
  renderSessionListStatusIndicator,
  resolveSessionTitleOverride,
} from "./chats_page_helpers";

export function ChatListPanel({
  panelMode,
  organizationSlug,
  sortedAgents,
  chatListAgents,
  sessionsByAgentId,
  selectedAgent,
  selectedSession,
  sessionIdsWithOpenHumanQuestions,
  collapsedChatListAgentIds,
  sessionTitleOverridesById,
  isArchiveSessionInFlight,
  archivingSessionId,
  onHideChatList,
  onOpenNewChat,
  onToggleAgentExpanded,
  onExpandAgent,
  onOpenDraftForAgent,
  onOpenSession,
  onArchiveSession,
}: {
  panelMode: "desktop" | "mobile";
  organizationSlug: string;
  sortedAgents: ReadonlyArray<AgentRecord>;
  chatListAgents: ReadonlyArray<AgentRecord>;
  sessionsByAgentId: ReadonlyMap<string, SessionRecord[]>;
  selectedAgent: AgentRecord | null;
  selectedSession: SessionRecord | null;
  sessionIdsWithOpenHumanQuestions: ReadonlySet<string>;
  collapsedChatListAgentIds: Readonly<Record<string, boolean>>;
  sessionTitleOverridesById: Readonly<Record<string, string>>;
  isArchiveSessionInFlight: boolean;
  archivingSessionId: string | null;
  onHideChatList: () => void;
  onOpenNewChat: () => void;
  onToggleAgentExpanded: (agentId: string) => void;
  onExpandAgent: (agentId: string) => void;
  onOpenDraftForAgent: (agentId: string) => void;
  onOpenSession: (agentId: string, sessionId: string) => void;
  onArchiveSession: (session: SessionRecord) => void;
}) {
  const isMobilePanel = panelMode === "mobile";
  const hideButtonLabel = isMobilePanel ? "Close chats panel" : "Hide chats list";
  const hasAvailableAgents = sortedAgents.length > 0;
  const hasExistingChats = chatListAgents.length > 0;
  const emptyState = !hasAvailableAgents ? (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">No agents yet</p>
      <p className="mt-2 text-xs/relaxed text-muted-foreground">
        Create an agent first from the{" "}
        <Link
          className="text-primary hover:underline"
          params={{ organizationSlug }}
          to={OrganizationPath.route("/agents")}
        >
          Agents
        </Link>{" "}
        page.
      </p>
    </div>
  ) : !hasExistingChats ? (
    <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
      <p className="text-sm font-medium text-foreground">No chats yet</p>
      <p className="mt-2 text-xs/relaxed text-muted-foreground">
        Start a new chat to begin a conversation with any agent.
      </p>
    </div>
  ) : null;

  const content = (
    <ul className="grid min-w-0 gap-[3px]" role="list" aria-label="Agents">
      {chatListAgents.map((agent) => {
        const agentSessions = sessionsByAgentId.get(agent.id) ?? [];
        const isAgentSelected = selectedAgent?.id === agent.id;
        const isAgentExpanded = collapsedChatListAgentIds[agent.id] !== true;
        const agentSessionListId = `${panelMode}-agent-sessions-${agent.id}`;

        return (
          <li
            key={agent.id}
            className="min-w-0 px-0 py-0.5"
          >
            <div className="flex items-center gap-2">
              {agentSessions.length > 0 ? (
                <button
                  aria-controls={agentSessionListId}
                  aria-expanded={isAgentExpanded}
                  aria-label={`${isAgentExpanded ? "Collapse" : "Expand"} chats for ${agent.name}`}
                  className={`inline-flex h-8 w-6 shrink-0 items-center justify-center rounded-lg transition ${
                    isMobilePanel
                      ? "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                  }`}
                  onClick={() => {
                    onToggleAgentExpanded(agent.id);
                  }}
                  type="button"
                >
                  <ChevronRightIcon className={`size-4 transition-transform ${isAgentExpanded ? "rotate-90" : ""}`} />
                </button>
              ) : (
                <span className="inline-flex h-8 w-6 shrink-0" aria-hidden="true" />
              )}
              <button
                className={`min-w-0 flex-1 ${isMobilePanel ? "rounded-md" : ""} py-1 text-left`}
                onClick={() => {
                  onExpandAgent(agent.id);
                  onOpenDraftForAgent(agent.id);
                }}
                type="button"
              >
                <p className={`truncate text-sm font-medium ${isMobilePanel ? "text-sidebar-foreground" : "text-foreground"}`}>
                  {agent.name}
                </p>
              </button>
              <button
                aria-label={`Create chat for ${agent.name}`}
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                  isAgentSelected && !selectedSession
                    ? isMobilePanel
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "bg-primary/12 text-primary"
                    : isMobilePanel
                    ? "bg-transparent text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
                onClick={() => {
                  onExpandAgent(agent.id);
                  onOpenDraftForAgent(agent.id);
                }}
                type="button"
              >
                <PlusIcon className="size-5" />
              </button>
            </div>

            {agentSessions.length > 0 && isAgentExpanded ? (
              <ul
                id={agentSessionListId}
                className="mt-0.5 grid min-w-0 gap-1"
                role="list"
                aria-label={`${agent.name} sessions`}
              >
                {agentSessions.map((session) => {
                  const isSessionSelected = selectedSession?.id === session.id;
                  const isSessionArchiving = isArchiveSessionInFlight && archivingSessionId === session.id;
                  const hasOpenHumanQuestion = sessionIdsWithOpenHumanQuestions.has(session.id);
                  const isSessionRunning = isRunningSession(session);
                  const sessionListTitle = resolveSessionTitleOverride(session, sessionTitleOverridesById);
                  const hasAssociatedTask = Boolean(session.associatedTask);

                  return (
                    <li key={session.id}>
                      <div
                        className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1 rounded-lg pr-1 py-1 transition ${
                          isSessionSelected
                            ? isMobilePanel
                              ? "bg-sidebar-accent"
                              : "bg-muted/45"
                            : isMobilePanel
                            ? "bg-transparent hover:bg-sidebar-accent/70"
                            : "bg-transparent hover:bg-muted/30"
                        }`}
                      >
                        <button
                          className="flex min-w-0 items-center gap-2 overflow-hidden pr-1 text-left"
                          disabled={isSessionArchiving}
                          onClick={() => {
                            onOpenSession(agent.id, session.id);
                          }}
                          type="button"
                        >
                          <span className="flex h-8 w-6 shrink-0 items-center justify-center">
                            {renderSessionListStatusIndicator({
                              hasOpenHumanQuestion,
                              hasUnread: session.hasUnread,
                              isSessionRunning,
                            })}
                          </span>
                          <span className="flex min-w-0 flex-1 items-center gap-1.5">
                            <span className={`block min-w-0 flex-1 truncate text-xs font-medium ${isMobilePanel ? "text-sidebar-foreground" : "text-foreground"}`}>
                              {sessionListTitle}
                            </span>
                            {hasAssociatedTask ? (
                              <Badge
                                aria-label="Task-linked chat"
                                className="h-4 px-1 text-[0.55rem] leading-none"
                                title="Task-linked chat"
                                variant="outline"
                              >
                                Task
                              </Badge>
                            ) : null}
                          </span>
                        </button>
                        <div className="flex shrink-0 items-start gap-2">
                          <button
                            aria-label={`Archive ${sessionListTitle}`}
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-transparent transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              isMobilePanel
                                ? "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                            disabled={isSessionArchiving}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onArchiveSession(session);
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
            ) : null}
          </li>
        );
      })}
    </ul>
  );

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
            onClick={onHideChatList}
            size="icon-sm"
            title={hideButtonLabel}
            variant="ghost"
          >
            <XIcon className="size-4" />
          </Button>
        </div>

        <div className="no-scrollbar flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
          <Button
            className="mb-4 w-full justify-start gap-2 px-5"
            disabled={!hasAvailableAgents}
            onClick={onOpenNewChat}
            size="lg"
            type="button"
          >
            <PlusIcon className="size-4" />
            New chat
          </Button>

          {!hasExistingChats ? (
            <div className="mb-4 rounded-xl border border-dashed border-sidebar-border bg-sidebar-accent/25 px-4 py-10 text-center">
              {!hasAvailableAgents ? (
                <>
                  <p className="text-sm font-medium text-sidebar-foreground">No agents yet</p>
                  <p className="mt-2 text-xs/relaxed text-sidebar-foreground/65">
                    Create an agent first from the{" "}
                    <Link
                      className="text-sidebar-primary hover:underline"
                      params={{ organizationSlug }}
                      to={OrganizationPath.route("/agents")}
                    >
                      Agents
                    </Link>{" "}
                    page.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-sidebar-foreground">No chats yet</p>
                  <p className="mt-2 text-xs/relaxed text-sidebar-foreground/65">
                    Start a new chat to begin a conversation with any agent.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border-0 bg-transparent shadow-none ring-0">
        <CardContent className="no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-0">
          <div className={`${CHAT_LIST_LEFT_GUTTER_CLASS} pr-3 md:pr-3`}>
            <div className="mb-2 flex items-center justify-end pr-1">
              <Button
                aria-label={hideButtonLabel}
                className="text-muted-foreground hover:text-foreground"
                onClick={onHideChatList}
                size="icon-sm"
                title={hideButtonLabel}
                variant="ghost"
              >
                <XIcon className="size-4" />
              </Button>
            </div>

            <Button
              className="mb-2 w-full justify-start gap-2 px-5"
              disabled={!hasAvailableAgents}
              onClick={onOpenNewChat}
              size="lg"
              type="button"
            >
              <PlusIcon className="size-4" />
              New chat
            </Button>

            {emptyState ? (
              <div className="mb-4">{emptyState}</div>
            ) : null}

            {content}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
