import { Suspense, useState } from "react";
import {
  CalendarClockIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { RecordProxy, RecordSourceSelectorProxy } from "relay-runtime";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoutineDialog, type RoutineDialogRecord } from "./routine_dialog";
import { RoutineTriggerDialog, type RoutineTriggerDialogRecord } from "./routine_trigger_dialog";
import type { routinesPageCreateRoutineCronTriggerMutation } from "./__generated__/routinesPageCreateRoutineCronTriggerMutation.graphql";
import type { routinesPageCreateRoutineMutation } from "./__generated__/routinesPageCreateRoutineMutation.graphql";
import type { routinesPageDeleteRoutineMutation } from "./__generated__/routinesPageDeleteRoutineMutation.graphql";
import type { routinesPageDeleteRoutineTriggerMutation } from "./__generated__/routinesPageDeleteRoutineTriggerMutation.graphql";
import type { routinesPageQuery } from "./__generated__/routinesPageQuery.graphql";
import type { routinesPageTriggerRoutineMutation } from "./__generated__/routinesPageTriggerRoutineMutation.graphql";
import type { routinesPageUpdateRoutineCronTriggerMutation } from "./__generated__/routinesPageUpdateRoutineCronTriggerMutation.graphql";
import type { routinesPageUpdateRoutineMutation } from "./__generated__/routinesPageUpdateRoutineMutation.graphql";

type RoutineRecord = routinesPageQuery["response"]["Routines"][number];
type RoutineTriggerRecord = RoutineRecord["triggers"][number];

const routinesPageQueryNode = graphql`
  query routinesPageQuery {
    Agents {
      id
      name
    }
    Routines {
      id
      name
      instructions
      assignedAgentId
      assignedAgentName
      sessionId
      enabled
      overlapPolicy
      triggers {
        id
        routineId
        type
        enabled
        cronPattern
        createdAt
        updatedAt
      }
      lastRun {
        id
        routineId
        triggerId
        source
        status
        sessionId
        bullmqJobId
        errorMessage
        startedAt
        finishedAt
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

const routinesPageCreateRoutineMutationNode = graphql`
  mutation routinesPageCreateRoutineMutation($input: CreateRoutineInput!) {
    CreateRoutine(input: $input) {
      id
      name
      instructions
      assignedAgentId
      assignedAgentName
      sessionId
      enabled
      overlapPolicy
      triggers {
        id
        routineId
        type
        enabled
        cronPattern
        createdAt
        updatedAt
      }
      lastRun {
        id
        routineId
        triggerId
        source
        status
        sessionId
        bullmqJobId
        errorMessage
        startedAt
        finishedAt
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

const routinesPageUpdateRoutineMutationNode = graphql`
  mutation routinesPageUpdateRoutineMutation($input: UpdateRoutineInput!) {
    UpdateRoutine(input: $input) {
      id
      name
      instructions
      assignedAgentId
      assignedAgentName
      sessionId
      enabled
      overlapPolicy
      triggers {
        id
        routineId
        type
        enabled
        cronPattern
        createdAt
        updatedAt
      }
      lastRun {
        id
        routineId
        triggerId
        source
        status
        sessionId
        bullmqJobId
        errorMessage
        startedAt
        finishedAt
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
    }
  }
`;

const routinesPageDeleteRoutineMutationNode = graphql`
  mutation routinesPageDeleteRoutineMutation($input: DeleteRoutineInput!) {
    DeleteRoutine(input: $input) {
      id
    }
  }
`;

const routinesPageCreateRoutineCronTriggerMutationNode = graphql`
  mutation routinesPageCreateRoutineCronTriggerMutation($input: CreateRoutineCronTriggerInput!) {
    CreateRoutineCronTrigger(input: $input) {
      id
      routineId
      type
      enabled
      cronPattern
      createdAt
      updatedAt
    }
  }
`;

const routinesPageUpdateRoutineCronTriggerMutationNode = graphql`
  mutation routinesPageUpdateRoutineCronTriggerMutation($input: UpdateRoutineCronTriggerInput!) {
    UpdateRoutineCronTrigger(input: $input) {
      id
      routineId
      type
      enabled
      cronPattern
      createdAt
      updatedAt
    }
  }
`;

const routinesPageDeleteRoutineTriggerMutationNode = graphql`
  mutation routinesPageDeleteRoutineTriggerMutation($input: DeleteRoutineTriggerInput!) {
    DeleteRoutineTrigger(input: $input) {
      id
      routineId
    }
  }
`;

const routinesPageTriggerRoutineMutationNode = graphql`
  mutation routinesPageTriggerRoutineMutation($input: TriggerRoutineInput!) {
    TriggerRoutine(input: $input) {
      id
      routineId
      triggerId
      source
      status
      sessionId
      bullmqJobId
      errorMessage
      startedAt
      finishedAt
      createdAt
      updatedAt
    }
  }
`;

function filterStoreRecords(records: ReadonlyArray<unknown>): RecordProxy[] {
  return records.filter((record): record is RecordProxy => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function findRoutineRecord(store: RecordSourceSelectorProxy, routineId: string): RecordProxy | null {
  const routines = store.getRoot().getLinkedRecords("Routines") ?? [];
  return filterStoreRecords(routines).find((record) => record.getValue("id") === routineId) ?? null;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatRunStatus(status: string | null): string {
  if (!status) {
    return "No runs";
  }

  return status.replaceAll("_", " ");
}

function getRunBadgeVariant(status: string | null): "default" | "destructive" | "outline" | "positive" | "warning" {
  if (status === "prompt_queued") {
    return "positive";
  }
  if (status === "failed") {
    return "destructive";
  }
  if (status === "running" || status === "queued") {
    return "warning";
  }

  return "outline";
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getBrowserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function RoutinesPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardHeader>
          <CardDescription>Loading routines.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="h-16 rounded-lg border border-border/60 bg-muted/30" />
            <div className="h-16 rounded-lg border border-border/60 bg-muted/20" />
            <div className="h-16 rounded-lg border border-border/60 bg-muted/10" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function RoutinesPageContent() {
  const [dialogErrorMessage, setDialogErrorMessage] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<RoutineDialogRecord | null>(null);
  const [editingTrigger, setEditingTrigger] = useState<RoutineTriggerDialogRecord | null>(null);
  const [isRoutineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [isTriggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);
  const [routineIdForTriggerDialog, setRoutineIdForTriggerDialog] = useState<string | null>(null);
  const [runningRoutineId, setRunningRoutineId] = useState<string | null>(null);
  const [triggerDialogErrorMessage, setTriggerDialogErrorMessage] = useState<string | null>(null);
  const data = useLazyLoadQuery<routinesPageQuery>(
    routinesPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateRoutine, isCreateRoutineInFlight] = useMutation<routinesPageCreateRoutineMutation>(
    routinesPageCreateRoutineMutationNode,
  );
  const [commitUpdateRoutine, isUpdateRoutineInFlight] = useMutation<routinesPageUpdateRoutineMutation>(
    routinesPageUpdateRoutineMutationNode,
  );
  const [commitDeleteRoutine, isDeleteRoutineInFlight] = useMutation<routinesPageDeleteRoutineMutation>(
    routinesPageDeleteRoutineMutationNode,
  );
  const [commitCreateRoutineCronTrigger, isCreateRoutineCronTriggerInFlight] =
    useMutation<routinesPageCreateRoutineCronTriggerMutation>(
      routinesPageCreateRoutineCronTriggerMutationNode,
    );
  const [commitUpdateRoutineCronTrigger, isUpdateRoutineCronTriggerInFlight] =
    useMutation<routinesPageUpdateRoutineCronTriggerMutation>(
      routinesPageUpdateRoutineCronTriggerMutationNode,
    );
  const [commitDeleteRoutineTrigger, isDeleteRoutineTriggerInFlight] =
    useMutation<routinesPageDeleteRoutineTriggerMutation>(
      routinesPageDeleteRoutineTriggerMutationNode,
    );
  const [commitTriggerRoutine, isTriggerRoutineInFlight] = useMutation<routinesPageTriggerRoutineMutation>(
    routinesPageTriggerRoutineMutationNode,
  );
  const agents = data.Agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
  }));
  const isRoutineSaving = isCreateRoutineInFlight || isUpdateRoutineInFlight;
  const isTriggerSaving = isCreateRoutineCronTriggerInFlight || isUpdateRoutineCronTriggerInFlight;

  async function saveRoutine(input: {
    assignedAgentId: string;
    enabled: boolean;
    id?: string;
    instructions: string;
    name: string;
  }): Promise<void> {
    setDialogErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      const variables = {
        input: {
          assignedAgentId: input.assignedAgentId,
          enabled: input.enabled,
          instructions: input.instructions,
          name: input.name,
        },
      };
      if (input.id) {
        commitUpdateRoutine({
          variables: {
            input: {
              ...variables.input,
              id: input.id,
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
        return;
      }

      commitCreateRoutine({
        variables,
        updater: (store) => {
          const createdRoutine = store.getRootField("CreateRoutine");
          if (!createdRoutine) {
            return;
          }

          const rootRecord = store.getRoot();
          const currentRoutines = filterStoreRecords(rootRecord.getLinkedRecords("Routines") || []);
          rootRecord.setLinkedRecords([createdRoutine, ...currentRoutines], "Routines");
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
      setRoutineDialogOpen(false);
      setEditingRoutine(null);
    }).catch((error: unknown) => {
      setDialogErrorMessage(getErrorMessage(error, "Failed to save routine."));
    });
  }

  async function saveTrigger(input: {
    cronPattern: string;
    enabled: boolean;
    id?: string;
    routineId?: string;
  }): Promise<void> {
    setTriggerDialogErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      if (input.id) {
        commitUpdateRoutineCronTrigger({
          variables: {
            input: {
              cronPattern: input.cronPattern,
              enabled: input.enabled,
              id: input.id,
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
        return;
      }
      if (!input.routineId) {
        reject(new Error("Routine id is required."));
        return;
      }

      commitCreateRoutineCronTrigger({
        variables: {
          input: {
            cronPattern: input.cronPattern,
            enabled: input.enabled,
            routineId: input.routineId,
            timezone: getBrowserTimezone(),
          },
        },
        updater: (store) => {
          const createdTrigger = store.getRootField("CreateRoutineCronTrigger");
          if (!createdTrigger) {
            return;
          }

          const routineId = createdTrigger.getValue("routineId");
          if (typeof routineId !== "string") {
            return;
          }

          const routineRecord = findRoutineRecord(store, routineId);
          if (!routineRecord) {
            return;
          }

          const currentTriggers = filterStoreRecords(routineRecord.getLinkedRecords("triggers") || []);
          routineRecord.setLinkedRecords([...currentTriggers, createdTrigger], "triggers");
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
      setTriggerDialogOpen(false);
      setEditingTrigger(null);
      setRoutineIdForTriggerDialog(null);
    }).catch((error: unknown) => {
      setTriggerDialogErrorMessage(getErrorMessage(error, "Failed to save trigger."));
    });
  }

  async function deleteRoutine(routineId: string): Promise<void> {
    if (isDeleteRoutineInFlight) {
      return;
    }

    setPageErrorMessage(null);
    await new Promise<void>((resolve, reject) => {
      commitDeleteRoutine({
        variables: {
          input: {
            id: routineId,
          },
        },
        updater: (store) => {
          const deletedRoutine = store.getRootField("DeleteRoutine");
          if (!deletedRoutine) {
            return;
          }

          const deletedRoutineId = deletedRoutine.getDataID();
          const rootRecord = store.getRoot();
          const currentRoutines = filterStoreRecords(rootRecord.getLinkedRecords("Routines") || []);
          rootRecord.setLinkedRecords(
            currentRoutines.filter((record) => record.getDataID() !== deletedRoutineId),
            "Routines",
          );
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
    }).catch((error: unknown) => {
      setPageErrorMessage(getErrorMessage(error, "Failed to delete routine."));
    });
  }

  async function deleteTrigger(triggerId: string): Promise<void> {
    if (isDeleteRoutineTriggerInFlight) {
      return;
    }

    setPageErrorMessage(null);
    await new Promise<void>((resolve, reject) => {
      commitDeleteRoutineTrigger({
        variables: {
          input: {
            id: triggerId,
          },
        },
        updater: (store) => {
          const deletedTrigger = store.getRootField("DeleteRoutineTrigger");
          if (!deletedTrigger) {
            return;
          }

          const routineId = deletedTrigger.getValue("routineId");
          if (typeof routineId !== "string") {
            return;
          }

          const routineRecord = findRoutineRecord(store, routineId);
          if (!routineRecord) {
            return;
          }

          const deletedTriggerId = deletedTrigger.getDataID();
          const currentTriggers = filterStoreRecords(routineRecord.getLinkedRecords("triggers") || []);
          routineRecord.setLinkedRecords(
            currentTriggers.filter((record) => record.getDataID() !== deletedTriggerId),
            "triggers",
          );
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
    }).catch((error: unknown) => {
      setPageErrorMessage(getErrorMessage(error, "Failed to delete trigger."));
    });
  }

  async function triggerRoutine(routineId: string): Promise<void> {
    if (isTriggerRoutineInFlight) {
      return;
    }

    setPageErrorMessage(null);
    setRunningRoutineId(routineId);
    await new Promise<void>((resolve, reject) => {
      commitTriggerRoutine({
        variables: {
          input: {
            id: routineId,
          },
        },
        updater: (store) => {
          const createdRun = store.getRootField("TriggerRoutine");
          if (!createdRun) {
            return;
          }

          const runRoutineId = createdRun.getValue("routineId");
          if (typeof runRoutineId !== "string") {
            return;
          }

          const routineRecord = findRoutineRecord(store, runRoutineId);
          routineRecord?.setLinkedRecord(createdRun, "lastRun");
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
    }).catch((error: unknown) => {
      setPageErrorMessage(getErrorMessage(error, "Failed to trigger routine."));
    });
    setRunningRoutineId(null);
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardHeader className="flex flex-col gap-4 px-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <CardDescription>
              Schedule reusable agent instructions, keep them pinned to a session, and run them manually for testing.
            </CardDescription>
          </div>
          <Button
            data-primary-cta=""
            disabled={agents.length === 0}
            onClick={() => {
              setDialogErrorMessage(null);
              setEditingRoutine(null);
              setRoutineDialogOpen(true);
            }}
          >
            <PlusIcon />
            Create routine
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {pageErrorMessage ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {pageErrorMessage}
            </div>
          ) : null}

          {data.Routines.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
              <CalendarClockIcon className="size-8 text-muted-foreground" />
              <div className="grid gap-1">
                <p className="text-sm font-medium text-foreground">No routines yet</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Create a routine to save a prompt, assign it to an agent, and attach one or more cron triggers.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Routine</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Triggers</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead className="w-52 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.Routines.map((routine: RoutineRecord) => (
                  <TableRow key={routine.id}>
                    <TableCell>
                      <div className="grid gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{routine.name}</span>
                          <Badge variant={routine.enabled ? "positive" : "outline"}>
                            {routine.enabled ? "enabled" : "disabled"}
                          </Badge>
                          {routine.sessionId ? (
                            <Badge variant="secondary">sticky session</Badge>
                          ) : null}
                        </div>
                        <p className="line-clamp-2 max-w-xl text-xs leading-5 text-muted-foreground">
                          {routine.instructions}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{routine.assignedAgentName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        {routine.triggers.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No cron triggers</span>
                        ) : (
                          routine.triggers.map((trigger: RoutineTriggerRecord) => (
                            <div
                              className="flex max-w-sm flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5"
                              key={trigger.id}
                            >
                              <Badge variant={trigger.enabled ? "secondary" : "outline"}>
                                {trigger.enabled ? "cron" : "off"}
                              </Badge>
                              <code className="text-xs text-foreground">{trigger.cronPattern}</code>
                              <Button
                                aria-label="Edit trigger"
                                onClick={() => {
                                  setTriggerDialogErrorMessage(null);
                                  setRoutineIdForTriggerDialog(routine.id);
                                  setEditingTrigger({
                                    cronPattern: trigger.cronPattern,
                                    enabled: trigger.enabled,
                                    id: trigger.id,
                                  });
                                  setTriggerDialogOpen(true);
                                }}
                                size="icon-sm"
                                variant="ghost"
                              >
                                <PencilIcon />
                              </Button>
                              <Button
                                aria-label="Delete trigger"
                                onClick={() => {
                                  void deleteTrigger(trigger.id);
                                }}
                                size="icon-sm"
                                variant="ghost"
                              >
                                <Trash2Icon />
                              </Button>
                            </div>
                          ))
                        )}
                        <Button
                          className="w-fit"
                          onClick={() => {
                            setTriggerDialogErrorMessage(null);
                            setRoutineIdForTriggerDialog(routine.id);
                            setEditingTrigger(null);
                            setTriggerDialogOpen(true);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <PlusIcon />
                          Add cron
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        <Badge variant={getRunBadgeVariant(routine.lastRun?.status ?? null)}>
                          {formatRunStatus(routine.lastRun?.status ?? null)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(routine.lastRun?.createdAt ?? null)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          disabled={runningRoutineId === routine.id}
                          onClick={() => {
                            void triggerRoutine(routine.id);
                          }}
                          size="sm"
                          variant="outline"
                        >
                          <PlayIcon />
                          Run
                        </Button>
                        <Button
                          aria-label="Edit routine"
                          onClick={() => {
                            setDialogErrorMessage(null);
                            setEditingRoutine(routine);
                            setRoutineDialogOpen(true);
                          }}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <PencilIcon />
                        </Button>
                        <Button
                          aria-label="Delete routine"
                          onClick={() => {
                            void deleteRoutine(routine.id);
                          }}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RoutineDialog
        agents={agents}
        errorMessage={dialogErrorMessage}
        isOpen={isRoutineDialogOpen}
        isSaving={isRoutineSaving}
        onOpenChange={(open) => {
          setRoutineDialogOpen(open);
          if (!open) {
            setEditingRoutine(null);
            setDialogErrorMessage(null);
          }
        }}
        onSave={saveRoutine}
        routine={editingRoutine}
      />
      <RoutineTriggerDialog
        errorMessage={triggerDialogErrorMessage}
        isOpen={isTriggerDialogOpen}
        isSaving={isTriggerSaving}
        onOpenChange={(open) => {
          setTriggerDialogOpen(open);
          if (!open) {
            setEditingTrigger(null);
            setRoutineIdForTriggerDialog(null);
            setTriggerDialogErrorMessage(null);
          }
        }}
        onSave={saveTrigger}
        routineId={routineIdForTriggerDialog}
        trigger={editingTrigger}
      />
    </main>
  );
}

export function RoutinesPage() {
  return (
    <Suspense fallback={<RoutinesPageFallback />}>
      <RoutinesPageContent />
    </Suspense>
  );
}
