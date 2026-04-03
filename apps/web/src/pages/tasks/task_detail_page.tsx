import { Suspense, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { PlayIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { taskDetailPageExecuteTaskMutation } from "./__generated__/taskDetailPageExecuteTaskMutation.graphql";
import type { taskDetailPageQuery } from "./__generated__/taskDetailPageQuery.graphql";
import type { taskDetailPageUpdateTaskMutation } from "./__generated__/taskDetailPageUpdateTaskMutation.graphql";

type TaskStatus = "draft" | "in_progress" | "completed";
type TaskRunStatus = "queued" | "running" | "completed" | "failed" | "canceled";
type TaskDetailPageSearch = {
  tab?: "runs";
};
type TaskDetailPageTaskAssignee = NonNullable<taskDetailPageQuery["response"]["Task"]["assignee"]>;
type TaskDetailPageTaskCategory = taskDetailPageQuery["response"]["TaskCategories"][number];
type TaskDetailPageAssignableUser = taskDetailPageQuery["response"]["TaskAssignableUsers"][number];
type TaskDetailPageAgent = taskDetailPageQuery["response"]["Agents"][number];
type TaskDetailPageRun = taskDetailPageQuery["response"]["TaskRuns"][number];

const taskDetailPageQueryNode = graphql`
  query taskDetailPageQuery($taskId: ID!) {
    Task(id: $taskId) {
      id
      name
      description
      status
      taskCategoryId
      taskCategoryName
      assignedAt
      assignee {
        kind
        id
        name
        email
      }
      createdAt
      updatedAt
    }
    TaskRuns(taskId: $taskId) {
      id
      taskId
      agentId
      agentName
      sessionId
      status
      startedAt
      finishedAt
      lastActivityAt
      endedReason
      createdAt
      updatedAt
    }
    Agents {
      id
      name
    }
    TaskAssignableUsers {
      id
      displayName
      email
    }
    TaskCategories {
      id
      name
    }
  }
`;

const taskDetailPageUpdateTaskMutationNode = graphql`
  mutation taskDetailPageUpdateTaskMutation($input: UpdateTaskInput!) {
    UpdateTask(input: $input) {
      id
      name
      description
      status
      taskCategoryId
      taskCategoryName
      assignedAt
      assignee {
        kind
        id
        name
        email
      }
      createdAt
      updatedAt
    }
  }
`;

const taskDetailPageExecuteTaskMutationNode = graphql`
  mutation taskDetailPageExecuteTaskMutation($input: ExecuteTaskInput!) {
    ExecuteTask(input: $input) {
      id
      taskId
      agentId
      agentName
      sessionId
      status
      startedAt
      finishedAt
      lastActivityAt
      endedReason
      createdAt
      updatedAt
    }
  }
`;

const uncategorizedValue = "__uncategorized__";
const unassignedValue = "__unassigned__";

function filterStoreRecords(records: ReadonlyArray<unknown>): Array<{ getDataID(): string }> {
  return records.filter((record): record is { getDataID(): string } => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function TaskDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Loading task details…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading task…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function formatTaskStatus(status: TaskStatus): string {
  return status === "in_progress"
    ? "In Progress"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function formatTaskRunStatus(status: TaskRunStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatTaskTimestamp(value: string | null | undefined, emptyLabel: string): string {
  if (!value) {
    return emptyLabel;
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

function buildAssigneeOptionValue(kind: "agent" | "user", id: string): string {
  return `${kind}:${id}`;
}

function formatAssigneeLabel(assignee: {
  kind: string;
  name: string;
}): string {
  return `${assignee.kind === "agent" ? "Agent" : "User"} • ${assignee.name}`;
}

function resolveTaskRunStatusVariant(status: TaskRunStatus): "destructive" | "outline" | "positive" | "secondary" {
  if (status === "completed") {
    return "positive";
  }
  if (status === "running") {
    return "secondary";
  }
  if (status === "failed" || status === "canceled") {
    return "destructive";
  }

  return "outline";
}

function TaskDetailPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as TaskDetailPageSearch;
  const { taskId } = useParams({ strict: false });
  const normalizedTaskId = String(taskId || "").trim();
  const { setDetailLabel } = useApplicationBreadcrumb();
  if (!normalizedTaskId) {
    throw new Error("Task ID is required.");
  }

  const data = useLazyLoadQuery<taskDetailPageQuery>(
    taskDetailPageQueryNode,
    {
      taskId: normalizedTaskId,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitUpdateTask] = useMutation<taskDetailPageUpdateTaskMutation>(
    taskDetailPageUpdateTaskMutationNode,
  );
  const [commitExecuteTask, isExecuteTaskInFlight] = useMutation<taskDetailPageExecuteTaskMutation>(
    taskDetailPageExecuteTaskMutationNode,
  );
  const task = data.Task;
  const selectedTab = search.tab === "runs" ? "runs" : "details";
  const currentTaskStatus = task.status as TaskStatus;
  const currentAssignedAgentId = task.assignee?.kind === "agent" ? task.assignee.id : null;
  const currentAssignedUserId = task.assignee?.kind === "user" ? task.assignee.id : null;
  const currentAssigneeValue = task.assignee
    ? buildAssigneeOptionValue(task.assignee.kind as "agent" | "user", task.assignee.id)
    : unassignedValue;

  useEffect(() => {
    setDetailLabel(task.name);

    return () => {
      setDetailLabel(null);
    };
  }, [setDetailLabel, task.name]);

  const categoryOptions = useMemo(() => {
    return [{
      label: "Uncategorized",
      value: uncategorizedValue,
    }, ...data.TaskCategories.map((category: TaskDetailPageTaskCategory) => ({
      label: category.name,
      value: category.id,
    }))];
  }, [data.TaskCategories]);
  const assigneeOptions = useMemo(() => {
    const nextOptions = [{
      label: "Unassigned",
      value: unassignedValue,
    }, ...data.TaskAssignableUsers.map((user: TaskDetailPageAssignableUser) => ({
      label: `User • ${user.displayName}`,
      value: buildAssigneeOptionValue("user", user.id),
    })), ...data.Agents.map((agent: TaskDetailPageAgent) => ({
      label: `Agent • ${agent.name}`,
      value: buildAssigneeOptionValue("agent", agent.id),
    }))];

    if (task.assignee && !nextOptions.some((option) => option.value === currentAssigneeValue)) {
      nextOptions.push({
        label: formatAssigneeLabel(task.assignee as TaskDetailPageTaskAssignee),
        value: currentAssigneeValue,
      });
    }

    return nextOptions;
  }, [currentAssigneeValue, data.Agents, data.TaskAssignableUsers, task.assignee]);

  const saveTask = async (patch: {
    assignedAgentId?: string | null;
    assignedUserId?: string | null;
    description?: string | null;
    name?: string | null;
    status?: TaskStatus;
    taskCategoryId?: string | null;
  }) => {
    await new Promise<void>((resolve, reject) => {
      commitUpdateTask({
        variables: {
          input: {
            taskId: task.id,
            assignedAgentId: patch.assignedAgentId === undefined ? currentAssignedAgentId : patch.assignedAgentId,
            assignedUserId: patch.assignedUserId === undefined ? currentAssignedUserId : patch.assignedUserId,
            description: patch.description === undefined ? task.description : patch.description,
            name: patch.name === undefined ? task.name : patch.name,
            status: patch.status ?? currentTaskStatus,
            taskCategoryId: patch.taskCategoryId === undefined ? task.taskCategoryId : patch.taskCategoryId,
          },
        },
        onCompleted: (
          _response: taskDetailPageUpdateTaskMutation["response"],
          errors: ReadonlyArray<{ message: string }> | null | undefined,
        ) => {
          const errorMessage = String(errors?.[0]?.message || "").trim();
          if (errorMessage) {
            reject(new Error(errorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    });
  };

  const executeTask = async () => {
    await new Promise<void>((resolve, reject) => {
      commitExecuteTask({
        variables: {
          input: {
            taskId: task.id,
          },
        },
        updater: (store: {
          get(taskRecordId: string): { setValue(value: unknown, fieldName: string): void } | null | undefined;
          getRoot(): {
            getLinkedRecords(
              name: string,
              variables?: Record<string, unknown>,
            ): ReadonlyArray<unknown> | null | undefined;
            setLinkedRecords(
              records: Array<{ getDataID(): string }>,
              name: string,
              variables?: Record<string, unknown>,
            ): void;
          };
          getRootField(name: string): { getDataID(): string } | null | undefined;
        }) => {
          store.get(task.id)?.setValue("in_progress", "status");
          const createdTaskRun = store.getRootField("ExecuteTask");
          if (!createdTaskRun) {
            return;
          }

          const rootRecord = store.getRoot();
          const currentTaskRuns = filterStoreRecords(rootRecord.getLinkedRecords("TaskRuns", {
            taskId: task.id,
          }) || []);
          if (currentTaskRuns.some((taskRunRecord) => taskRunRecord.getDataID() === createdTaskRun.getDataID())) {
            return;
          }

          rootRecord.setLinkedRecords([createdTaskRun, ...currentTaskRuns], "TaskRuns", {
            taskId: task.id,
          });
        },
        onCompleted: async (
          _response: taskDetailPageExecuteTaskMutation["response"],
          errors: ReadonlyArray<{ message: string }> | null | undefined,
        ) => {
          const errorMessage = String(errors?.[0]?.message || "").trim();
          if (errorMessage) {
            reject(new Error(errorMessage));
            return;
          }

          resolve();
        },
        onError: reject,
      });
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{task.name}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage task details or inspect execution history for this task.
          </p>
        </div>

        <div className="border-b border-border/60">
          <div className="flex items-center gap-6 overflow-x-auto">
            {[
              {
                key: "details" as const,
                label: "Details",
              },
              {
                key: "runs" as const,
                label: "Runs",
              },
            ].map((tab) => {
              const isSelected = selectedTab === tab.key;

              return (
                <button
                  key={tab.key}
                  className={`-mb-px shrink-0 border-b-2 px-0 py-3 text-sm font-medium transition ${
                    isSelected
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border/80 hover:text-foreground"
                  }`}
                  onClick={() => {
                    void navigate({
                      params: {
                        taskId: task.id,
                      },
                      search: tab.key === "runs" ? { tab: "runs" } : {},
                      to: "/tasks/$taskId",
                    });
                  }}
                  type="button"
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedTab === "details" ? (
        <>
          <Card className="rounded-2xl border border-border/60 shadow-sm">
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Task Details</CardTitle>
                <CardDescription>
                  Update the task name, description, status, category, and assignee inline.
                </CardDescription>
              </div>
              <CardAction>
                <Button
                  disabled={isExecuteTaskInFlight || currentAssignedAgentId === null}
                  onClick={() => {
                    void executeTask();
                  }}
                  size="sm"
                  type="button"
                >
                  <PlayIcon />
                  {isExecuteTaskInFlight ? "Starting..." : "Execute Task"}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-4">
              <EditableField
                emptyValueLabel="Untitled task"
                fieldType="text"
                label="Name"
                onSave={async (value) => {
                  await saveTask({
                    name: value,
                  });
                }}
                value={task.name}
              />

              <EditableField
                displayValue={task.description ?? null}
                emptyValueLabel="No description"
                fieldType="textarea"
                label="Description"
                onSave={async (value) => {
                  await saveTask({
                    description: value === "" ? null : value,
                  });
                }}
                value={task.description}
              />

              <EditableField
                displayValue={formatTaskStatus(currentTaskStatus)}
                emptyValueLabel="No status"
                fieldType="select"
                label="Status"
                onSave={async (value) => {
                  await saveTask({
                    status: value as TaskStatus,
                  });
                }}
                options={(["draft", "in_progress", "completed"] as TaskStatus[]).map((status) => ({
                  label: formatTaskStatus(status),
                  value: status,
                }))}
                value={currentTaskStatus}
              />

              <EditableField
                displayValue={task.taskCategoryName ?? "Uncategorized"}
                emptyValueLabel="Uncategorized"
                fieldType="select"
                label="Category"
                onSave={async (value) => {
                  await saveTask({
                    taskCategoryId: value === uncategorizedValue ? null : value,
                  });
                }}
                options={categoryOptions}
                value={task.taskCategoryId ?? uncategorizedValue}
              />

              <EditableField
                displayValue={task.assignee ? formatAssigneeLabel(task.assignee as TaskDetailPageTaskAssignee) : "Unassigned"}
                emptyValueLabel="Unassigned"
                fieldType="select"
                label="Assignee"
                onSave={async (value) => {
                  if (value === unassignedValue) {
                    await saveTask({
                      assignedAgentId: null,
                      assignedUserId: null,
                    });
                    return;
                  }

                  const [kind, id] = value.split(":");
                  if (kind === "agent") {
                    await saveTask({
                      assignedAgentId: id ?? null,
                      assignedUserId: null,
                    });
                    return;
                  }

                  await saveTask({
                    assignedAgentId: null,
                    assignedUserId: id ?? null,
                  });
                }}
                options={assigneeOptions}
                value={currentAssigneeValue}
              />

              {currentAssignedAgentId === null ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  Assign this task to an agent to enable execution.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/60 shadow-sm">
            <CardHeader>
              <CardDescription>Metadata for this task record.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Created</p>
                <p className="mt-3 text-sm text-foreground">{formatTaskTimestamp(task.createdAt, "Unknown")}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
                <p className="mt-3 text-sm text-foreground">{formatTaskTimestamp(task.updatedAt, "Unknown")}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card/50 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Assigned</p>
                <p className="mt-3 text-sm text-foreground">{formatTaskTimestamp(task.assignedAt, "Unassigned")}</p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {selectedTab === "runs" ? (
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Task Runs</CardTitle>
              <CardDescription>
                Review the execution attempts linked to this task and reopen the backing session for
                any run.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.TaskRuns.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No runs yet</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  Execute the task to create the first run and linked agent session.
                </p>
              </div>
            ) : null}

            {data.TaskRuns.map((taskRun: TaskDetailPageRun) => (
              <div
                key={taskRun.id}
                className="rounded-xl border border-border/70 bg-background/90 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{taskRun.agentName}</p>
                      <Badge variant={resolveTaskRunStatusVariant(taskRun.status as TaskRunStatus)}>
                        {formatTaskRunStatus(taskRun.status as TaskRunStatus)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Run ID {taskRun.id}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {taskRun.sessionId ? (
                      <Button
                        onClick={() => {
                          void navigate({
                            search: {
                              agentId: taskRun.agentId,
                              sessionId: taskRun.sessionId ?? undefined,
                            },
                            to: "/chats",
                          });
                        }}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Open Session
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                    <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">Created</p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatTaskTimestamp(taskRun.createdAt, "Unknown")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                    <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">Started</p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatTaskTimestamp(taskRun.startedAt, "Not started")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                    <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">Finished</p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatTaskTimestamp(taskRun.finishedAt, "Still active")}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card/50 p-3">
                    <p className="text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">Last Activity</p>
                    <p className="mt-2 text-sm text-foreground">
                      {formatTaskTimestamp(taskRun.lastActivityAt, "Unknown")}
                    </p>
                  </div>
                </div>

                {taskRun.endedReason ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Ended because: {taskRun.endedReason}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

export function TaskDetailPage() {
  return (
    <Suspense fallback={<TaskDetailPageFallback />}>
      <TaskDetailPageContent />
    </Suspense>
  );
}
