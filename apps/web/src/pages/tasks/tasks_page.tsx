import { Suspense, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { CreateTaskDialog } from "./create_task_dialog";
import { TaskBoard } from "./task_board";
import type { tasksPageCreateTaskMutation } from "./__generated__/tasksPageCreateTaskMutation.graphql";
import type { tasksPageQuery } from "./__generated__/tasksPageQuery.graphql";
import type { tasksPageSetTaskCategoryMutation } from "./__generated__/tasksPageSetTaskCategoryMutation.graphql";

const tasksPageQueryNode = graphql`
  query tasksPageQuery {
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
      taskCount
      createdAt
      updatedAt
    }
    Tasks {
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

const tasksPageCreateTaskMutationNode = graphql`
  mutation tasksPageCreateTaskMutation($input: CreateTaskInput!) {
    CreateTask(input: $input) {
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

const tasksPageSetTaskCategoryMutationNode = graphql`
  mutation tasksPageSetTaskCategoryMutation($input: SetTaskCategoryInput!) {
    SetTaskCategory(input: $input) {
      id
      name
      description
      status
      taskCategoryId
      taskCategoryName
      createdAt
      updatedAt
    }
  }
`;

type TasksPageSearch = {
  category?: string;
};

function filterStoreRecords(records: ReadonlyArray<unknown>): Array<{ getDataID(): string }> {
  return records.filter((record): record is { getDataID(): string } => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function TasksPageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <Button className="h-9 rounded-full border border-border/60 bg-muted px-4 text-sm" disabled variant="ghost">
            All tasks
          </Button>
          <Button className="h-9 rounded-full border border-border/40 px-4 text-sm" disabled variant="ghost">
            Loading
          </Button>
        </div>
        <Button disabled size="sm">
          <PlusIcon />
          Create task
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
          Loading tasks...
        </div>
      </div>
    </main>
  );
}

function TasksPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as TasksPageSearch;
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const data = useLazyLoadQuery<tasksPageQuery>(
    tasksPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateTask, isCreateTaskInFlight] = useMutation<tasksPageCreateTaskMutation>(
    tasksPageCreateTaskMutationNode,
  );
  const [commitSetTaskCategory] = useMutation<tasksPageSetTaskCategoryMutation>(
    tasksPageSetTaskCategoryMutationNode,
  );
  const allCategories = data.TaskCategories.map((category) => ({
    id: category.id,
    name: category.name,
  }));
  const uncategorizedTaskCount = data.Tasks.filter((task) => task.taskCategoryId === null).length;
  const categoryFilterOptions = [
    {
      key: undefined,
      label: "All tasks",
      count: data.Tasks.length,
    },
    ...allCategories.map((category) => ({
      key: category.id,
      label: category.name,
      count: data.Tasks.filter((task) => task.taskCategoryId === category.id).length,
    })),
    ...(uncategorizedTaskCount > 0
      ? [{
        key: "uncategorized",
        label: "Uncategorized",
        count: uncategorizedTaskCount,
      }]
      : []),
  ];
  const selectedCategoryKey = categoryFilterOptions.some((filterOption) => filterOption.key === search.category)
    ? search.category
    : undefined;
  const visibleCategories = selectedCategoryKey === undefined
    ? allCategories
    : selectedCategoryKey === "uncategorized"
      ? []
      : allCategories.filter((category) => category.id === selectedCategoryKey);
  const visibleTasks = selectedCategoryKey === undefined
    ? data.Tasks
    : selectedCategoryKey === "uncategorized"
      ? data.Tasks.filter((task) => task.taskCategoryId === null)
      : data.Tasks.filter((task) => task.taskCategoryId === selectedCategoryKey);

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          {categoryFilterOptions.map((filterOption) => {
            const isSelected = selectedCategoryKey === filterOption.key;

            return (
              <Button
                key={filterOption.key ?? "all"}
                className={`h-9 shrink-0 rounded-full border px-4 text-sm ${
                  isSelected
                    ? "border-border/70 bg-muted text-foreground hover:bg-muted"
                    : "border-border/40 bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
                onClick={() => {
                  void navigate({
                    to: "/tasks",
                    search: filterOption.key ? { category: filterOption.key } : {},
                  });
                }}
                size="sm"
                variant="ghost"
              >
                {filterOption.label}
                <span className="ml-1.5 text-xs text-muted-foreground/80">{filterOption.count}</span>
              </Button>
            );
          })}
        </div>
        <Button
          onClick={() => {
            setCreateDialogOpen(true);
          }}
          size="sm"
        >
          <PlusIcon />
          Create task
        </Button>
      </div>

      {errorMessage ? (
        <div className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <TaskBoard
          categories={visibleCategories}
          includeUncategorizedColumn={selectedCategoryKey === undefined || selectedCategoryKey === "uncategorized"}
          tasks={visibleTasks.map((task) => ({
            assignedAt: task.assignedAt,
            assignee: task.assignee
              ? {
                email: task.assignee.email,
                id: task.assignee.id,
                kind: task.assignee.kind as "agent" | "user",
                name: task.assignee.name,
              }
              : null,
            id: task.id,
            name: task.name,
            description: task.description,
            status: task.status as "draft" | "pending" | "in_progress" | "completed",
            taskCategoryId: task.taskCategoryId,
            taskCategoryName: task.taskCategoryName,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
          }))}
          onMoveTask={async (taskId, taskCategoryId) => {
            setErrorMessage(null);

            await new Promise<void>((resolve, reject) => {
              commitSetTaskCategory({
                variables: {
                  input: {
                    taskId,
                    taskCategoryId,
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
            }).catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : "Failed to move task.");
            });
          }}
        />
      </div>

      <CreateTaskDialog
        assignees={[
          ...data.TaskAssignableUsers.map((user) => ({
            label: `Human · ${user.displayName}`,
            value: `user:${user.id}`,
          })),
          ...data.Agents.map((agent) => ({
            label: `Agent · ${agent.name}`,
            value: `agent:${agent.id}`,
          })),
        ]}
        categories={data.TaskCategories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateTaskInFlight}
        onCreate={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitCreateTask({
              variables: {
                input,
              },
              updater: (store) => {
                const createdTask = store.getRootField("CreateTask");
                if (!createdTask) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentTasks = filterStoreRecords(rootRecord.getLinkedRecords("Tasks") || []);
                rootRecord.setLinkedRecords([createdTask, ...currentTasks], "Tasks");
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = errors?.[0]?.message;
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setCreateDialogOpen(false);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create task.");
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}

/**
 * Hosts the Relay-backed task-management slice so the route can stay small while still handling
 * task creation and board moves directly against the GraphQL API.
 */
export function TasksPage() {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageContent />
    </Suspense>
  );
}
