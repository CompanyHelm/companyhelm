import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LayoutGridIcon, ListIcon, SlidersHorizontalIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { cn } from "@/lib/utils";
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
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <div className="h-8 w-24 shrink-0 rounded-full border border-border/60 bg-muted/50" />
          <div className="h-8 w-20 shrink-0 rounded-full border border-border/40 bg-background/40" />
          <div className="h-8 w-28 shrink-0 rounded-full border border-border/40 bg-background/40" />
        </div>
        <Button className="rounded-full" disabled size="icon-sm" variant="outline">
          <SlidersHorizontalIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-xs text-muted-foreground">
            Loading
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
  const [createTaskCategoryId, setCreateTaskCategoryId] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [isViewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
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
    ...allCategories.map((category: TaskCategoryRecord) => ({
      key: category.id,
      label: category.name,
      count: data.Tasks.filter((task: TasksPageTask) => task.taskCategoryId === category.id).length,
    })),
    {
      key: "uncategorized",
      label: "Uncategorized",
      count: uncategorizedTaskCount,
    },
  ];
  const allCategoryKeys = categoryFilterOptions.map((filterOption) => filterOption.key);
  const validCategoryKeys = new Set(allCategoryKeys);
  const parsedSelectedCategoryKeys = parseSelectedTaskCategoryKeys(search.category, validCategoryKeys);
  const selectedCategoryKeys = parsedSelectedCategoryKeys.length === allCategoryKeys.length
    ? []
    : parsedSelectedCategoryKeys;
  const effectiveSelectedCategoryKeys = selectedCategoryKeys.length > 0
    ? selectedCategoryKeys
    : allCategoryKeys;
  const hasSelectedCategoryFilters = selectedCategoryKeys.length > 0;
  const includeUncategorizedGroup = effectiveSelectedCategoryKeys.includes("uncategorized");
  const visibleCategories = allCategories.filter((category: TaskCategoryRecord) => {
    return effectiveSelectedCategoryKeys.includes(category.id);
  });
  const visibleTasks: TaskRecord[] = (!hasSelectedCategoryFilters
    ? data.Tasks
    : data.Tasks.filter((task: TasksPageTask) => {
      return effectiveSelectedCategoryKeys.includes(task.taskCategoryId ?? "uncategorized");
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

  useEffect(() => {
    if (!isViewMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (!viewMenuRef.current?.contains(event.target)) {
        setViewMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setViewMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isViewMenuOpen]);

  function selectViewType(viewType: TaskViewType) {
    setViewMenuOpen(false);
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
  }

  function openCreateTaskDialog(taskCategoryId: string | null) {
    setCreateTaskCategoryId(taskCategoryId);
    setCreateDialogOpen(true);
  }

  function toggleCategory(categoryKey: string) {
    const currentSelectedKeys = selectedCategoryKeys.length > 0
      ? selectedCategoryKeys
      : allCategoryKeys;
    const isSelected = currentSelectedKeys.includes(categoryKey);
    const nextSelectedKeySet = isSelected
      ? currentSelectedKeys.filter((key) => key !== categoryKey)
      : [...currentSelectedKeys, categoryKey];
    const nextSelectedKeys = allCategoryKeys.filter((key) => nextSelectedKeySet.includes(key));
    const nextCategorySearchValue = nextSelectedKeys.length === 0 || nextSelectedKeys.length === allCategoryKeys.length
      ? undefined
      : nextSelectedKeys.join(",");

    void navigate({
      params: {
        organizationSlug,
      },
      search: buildTasksPageSearch({
        category: nextCategorySearchValue,
        viewType: selectedViewType,
      }),
      to: OrganizationPath.route("/tasks"),
    });
  }

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
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          {categoryFilterOptions.map((filterOption) => {
            const isSelected = effectiveSelectedCategoryKeys.includes(filterOption.key);

            return (
              <button
                key={filterOption.key}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border-0 px-2.5 text-xs whitespace-nowrap shadow-none outline-none transition focus-visible:ring-1 focus-visible:ring-ring/30",
                  isSelected
                    ? "bg-muted/80 text-foreground"
                    : "bg-background/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                onClick={() => {
                  toggleCategory(filterOption.key);
                }}
                type="button"
              >
                <span className="leading-none">{filterOption.label}</span>
                <span className="text-[10px] leading-none tabular-nums opacity-60">
                  {filterOption.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex shrink-0 items-center" ref={viewMenuRef}>
          <Button
            aria-expanded={isViewMenuOpen}
            aria-haspopup="dialog"
            className="rounded-full"
            onClick={() => {
              setViewMenuOpen((currentValue) => !currentValue);
            }}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <SlidersHorizontalIcon className="size-3.5" />
          </Button>

          {isViewMenuOpen ? (
            <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur">
              <p className="mb-2 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                View type
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-1">
                {([
                  {
                    icon: ListIcon,
                    label: "List",
                    value: "list" as const,
                  },
                  {
                    icon: LayoutGridIcon,
                    label: "Board",
                    value: "board" as const,
                  },
                ]).map((option) => {
                  const isSelected = selectedViewType === option.value;
                  const Icon = option.icon;

                  return (
                    <Button
                      key={option.value}
                      className={cn(
                        "h-10 justify-center rounded-lg text-sm",
                        isSelected && "bg-background shadow-sm hover:bg-background",
                      )}
                      onClick={() => {
                        selectViewType(option.value);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Icon className="size-3.5" />
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className={cn("min-h-0 flex-1", selectedViewType === "board" && "overflow-hidden")}>
        {selectedViewType === "board" ? (
          <TaskBoard
            categories={visibleCategories}
            deletingTaskId={deletingTaskId}
            executingTaskId={executingTaskId}
            includeUncategorizedColumn={includeUncategorizedGroup}
            onCreateTask={openCreateTaskDialog}
            onDeleteTask={deleteTask}
            onExecuteTask={executeTask}
            onMoveTask={moveTask}
            onOpenTask={openTaskDetail}
            tasks={visibleTasks}
          />
        ) : (
          <TaskList
            categories={visibleCategories}
            deletingTaskId={deletingTaskId}
            executingTaskId={executingTaskId}
            hasActiveFilters={hasSelectedCategoryFilters}
            includeUncategorizedGroup={includeUncategorizedGroup}
            onCreateTask={openCreateTaskDialog}
            onDeleteTask={deleteTask}
            onExecuteTask={executeTask}
            onMoveTask={moveTask}
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
        initialCategoryId={createTaskCategoryId}
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
                setCreateTaskCategoryId(null);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create task.");
          });
        }}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setCreateTaskCategoryId(null);
          }
        }}
      />
    </main>
  );
}

export function TasksPage() {
  return (
    <Suspense fallback={<TasksPageFallback />}>
      <TasksPageContent />
    </Suspense>
  );
}
