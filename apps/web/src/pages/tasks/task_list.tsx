import { useEffect, useMemo, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, Loader2Icon, PlayIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  formatTaskAssigneeMeta,
  type TaskCategoryRecord,
  type TaskRecord,
  resolveTaskStatusDotClass,
} from "./task_ui";

type TaskListGroup = {
  key: string;
  label: string;
  taskCategoryId: string | null;
  tasks: TaskRecord[];
};

interface TaskListProps {
  categories: TaskCategoryRecord[];
  deletingTaskId?: string | null;
  executingTaskId?: string | null;
  hasActiveFilters: boolean;
  includeUncategorizedGroup?: boolean;
  onCreateTask(taskCategoryId: string | null): void;
  onDeleteTask(taskId: string): Promise<void>;
  onExecuteTask(taskId: string): Promise<void>;
  onOpenTask(taskId: string): void;
  tasks: TaskRecord[];
}

function buildTaskListGroups(
  categories: TaskCategoryRecord[],
  tasks: TaskRecord[],
  includeUncategorizedGroup: boolean,
): TaskListGroup[] {
  const categoryGroups = categories.map((category) => ({
    key: category.id,
    label: category.name,
    taskCategoryId: category.id,
    tasks: tasks.filter((task) => task.taskCategoryId === category.id),
  }));

  if (!includeUncategorizedGroup) {
    return categoryGroups;
  }

  const uncategorizedTasks = tasks.filter((task) => task.taskCategoryId === null);
  return [...categoryGroups, {
    key: "uncategorized",
    label: "Uncategorized",
    taskCategoryId: null,
    tasks: uncategorizedTasks,
  }];
}

function stopRowNavigation(event: {
  stopPropagation(): void;
}) {
  event.stopPropagation();
}

export function TaskList(props: TaskListProps) {
  const groups = useMemo(() => {
    return buildTaskListGroups(
      props.categories,
      props.tasks,
      props.includeUncategorizedGroup ?? true,
    );
  }, [props.categories, props.includeUncategorizedGroup, props.tasks]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setCollapsedGroups((currentState) => {
      const nextState = Object.fromEntries(
        groups.map((group) => [group.key, currentState[group.key] ?? false]),
      );

      const currentKeys = Object.keys(currentState);
      const nextKeys = Object.keys(nextState);
      if (
        currentKeys.length === nextKeys.length
        && currentKeys.every((key) => currentState[key] === nextState[key])
      ) {
        return currentState;
      }

      return nextState;
    });
  }, [groups]);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-5 py-12 text-center">
        <p className="text-sm font-medium text-foreground">
          {props.hasActiveFilters ? "No tasks match the current filters" : "No tasks yet"}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {props.hasActiveFilters
            ? "Try a different lane filter or switch back to the board to rearrange tasks."
            : "Create the first task to start planning work across lanes and assignees."}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm">
      {groups.map((group, groupIndex) => {
        const isCollapsed = collapsedGroups[group.key] ?? false;

        return (
          <section
            key={group.key}
            className={cn(groupIndex > 0 && "border-t border-border/60")}
          >
            <div className="flex items-center justify-between gap-3 bg-muted/20 px-4 py-3">
              <button
                className="flex min-w-0 flex-1 items-center gap-2 text-left transition hover:text-foreground"
                onClick={() => {
                  setCollapsedGroups((currentState) => ({
                    ...currentState,
                    [group.key]: !isCollapsed,
                  }));
                }}
                type="button"
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="size-4 text-muted-foreground" />
                )}
                <span className="truncate text-sm font-medium text-foreground">{group.label}</span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">{group.tasks.length}</span>
                <Button
                  aria-label={`Create task in ${group.label}`}
                  className="rounded-full"
                  onClick={() => {
                    props.onCreateTask(group.taskCategoryId);
                  }}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <PlusIcon className="size-3" />
                </Button>
              </div>
            </div>

            {isCollapsed ? null : (
              <div>
                {group.tasks.length === 0 ? (
                  <div className="border-t border-border/40 px-4 py-4 text-xs text-muted-foreground">
                    No tasks in this category yet.
                  </div>
                ) : null}
                {group.tasks.map((task) => (
                  <button
                    key={task.id}
                    className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-border/40 px-4 py-2.5 text-left transition hover:bg-muted/15"
                    onClick={() => {
                      props.onOpenTask(task.id);
                    }}
                    type="button"
                  >
                    <span
                      aria-hidden="true"
                      className={cn("size-2 shrink-0 rounded-full", resolveTaskStatusDotClass(task.status))}
                    />
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-xs/relaxed text-foreground">{task.name}</p>
                        {task.assignee ? (
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatTaskAssigneeMeta(task.assignee)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <Button
                        aria-label={`Execute ${task.name}`}
                        disabled={
                          props.executingTaskId === task.id
                          || !task.assignee
                          || task.assignee.kind !== "agent"
                        }
                        onClick={(event) => {
                          stopRowNavigation(event);
                          void props.onExecuteTask(task.id);
                        }}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        {props.executingTaskId === task.id
                          ? <Loader2Icon className="size-3 animate-spin" />
                          : <PlayIcon className="size-3" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            aria-label={`Delete ${task.name}`}
                            disabled={props.deletingTaskId === task.id}
                            onClick={(event) => {
                              stopRowNavigation(event);
                            }}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2Icon className="size-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete task</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the task and any nested child tasks. This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancelAction asChild>
                              <AlertDialogCancelButton
                                onClick={(event) => {
                                  event.stopPropagation();
                                }}
                                variant="outline"
                              >
                                Cancel
                              </AlertDialogCancelButton>
                            </AlertDialogCancelAction>
                            <AlertDialogPrimaryAction asChild>
                              <AlertDialogActionButton
                                autoFocus
                                disabled={props.deletingTaskId === task.id}
                                onClick={async (event) => {
                                  event.stopPropagation();
                                  await props.onDeleteTask(task.id);
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
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
