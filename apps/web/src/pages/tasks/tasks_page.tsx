import { Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LayoutGridIcon, ListIcon, SlidersHorizontalIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { cn } from "@/lib/utils";
import { AssignTaskExecutionDialog } from "./assign_task_execution_dialog";
import { CreateTaskDialog } from "./create_task_dialog";
import { TaskBoard } from "./task_board";
import { TaskList } from "./task_list";
import type {
  TaskStageRecord,
  TaskRecord,
  TaskViewType,
} from "./task_ui";
import type { tasksPageCreateTaskMutation } from "./__generated__/tasksPageCreateTaskMutation.graphql";
import type { tasksPageDeleteTaskMutation } from "./__generated__/tasksPageDeleteTaskMutation.graphql";
import type { tasksPageExecuteTaskMutation } from "./__generated__/tasksPageExecuteTaskMutation.graphql";
import type { tasksPageQuery } from "./__generated__/tasksPageQuery.graphql";
import type { tasksPageSetTaskStageMutation } from "./__generated__/tasksPageSetTaskStageMutation.graphql";
import type { tasksPageUpdateTaskMutation } from "./__generated__/tasksPageUpdateTaskMutation.graphql";

type TasksPageStage = tasksPageQuery["response"]["TaskStages"][number];
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
    TaskStages {
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

const tasksPageCreateTaskMutationNode = graphql`
  mutation tasksPageCreateTaskMutation($input: CreateTaskInput!) {
    CreateTask(input: $input) {
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

const tasksPageSetTaskStageMutationNode = graphql`
  mutation tasksPageSetTaskStageMutation($input: SetTaskStageInput!) {
    SetTaskStage(input: $input) {
      id
      name
      description
      status
      taskStageId
      taskStageName
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

const tasksPageUpdateTaskMutationNode = graphql`
  mutation tasksPageUpdateTaskMutation($input: UpdateTaskInput!) {
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

type TasksPageSearch = {
  stage?: string;
  viewType?: TaskViewType;
};

function parseSelectedTaskStageKeys(
  stageSearchValue: string | undefined,
  validStageKeys: Set<string>,
): string[] {
  if (!stageSearchValue) {
    return [];
  }

  const selectedStageKeys = [] as string[];
  for (const rawStageKey of stageSearchValue.split(",")) {
    const stageKey = rawStageKey.trim();
    if (
      stageKey.length === 0
      || !validStageKeys.has(stageKey)
      || selectedStageKeys.includes(stageKey)
    ) {
      continue;
    }

    selectedStageKeys.push(stageKey);
  }

  return selectedStageKeys;
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
  stage?: string;
  viewType: TaskViewType;
}): TasksPageSearch {
  return {
    stage: input.stage,
    viewType: input.viewType,
  };
}

function TasksPageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          <div className="h-5 w-16 shrink-0 rounded-full border border-border/60 bg-muted/50" />
          <div className="h-5 w-14 shrink-0 rounded-full border border-border/40 bg-background/40" />
          <div className="h-5 w-20 shrink-0 rounded-full border border-border/40 bg-background/40" />
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
  const [createTaskStageId, setCreateTaskStageId] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [assignExecutionTaskId, setAssignExecutionTaskId] = useState<string | null>(null);
  const [assignExecutionErrorMessage, setAssignExecutionErrorMessage] = useState<string | null>(null);
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
  const [commitSetTaskStage] = useMutation<tasksPageSetTaskStageMutation>(
    tasksPageSetTaskStageMutationNode,
  );
  const [commitDeleteTask] = useMutation<tasksPageDeleteTaskMutation>(
    tasksPageDeleteTaskMutationNode,
  );
  const [commitExecuteTask] = useMutation<tasksPageExecuteTaskMutation>(
    tasksPageExecuteTaskMutationNode,
  );
  const [commitUpdateTask, isUpdateTaskInFlight] = useMutation<tasksPageUpdateTaskMutation>(
    tasksPageUpdateTaskMutationNode,
  );
  const selectedViewType: TaskViewType = search.viewType === "list" ? "list" : "board";
  const allStages: TaskStageRecord[] = data.TaskStages.map((stage: TasksPageStage) => ({
    id: stage.id,
    name: stage.name,
  }));
  const noStageTaskCount = data.Tasks.filter((task: TasksPageTask) => task.taskStageId === null).length;
  const stageFilterOptions = [
    ...allStages.map((stage: TaskStageRecord) => ({
      key: stage.id,
      label: stage.name,
      count: data.Tasks.filter((task: TasksPageTask) => task.taskStageId === stage.id).length,
    })),
    {
      key: "noStage",
      label: "No stage",
      count: noStageTaskCount,
    },
  ];
  const allStageKeys = stageFilterOptions.map((filterOption) => filterOption.key);
  const validStageKeys = new Set(allStageKeys);
  const parsedSelectedStageKeys = parseSelectedTaskStageKeys(search.stage, validStageKeys);
  const selectedStageKeys = parsedSelectedStageKeys.length === allStageKeys.length
    ? []
    : parsedSelectedStageKeys;
  const effectiveSelectedStageKeys = selectedStageKeys.length > 0
    ? selectedStageKeys
    : allStageKeys;
  const hasSelectedStageFilters = selectedStageKeys.length > 0;
  const includeNoStageGroup = effectiveSelectedStageKeys.includes("noStage");
  const visibleStages = allStages.filter((stage: TaskStageRecord) => {
    return effectiveSelectedStageKeys.includes(stage.id);
  });
  const visibleTasks: TaskRecord[] = (!hasSelectedStageFilters
    ? data.Tasks
    : data.Tasks.filter((task: TasksPageTask) => {
      return effectiveSelectedStageKeys.includes(task.taskStageId ?? "noStage");
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
      taskStageId: task.taskStageId,
      taskStageName: task.taskStageName,
      updatedAt: task.updatedAt,
    }));
  const currentStageSearchValue = selectedStageKeys.length > 0
    ? selectedStageKeys.join(",")
    : undefined;
  const assignExecutionTask = assignExecutionTaskId
    ? data.Tasks.find((task: TasksPageTask) => task.id === assignExecutionTaskId) ?? null
    : null;

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
        stage: currentStageSearchValue,
        viewType,
      }),
      to: OrganizationPath.route("/tasks"),
    });
  }

  function openCreateTaskDialog(taskStageId: string | null) {
    setCreateTaskStageId(taskStageId);
    setCreateDialogOpen(true);
  }

  function toggleStage(stageKey: string) {
    const currentSelectedKeys = selectedStageKeys.length > 0
      ? selectedStageKeys
      : allStageKeys;
    const isSelected = currentSelectedKeys.includes(stageKey);
    const nextSelectedKeySet = isSelected
      ? currentSelectedKeys.filter((key) => key !== stageKey)
      : [...currentSelectedKeys, stageKey];
    const nextSelectedKeys = allStageKeys.filter((key) => nextSelectedKeySet.includes(key));
    const nextStageSearchValue = nextSelectedKeys.length === 0 || nextSelectedKeys.length === allStageKeys.length
      ? undefined
      : nextSelectedKeys.join(",");

    void navigate({
      params: {
        organizationSlug,
      },
      search: buildTasksPageSearch({
        stage: nextStageSearchValue,
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

  async function commitTaskExecution(taskId: string) {
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
  }

  async function assignAgentToTask(taskId: string, agentId: string) {
    await new Promise<void>((resolve, reject) => {
      commitUpdateTask({
        variables: {
          input: {
            taskId,
            assignedAgentId: agentId,
            assignedUserId: null,
          },
        },
        onCompleted: (
          _response: tasksPageUpdateTaskMutation["response"],
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
  }

  async function executeAssignedTask(taskId: string) {
    setExecutingTaskId(taskId);
    setErrorMessage(null);

    try {
      await commitTaskExecution(taskId);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to execute task.");
    } finally {
      setExecutingTaskId(null);
    }
  }

  async function executeTask(taskId: string) {
    const task = data.Tasks.find((candidateTask: TasksPageTask) => candidateTask.id === taskId);
    const assignedAgentId = task?.assignee?.kind === "agent" ? task.assignee.id : null;
    if (!assignedAgentId) {
      setAssignExecutionTaskId(taskId);
      setAssignExecutionErrorMessage(null);
      return;
    }

    await executeAssignedTask(taskId);
  }

  async function assignAgentAndExecuteTask(agentId: string) {
    if (!assignExecutionTaskId) {
      return;
    }

    setExecutingTaskId(assignExecutionTaskId);
    setAssignExecutionErrorMessage(null);

    try {
      await assignAgentToTask(assignExecutionTaskId, agentId);
      await commitTaskExecution(assignExecutionTaskId);
      setAssignExecutionTaskId(null);
    } catch (error: unknown) {
      setAssignExecutionErrorMessage(error instanceof Error ? error.message : "Failed to assign and execute task.");
    } finally {
      setExecutingTaskId(null);
    }
  }

  async function moveTask(taskId: string, taskStageId: string | null) {
    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitSetTaskStage({
        variables: {
          input: {
            taskId,
            taskStageId,
          },
        },
        onCompleted: (
          _response: tasksPageSetTaskStageMutation["response"],
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
          {stageFilterOptions.map((filterOption) => {
            const isSelected = effectiveSelectedStageKeys.includes(filterOption.key);

            return (
              <button
                key={filterOption.key}
                className={cn(
                  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 whitespace-nowrap outline-none transition focus-visible:ring-1 focus-visible:ring-ring/30",
                  isSelected
                    ? "bg-muted/80 text-foreground"
                    : "bg-background/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
                onClick={() => {
                  toggleStage(filterOption.key);
                }}
                type="button"
              >
                <span className="text-xs leading-none font-medium">
                  {filterOption.label}
                </span>
                <span className="text-xs leading-none tabular-nums opacity-60">
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
            stages={visibleStages}
            deletingTaskId={deletingTaskId}
            executingTaskId={executingTaskId}
            includeNoStageColumn={includeNoStageGroup}
            onCreateTask={openCreateTaskDialog}
            onDeleteTask={deleteTask}
            onExecuteTask={executeTask}
            onMoveTask={moveTask}
            onOpenTask={openTaskDetail}
            tasks={visibleTasks}
          />
        ) : (
          <TaskList
            stages={visibleStages}
            deletingTaskId={deletingTaskId}
            executingTaskId={executingTaskId}
            hasActiveFilters={hasSelectedStageFilters}
            includeNoStageGroup={includeNoStageGroup}
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
        stages={data.TaskStages.map((stage: TasksPageStage) => ({
          id: stage.id,
          name: stage.name,
        }))}
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        initialStageId={createTaskStageId}
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
                setCreateTaskStageId(null);
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
            setCreateTaskStageId(null);
          }
        }}
      />

      <AssignTaskExecutionDialog
        agents={data.Agents.map((agent: TasksPageAgent) => ({
          id: agent.id,
          name: agent.name,
        }))}
        errorMessage={assignExecutionErrorMessage}
        isOpen={assignExecutionTask !== null}
        isSaving={isUpdateTaskInFlight || (assignExecutionTaskId !== null && executingTaskId === assignExecutionTaskId)}
        onAssignAndExecute={assignAgentAndExecuteTask}
        onOpenChange={(open) => {
          if (open) {
            return;
          }

          setAssignExecutionTaskId(null);
          setAssignExecutionErrorMessage(null);
        }}
        taskName={assignExecutionTask?.name ?? "this task"}
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
