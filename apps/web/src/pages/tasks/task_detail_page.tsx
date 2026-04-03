import { Suspense, useEffect, useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import type { taskDetailPageQuery } from "./__generated__/taskDetailPageQuery.graphql";
import type { taskDetailPageUpdateTaskMutation } from "./__generated__/taskDetailPageUpdateTaskMutation.graphql";

type TaskStatus = "draft" | "pending" | "in_progress" | "completed";
type TaskDetailPageTaskAssignee = NonNullable<taskDetailPageQuery["response"]["Task"]["assignee"]>;
type TaskDetailPageTaskCategory = taskDetailPageQuery["response"]["TaskCategories"][number];
type TaskDetailPageAssignableUser = taskDetailPageQuery["response"]["TaskAssignableUsers"][number];
type TaskDetailPageAgent = taskDetailPageQuery["response"]["Agents"][number];

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

const uncategorizedValue = "__uncategorized__";
const unassignedValue = "__unassigned__";

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

function formatTaskTimestamp(value: string | null): string {
  if (!value) {
    return "Unassigned";
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

function TaskDetailPageContent() {
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
  const task = data.Task;
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

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>
            Update the task name, description, status, category, and assignee inline. Changes here
            flow back to the kanban board because both views read the same persisted task record.
          </CardDescription>
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
            options={(["draft", "pending", "in_progress", "completed"] as TaskStatus[]).map((status) => ({
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
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Metadata for this task record.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Created</p>
            <p className="mt-3 text-sm text-foreground">{formatTaskTimestamp(task.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
            <p className="mt-3 text-sm text-foreground">{formatTaskTimestamp(task.updatedAt)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Assigned</p>
            <p className="mt-3 text-sm text-foreground">{formatTaskTimestamp(task.assignedAt)}</p>
          </div>
        </CardContent>
      </Card>
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
