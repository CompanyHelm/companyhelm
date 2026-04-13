import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { graphql, useMutation } from "react-relay";
import { Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelAction,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPrimaryAction,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import type { agentArchivedChatsTabDeleteSessionMutation } from "./__generated__/agentArchivedChatsTabDeleteSessionMutation.graphql";
import type { agentArchivedChatsTabUnarchiveSessionMutation } from "./__generated__/agentArchivedChatsTabUnarchiveSessionMutation.graphql";

const agentArchivedChatsTabUnarchiveSessionMutationNode = graphql`
  mutation agentArchivedChatsTabUnarchiveSessionMutation($input: UnarchiveSessionInput!) {
    UnarchiveSession(input: $input) {
      id
      status
    }
  }
`;

const agentArchivedChatsTabDeleteSessionMutationNode = graphql`
  mutation agentArchivedChatsTabDeleteSessionMutation($input: DeleteSessionInput!) {
    DeleteSession(input: $input) {
      id
    }
  }
`;

type AgentArchivedChatsTabSessionRecord = {
  agentId: string;
  associatedTask: {
    id: string;
    name: string;
    status: string;
  } | null;
  createdAt: string;
  id: string;
  inferredTitle: string | null;
  lastUserMessageAt: string | null;
  updatedAt: string;
  userSetTitle: string | null;
};

interface AgentArchivedChatsTabProps {
  sessions: ReadonlyArray<AgentArchivedChatsTabSessionRecord>;
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

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

function resolveSessionTitle(session: Pick<AgentArchivedChatsTabSessionRecord, "inferredTitle" | "userSetTitle">): string {
  const userDefinedTitle = session.userSetTitle?.trim() ?? "";
  if (userDefinedTitle.length > 0) {
    return userDefinedTitle;
  }

  const inferredTitle = session.inferredTitle?.trim() ?? "";
  if (inferredTitle.length > 0) {
    return inferredTitle;
  }

  return "Untitled chat";
}

function SelectionCheckbox(props: {
  checked: boolean;
  disabled?: boolean;
  indeterminate?: boolean;
  label: string;
  onChange: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.indeterminate = Boolean(props.indeterminate);
  }, [props.indeterminate]);

  return (
    <input
      ref={inputRef}
      aria-label={props.label}
      checked={props.checked}
      className="size-4 rounded border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      disabled={props.disabled}
      onChange={props.onChange}
      type="checkbox"
    />
  );
}

/**
 * Keeps archived chats attached to the agent detail page so operators can restore or permanently
 * remove stale sessions without switching into the main chats workspace first.
 */
export function AgentArchivedChatsTab(props: AgentArchivedChatsTabProps) {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [removedSessionIds, setRemovedSessionIds] = useState<string[]>([]);
  const [deletingSessionIds, setDeletingSessionIds] = useState<string[]>([]);
  const [unarchivingSessionId, setUnarchivingSessionId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [commitUnarchiveSession] = useMutation<agentArchivedChatsTabUnarchiveSessionMutation>(
    agentArchivedChatsTabUnarchiveSessionMutationNode,
  );
  const [commitDeleteSession] = useMutation<agentArchivedChatsTabDeleteSessionMutation>(
    agentArchivedChatsTabDeleteSessionMutationNode,
  );

  // The parent query is not refetched after destructive mutations, so the tab keeps a local
  // tombstone list to remove rows immediately after each confirmed delete.
  const visibleSessions = props.sessions.filter((session) => !removedSessionIds.includes(session.id));
  const visibleSessionIds = visibleSessions.map((session) => session.id);
  const selectedVisibleSessionIds = selectedSessionIds.filter((sessionId) => visibleSessionIds.includes(sessionId));
  const areAllVisibleSessionsSelected = visibleSessionIds.length > 0
    && selectedVisibleSessionIds.length === visibleSessionIds.length;
  const hasPartiallySelectedVisibleSessions = selectedVisibleSessionIds.length > 0
    && !areAllVisibleSessionsSelected;
  const deletingSessionIdSet = new Set(deletingSessionIds);
  const isMutating = unarchivingSessionId !== null || deletingSessionIds.length > 0;

  const runDeleteSessionMutation = async (sessionId: string) => {
    await new Promise<void>((resolve, reject) => {
      commitDeleteSession({
        variables: {
          input: {
            sessionId,
          },
        },
        updater: (store) => {
          store.delete?.(sessionId);
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    });
  };

  const deleteArchivedChats = async (sessionIds: string[]) => {
    if (sessionIds.length === 0 || isMutating) {
      return;
    }

    setErrorMessage(null);
    setDeletingSessionIds(sessionIds);
    const deletedSessionIds: string[] = [];

    try {
      for (const sessionId of sessionIds) {
        await runDeleteSessionMutation(sessionId);
        deletedSessionIds.push(sessionId);
        setRemovedSessionIds((currentSessionIds) => {
          if (currentSessionIds.includes(sessionId)) {
            return currentSessionIds;
          }

          return [...currentSessionIds, sessionId];
        });
      }

      setSelectedSessionIds((currentSessionIds) => {
        return currentSessionIds.filter((sessionId) => !sessionIds.includes(sessionId));
      });
    } catch (error) {
      const baseMessage = error instanceof Error ? error.message : "Failed to delete archived chats.";
      setErrorMessage(
        deletedSessionIds.length > 0
          ? `${baseMessage} Deleted ${deletedSessionIds.length} chat${deletedSessionIds.length === 1 ? "" : "s"} before the error.`
          : baseMessage,
      );
      setSelectedSessionIds((currentSessionIds) => {
        return currentSessionIds.filter((sessionId) => !deletedSessionIds.includes(sessionId));
      });
    } finally {
      setDeletingSessionIds([]);
    }
  };

  const unarchiveChat = async (session: AgentArchivedChatsTabSessionRecord) => {
    if (isMutating) {
      return;
    }

    setErrorMessage(null);
    setUnarchivingSessionId(session.id);

    try {
      await new Promise<void>((resolve, reject) => {
        commitUnarchiveSession({
          variables: {
            input: {
              sessionId: session.id,
            },
          },
          onCompleted: (_response, errors) => {
            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });

      await navigate({
        params: {
          organizationSlug,
        },
        search: {
          agentId: session.agentId,
          sessionId: session.id,
        },
        to: OrganizationPath.route("/chats"),
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to unarchive chat.");
    } finally {
      setUnarchivingSessionId(null);
    }
  };

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Archived chats</CardTitle>
          <CardDescription>
            Restore archived chats back into the main chats workspace or permanently delete them in
            place.
          </CardDescription>
        </div>
        <CardAction>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={selectedVisibleSessionIds.length === 0 || isMutating}
                size="sm"
                variant="destructive"
              >
                <Trash2Icon />
                Delete selected
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete archived chats</AlertDialogTitle>
                <AlertDialogDescription>
                  Permanently delete {selectedVisibleSessionIds.length} archived chat
                  {selectedVisibleSessionIds.length === 1 ? "" : "s"}. This action cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancelAction asChild>
                  <AlertDialogCancelButton variant="outline">Cancel</AlertDialogCancelButton>
                </AlertDialogCancelAction>
                <AlertDialogPrimaryAction asChild>
                  <AlertDialogActionButton
                    disabled={selectedVisibleSessionIds.length === 0 || isMutating}
                    onClick={async () => {
                      await deleteArchivedChats(selectedVisibleSessionIds);
                    }}
                    variant="destructive"
                  >
                    Delete
                  </AlertDialogActionButton>
                </AlertDialogPrimaryAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {visibleSessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No archived chats</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              Chats archived for this agent will appear here so they can be restored or deleted.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <SelectionCheckbox
                    checked={areAllVisibleSessionsSelected}
                    disabled={isMutating}
                    indeterminate={hasPartiallySelectedVisibleSessions}
                    label="Select all archived chats"
                    onChange={() => {
                      setSelectedSessionIds((currentSessionIds) => {
                        if (areAllVisibleSessionsSelected) {
                          return currentSessionIds.filter((sessionId) => !visibleSessionIds.includes(sessionId));
                        }

                        return [
                          ...currentSessionIds.filter((sessionId) => !visibleSessionIds.includes(sessionId)),
                          ...visibleSessionIds,
                        ];
                      });
                    }}
                  />
                </TableHead>
                <TableHead>Chat</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Archived</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSessions.map((session) => {
                const isDeletingSession = deletingSessionIdSet.has(session.id);
                const isUnarchivingSession = unarchivingSessionId === session.id;
                const isSelected = selectedSessionIds.includes(session.id);

                return (
                  <TableRow key={session.id}>
                    <TableCell>
                      <SelectionCheckbox
                        checked={isSelected}
                        disabled={isMutating}
                        label={`Select archived chat ${resolveSessionTitle(session)}`}
                        onChange={() => {
                          setSelectedSessionIds((currentSessionIds) => {
                            if (currentSessionIds.includes(session.id)) {
                              return currentSessionIds.filter((sessionId) => sessionId !== session.id);
                            }

                            return [...currentSessionIds, session.id];
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="min-w-0">
                      <p className="truncate font-medium text-foreground">{resolveSessionTitle(session)}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{session.id}</p>
                    </TableCell>
                    <TableCell>
                      {session.associatedTask ? (
                        <div className="min-w-0">
                          <p className="truncate text-foreground">{session.associatedTask.name}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            {session.associatedTask.status}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{formatTimestamp(session.lastUserMessageAt ?? session.createdAt)}</TableCell>
                    <TableCell>{formatTimestamp(session.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          disabled={isMutating}
                          onClick={() => {
                            void unarchiveChat(session);
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {isUnarchivingSession ? "Opening..." : "Unarchive"}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              aria-label={`Delete archived chat ${resolveSessionTitle(session)}`}
                              disabled={isMutating}
                              size="sm"
                              type="button"
                              variant="destructive"
                            >
                              {isDeletingSession ? "Deleting..." : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete archived chat</AlertDialogTitle>
                              <AlertDialogDescription>
                                Permanently delete {resolveSessionTitle(session)}. This action
                                cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancelAction asChild>
                                <AlertDialogCancelButton variant="outline">Cancel</AlertDialogCancelButton>
                              </AlertDialogCancelAction>
                              <AlertDialogPrimaryAction asChild>
                                <AlertDialogActionButton
                                  disabled={isMutating}
                                  onClick={async () => {
                                    await deleteArchivedChats([session.id]);
                                  }}
                                  variant="destructive"
                                >
                                  Delete
                                </AlertDialogActionButton>
                              </AlertDialogPrimaryAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
