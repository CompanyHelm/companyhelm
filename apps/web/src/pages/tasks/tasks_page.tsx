import { Suspense, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { CreateTaskDialog } from "./create_task_dialog";
import { TaskBoard } from "./task_board";
import { TaskList } from "./task_list";
import type {
  TaskCategoryRecord,
  TaskRecord,
  TaskViewType,
} from "./task_ui";
import type { tasksPageCreateTaskMutation } from "./__generated__/tasksPageCreateTaskMutation.graphql";
import type { tasksPageDeleteTaskMutation } from "./__generated__/tasksPageDeleteTaskMutation.graphql";
import type { tasksPageExecuteTaskMutation } from "./__generated__/tasksPageExecuteTaskMutation.graphql";
import type { tasksPageQuery } from "./__generated__/tasksPageQuery.graphql";
import type { tasksPageSetTaskCategoryMutation } from "./__generated__/tasksPageSetTaskCategoryMutation.graphql";

type TasksPageCategory = tasksPageQuery["response"]["TaskCategories"][number];
type TasksPageTask = tasksPageQuery["response"]["Tasks"][number];
type TasksPageAssignableUser = tasksPageQuery["response"]["TaskAssignableUsers"][number];
type TasksPageAgent = tasksPageQuery["response"]["Agents"][number];

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

const tasksPageDeleteTaskMutationNode = graphql`
  mutation tasksPageDeleteTaskMutation($input: DeleteTaskInput!) {
    DeleteTask(input: $input) {
      id
    }
  }
`;

const tasksPageExecuteTaskMutationNode = graphql`
  mutation tasksPageExecuteTaskMutation($input: ExecuteTaskInput!) {
    ExecuteTask(input: $input) {
      id
      taskId
      status
      sessionId
    }
  }
`;

type TasksPageSearch = {
  category?: string;
  viewType?: TaskViewType;
};

function parseSelectedTaskCategoryKeys(
  categorySearchValue: string | undefined,
  validCategoryKeys: Set<string>,
): string[] {
  if (!categorySearchValue) {
    return [];
  }

  const selectedCategoryKeys = [] as string[];
  for (const rawCategoryKey of categorySearchValue.split(",")) {
    const categoryKey = rawCategoryKey.trim();
    if (
      categoryKey.length === 0
      || !validCategoryKeys.has(categoryKey)
      || selectedCategoryKeys.includes(categoryKey)
    ) {
      continue;
    }

    selectedCategoryKeys.push(categoryKey);
  }

  return selectedCategoryKeys;
}

function filterStoreRecords(records: ReadonlyArray<unknown>): Array<{ getDataID(): string }> {
  return records.filter((record): record is { getDataID(): string } => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function buildTasksPageSearch(input: {
  category?: string;
  viewType: TaskViewType;
}): TasksPageSearch {
  return {
    category: input.category,
    viewType: input.viewType,
  };
}

function TasksPageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <section className="shrink-0 rounded-2xl border border-border/60 bg-card/80 shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Execution planning
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Tasks
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Switch between board and list views while keeping the same lanes, assignees, and
                task actions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-border/60 bg-muted/30 p-1">
                <Button className="h-8 rounded-lg px-3 text-sm" disabled size="sm" variant="ghost">
                  Board
                </Button>
                <Button className="h-8 rounded-lg px-3 text-sm" disabled size="sm" variant="ghost">
                  List
                </Button>
              </div>
              <Button disabled size="sm">
                <PlusIcon />
                Create task
              </Button>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Filter by lane
            </p>
            <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
              <Button className="h-10 rounded-full border border-border/60 bg-muted px-4 text-sm" disabled variant="ghost">
                All tasks
              </Button>
              <Button className="h-10 rounded-full border border-border/40 px-4 text-sm" disabled variant="ghost">
                Loading
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 text-center text-sm leading-6 text-muted-foreground">
          Loading tasks...
        </div>
      </div>
    </main>
  );
}

function TasksPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const search = useSearch({ strict: false }) as TasksPageSearch;
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
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
  const [commitDeleteTask] = useMutation<tasksPageDeleteTaskMutation>(
    tasksPageDeleteTaskMutationNode,
  );
  const [commitExecuteTask] = useMutation<tasksPageExecuteTaskMutation>(
    tasksPageExecuteTaskMutationNode,
  );
  const selectedViewType: TaskViewType = search.viewType === "list" ? "list" : "board";
  const allCategories: TaskCategoryRecord[] = data.TaskCategories.map((category: TasksPageCategory) => ({
    id: category.id,
    name: category.name,
  }));
  const uncategorizedTaskCount = data.Tasks.filter((task: TasksPageTask) => task.taskCategoryId === null).length;
  const categoryFilterOptions = [
    {
      key: undefined,
      label: "All tasks",
      count: data.Tasks.length,
    },
    ...allCategories.map((category: TaskCategoryRecord) => ({
      key: category.id,
      label: category.name,
      count: data.Tasks.filter((task: TasksPageTask) => task.taskCategoryId === category.id).length,
    })),
    ...(uncategorizedTaskCount > 0
      ? [{
        key: "uncategorized",
        label: "Uncategorized",
        count: uncategorizedTaskCount,
      }]
      : []),
  ];
  const validCategoryKeys = new Set(
    categoryFilterOptions.flatMap((filterOption) => filterOption.key ? [filterOption.key] : []),
  );
  const selectedCategoryKeys = parseSelectedTaskCategoryKeys(search.category, validCategoryKeys);
  const hasSelectedCategoryFilters = selectedCategoryKeys.length > 0;
  const visibleCategories = !hasSelectedCategoryFilters
    ? allCategories
    : allCategories.filter((category: TaskCategoryRecord) => selectedCategoryKeys.includes(category.id));
  const visibleTasks: TaskRecord[] = (!hasSelectedCategoryFilters
    ? data.Tasks
    : data.Tasks.filter((task: TasksPageTask) => {
      return selectedCategoryKeys.includes(task.taskCategoryId ?? "uncategorized");
    }))
    .map((task: TasksPageTask) => ({
      assignedAt: task.assignedAt,
      assignee: task.assignee
        ? {
          email: task.assignee.email,
          id: task.assignee.id,
          kind: task.assignee.kind as "agent" | "user",
          name: task.assignee.name,
        }
        : null,
      createdAt: task.createdAt,
      description: task.description,
      id: task.id,
      name: task.name,
      status: task.status as "draft" | "in_progress" | "completed",
      taskCategoryId: task.taskCategoryId,
      taskCategoryName: task.taskCategoryName,
      updatedAt: task.updatedAt,
    }));
  const currentCategorySearchValue = selectedCategoryKeys.length > 0
    ? selectedCategoryKeys.join(",")
    : undefined;

  async function deleteTask(taskId: string) {
    setDeletingTaskId(taskId);
    setErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDeleteTask({
          variables: {
            input: {
              taskId,
            },
          },
          updater: (store: {
            delete?(dataId: string): void;
            getRoot(): {
              getLinkedRecords(name: string): ReadonlyArray<unknown> | null | undefined;
              setLinkedRecords(records: Array<{ getDataID(): string }>, name: string): void;
            };
            getRootField(name: string): { getDataID(): string } | null | undefined;
          }) => {
            const deletedTask = store.getRootField("DeleteTask");
            if (!deletedTask) {
              return;
            }

            const deletedTaskId = deletedTask.getDataID();
            const rootRecord = store.getRoot();
            const currentTasks = filterStoreRecords(rootRecord.getLinkedRecords("Tasks") || []);
            rootRecord.setLinkedRecords(
              currentTasks.filter((taskRecord) => taskRecord.getDataID() !== deletedTaskId),
              "Tasks",
            );
            store.delete?.(deletedTaskId);
          },
          onCompleted: (
            _response: tasksPageDeleteTaskMutation["response"],
            errors: ReadonlyArray<{ message: string }> | null | undefined,
          ) => {
            const nextErrorMessage = errors?.[0]?.message;
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete task.");
    } finally {
      setDeletingTaskId(null);
    }
  }

  async function executeTask(taskId: string) {
    setExecutingTaskId(taskId);
    setErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitExecuteTask({
          variables: {
            input: {
              taskId,
            },
          },
          updater: (store: {
            get(taskRecordId: string): { setValue(value: unknown, fieldName: string): void } | null | undefined;
          }) => {
            store.get(taskId)?.setValue("in_progress", "status");
          },
          onCompleted: (
            _response: tasksPageExecuteTaskMutation["response"],
            errors: ReadonlyArray<{ message: string }> | null | undefined,
          ) => {
            const nextErrorMessage = errors?.[0]?.message;
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to execute task.");
    } finally {
      setExecutingTaskId(null);
    }
  }

  async function moveTask(taskId: string, taskCategoryId: string | null) {
    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitSetTaskCategory({
        variables: {
          input: {
            taskId,
            taskCategoryId,
          },
        },
        onCompleted: (
          _response: tasksPageSetTaskCategoryMutation["response"],
          errors: ReadonlyArray<{ message: string }> | null | undefined,
        ) => {
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
  }

  function openTaskDetail(taskId: string) {
    void navigate({
      params: {
        organizationSlug,
        taskId,
      },
      search: {
        viewType: selectedViewType,
      },
      to: OrganizationPath.route("/tasks/$taskId"),
    });
  }

  return (
    <main className={cn(
      "flex h-full min-h-0 flex-1 flex-col gap-4",
      selectedViewType === "board" && "overflow-hidden",
    )}>
      <section className="shrink-0 rounded-2xl border border-border/60 bg-card/80 shadow-sm">
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Execution planning
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Tasks
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Switch between board and list views, scan assignees and lanes more easily, and jump
                into task execution without losing context.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-xl border border-border/60 bg-muted/30 p-1">
                {(["board", "list"] as TaskViewType[]).map((viewType) => {
                  const isSelected = selectedViewType === viewType;

                  return (
                    <Button
                      key={viewType}
                      className={cn(
                        "h-8 rounded-lg px-3 text-sm",
                        isSelected && "bg-background shadow-sm hover:bg-background",
                      )}
                      onClick={() => {
                        void navigate({
                          params: {
                            organizationSlug,
                          },
                          search: buildTasksPageSearch({
                            category: currentCategorySearchValue,
                            viewType,
                          }),
                          to: OrganizationPath.route("/tasks"),
                        });
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {viewType === "board" ? "Board" : "List"}
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
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Filter by lane
              </p>
              <p className="text-xs text-muted-foreground">{visibleTasks.length} shown</p>
            </div>
            <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
              {categoryFilterOptions.map((filterOption) => {
                const isSelected = filterOption.key === undefined
                  ? !hasSelectedCategoryFilters
                  : selectedCategoryKeys.includes(filterOption.key);

                return (
                  <Button
                    key={filterOption.key ?? "all"}
                    className={cn(
                      "h-10 shrink-0 rounded-full border px-4 text-sm",
                      isSelected
                        ? "border-border/70 bg-muted text-foreground hover:bg-muted"
                        : "border-border/40 bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                    )}
                    onClick={() => {
                      if (filterOption.key === undefined) {
                        void navigate({
                          params: {
                            organizationSlug,
                          },
                          search: buildTasksPageSearch({
                            viewType: selectedViewType,
                          }),
                          to: OrganizationPath.route("/tasks"),
                        });
                        return;
                      }

                      const nextSelectedCategoryKeys = isSelected
                        ? selectedCategoryKeys.filter((categoryKey) => categoryKey !== filterOption.key)
                        : categoryFilterOptions
                          .flatMap((option) => option.key ? [option.key] : [])
                          .filter((categoryKey) => {
                            return categoryKey === filterOption.key || selectedCategoryKeys.includes(categoryKey);
                          });

                      void navigate({
                        params: {
                          organizationSlug,
                        },
                        search: buildTasksPageSearch({
                          category: nextSelectedCategoryKeys.length > 0
                            ? nextSelectedCategoryKeys.join(",")
                            : undefined,
                          viewType: selectedViewType,
                        }),
                        to: OrganizationPath.route("/tasks"),
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
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="shrink-0 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className={cn("min-h-0 flex-1", selectedViewType === "board" && "overflow-hidden")}>
        {selectedViewType === "board" ? (
          <TaskBoard
            categories={visibleCategories}
            deletingTaskId={deletingTaskId}
            executingTaskId={executingTaskId}
            includeUncategorizedColumn={!hasSelectedCategoryFilters || selectedCategoryKeys.includes("uncategorized")}
            onDeleteTask={deleteTask}
            onExecuteTask={executeTask}
            onMoveTask={moveTask}
            onOpenTask={openTaskDetail}
            tasks={visibleTasks}
          />
        ) : (
          <TaskList
            deletingTaskId={deletingTaskId}
            executingTaskId={executingTaskId}
            hasActiveFilters={hasSelectedCategoryFilters}
            onDeleteTask={deleteTask}
            onExecuteTask={executeTask}
            onOpenTask={openTaskDetail}
            tasks={visibleTasks}
          />
        )}
      </div>

      <CreateTaskDialog
        assignees={[
          ...data.TaskAssignableUsers.map((user: TasksPageAssignableUser) => ({
            label: `Human · ${user.displayName}`,
            value: `user:${user.id}`,
          })),
          ...data.Agents.map((agent: TasksPageAgent) => ({
            label: `Agent · ${agent.name}`,
            value: `agent:${agent.id}`,
          })),
        ]}
        categories={data.TaskCategories.map((category: TasksPageCategory) => ({
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
              updater: (store: {
                getRoot(): {
                  getLinkedRecords(name: string): ReadonlyArray<unknown> | null | undefined;
                  setLinkedRecords(records: Array<{ getDataID(): string }>, name: string): void;
                };
                getRootField(name: string): { getDataID(): string } | null | undefined;
              }) => {
                const createdTask = store.getRootField("CreateTask");
                if (!createdTask) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentTasks = filterStoreRecords(rootRecord.getLinkedRecords("Tasks") || []);
                rootRecord.setLinkedRecords([createdTask, ...currentTasks], "Tasks");
              },
              onCompleted: (
                _response: tasksPageCreateTaskMutation["response"],
                errors: ReadonlyArray<{ message: string }> | null | undefined,
              ) => {
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
