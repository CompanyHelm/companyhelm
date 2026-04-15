import { Suspense, useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ExternalLinkIcon, FileTextIcon, GitPullRequestIcon, PlayIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { MarkdownContent } from "@/components/markdown_content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import type { TaskViewType } from "./task_ui";
import type { taskDetailPageExecuteTaskMutation } from "./__generated__/taskDetailPageExecuteTaskMutation.graphql";
import type { taskDetailPageQuery } from "./__generated__/taskDetailPageQuery.graphql";
import type { taskDetailPageUpdateTaskMutation } from "./__generated__/taskDetailPageUpdateTaskMutation.graphql";

type TaskStatus = "draft" | "in_progress" | "completed";
type TaskRunStatus = "queued" | "running" | "completed" | "failed" | "canceled";
type TaskArtifactType = "markdown_document" | "external_link" | "pull_request";
type TaskDetailPageSearch = {
  tab?: "artifacts" | "runs";
  viewType?: TaskViewType;
};
type TaskDetailPageTaskAssignee = NonNullable<taskDetailPageQuery["response"]["Task"]["assignee"]>;
type TaskDetailPageTaskStage = taskDetailPageQuery["response"]["TaskStages"][number];
type TaskDetailPageAssignableUser = taskDetailPageQuery["response"]["TaskAssignableUsers"][number];
type TaskDetailPageAgent = taskDetailPageQuery["response"]["Agents"][number];
type TaskDetailPageRun = taskDetailPageQuery["response"]["TaskRuns"][number];
type TaskDetailPageArtifact = taskDetailPageQuery["response"]["Artifacts"][number];

const taskDetailPageQueryNode = graphql`
  query taskDetailPageQuery($taskId: ID!) {
    Task(id: $taskId) {
      id
      name
      description
      status
      taskStageId
      taskStageName
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
    Artifacts(input: { scopeType: "task", taskId: $taskId }) {
      id
      type
      state
      name
      description
      markdownContent
      url
      pullRequestProvider
      pullRequestRepository
      pullRequestNumber
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
    TaskStages {
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
      taskStageId
      taskStageName
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

const noStageValue = "__no_stage__";
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
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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

function formatArtifactType(type: TaskArtifactType): string {
  switch (type) {
    case "markdown_document":
      return "Document";
    case "external_link":
      return "Link";
    case "pull_request":
      return "Pull Request";
  }
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

function summarizeArtifactText(value: string): string {
  return value
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getArtifactPreview(artifact: TaskDetailPageArtifact): string {
  const description = String(artifact.description || "").trim();
  if (description.length > 0) {
    return description;
  }

  if (artifact.type === "markdown_document") {
    return summarizeArtifactText(String(artifact.markdownContent || ""));
  }

  if (artifact.type === "pull_request") {
    return [
      artifact.pullRequestRepository,
      artifact.pullRequestNumber ? `#${artifact.pullRequestNumber}` : null,
      artifact.url,
    ].filter(Boolean).join(" • ");
  }

  return String(artifact.url || "").trim();
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

function resolveArtifactTypeIcon(type: TaskArtifactType) {
  switch (type) {
    case "markdown_document":
      return FileTextIcon;
    case "external_link":
      return ExternalLinkIcon;
    case "pull_request":
      return GitPullRequestIcon;
  }
}

function TaskDetailPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as TaskDetailPageSearch;
  const { taskId } = useParams({ strict: false }) as { taskId?: string };
  const organizationSlug = useCurrentOrganizationSlug();
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
  const selectedTab = search.tab === "runs"
    ? "runs"
    : search.tab === "artifacts"
      ? "artifacts"
      : "details";
  const currentViewType = search.viewType === "list" ? "list" : search.viewType === "board" ? "board" : undefined;
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

  const stageOptions = useMemo(() => {
    return [{
      label: "No stage",
      value: noStageValue,
    }, ...data.TaskStages.map((stage: TaskDetailPageTaskStage) => ({
      label: stage.name,
      value: stage.id,
    }))];
  }, [data.TaskStages]);
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
    taskStageId?: string | null;
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
            taskStageId: patch.taskStageId === undefined ? task.taskStageId : patch.taskStageId,
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
          <div className="modern-scrollbar flex items-center gap-6 overflow-x-auto">
            {[
              {
                key: "details" as const,
                label: "Details",
              },
              {
                key: "artifacts" as const,
                label: "Artifacts",
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
                        organizationSlug,
                        taskId: task.id,
                      },
                      search: {
                        ...(tab.key === "details" ? {} : { tab: tab.key }),
                        ...(currentViewType ? { viewType: currentViewType } : {}),
                      },
                      to: OrganizationPath.route("/tasks/$taskId"),
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
          <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Task Details</CardTitle>
                <CardDescription>
                  Update the task name, description, status, stage, and assignee inline.
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
                value={task.description ?? null}
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
                displayValue={task.taskStageName ?? "No stage"}
                emptyValueLabel="No stage"
                fieldType="select"
                label="Stage"
                onSave={async (value) => {
                  await saveTask({
                    taskStageId: value === noStageValue ? null : value,
                  });
                }}
                options={stageOptions}
                value={task.taskStageId ?? noStageValue}
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

          <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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
                            params: {
                              organizationSlug,
                            },
                            search: {
                              agentId: taskRun.agentId,
                              sessionId: taskRun.sessionId ?? undefined,
                            },
                            to: OrganizationPath.route("/chats"),
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

      {selectedTab === "artifacts" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Task Artifacts</CardTitle>
              <CardDescription>
                Review the documents, links, and pull requests attached to this task.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.Artifacts.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No artifacts yet</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  Task-scoped documents and delivery links will appear here as agents attach them.
                </p>
              </div>
            ) : null}

            {data.Artifacts.map((artifact: TaskDetailPageArtifact) => {
              const ArtifactIcon = resolveArtifactTypeIcon(artifact.type as TaskArtifactType);

              return (
                <button
                  key={artifact.id}
                  className="group rounded-2xl border border-border/60 bg-card/70 text-left shadow-sm transition hover:border-border/80 hover:bg-card hover:shadow-md"
                  onClick={() => {
                    void navigate({
                      params: {
                        artifactId: artifact.id,
                        organizationSlug,
                        taskId: task.id,
                      },
                      search: currentViewType ? { viewType: currentViewType } : {},
                      to: OrganizationPath.route("/tasks/$taskId/artifacts/$artifactId"),
                    });
                  }}
                  type="button"
                >
                  <div className="border-b border-border/40 px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
                        <ArtifactIcon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{artifact.name}</p>
                          <Badge variant="outline">{formatArtifactType(artifact.type as TaskArtifactType)}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Updated {formatTaskTimestamp(artifact.updatedAt, "Unknown")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 px-5 py-4">
                    <MarkdownContent
                      content={getArtifactPreview(artifact)}
                      emptyClassName="text-sm text-muted-foreground"
                      emptyLabel="Open this artifact for details."
                    />
                    {artifact.url ? (
                      <p className="truncate text-xs text-muted-foreground">{artifact.url}</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
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
