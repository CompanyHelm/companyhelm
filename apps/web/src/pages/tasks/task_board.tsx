import { useRef, useState, type DragEvent } from "react";
import { Loader2Icon, PlayIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";

type TaskStatus = "draft" | "in_progress" | "completed";

export type TaskBoardTask = {
  assignedAt: string | null | undefined;
  assignee: {
    email: string | null | undefined;
    id: string;
    kind: "agent" | "user";
    name: string;
  } | null;
  id: string;
  name: string;
  description: string | null | undefined;
  status: TaskStatus;
  taskCategoryId: string | null | undefined;
  taskCategoryName: string | null | undefined;
  createdAt: string;
  updatedAt: string;
};

export type TaskBoardCategory = {
  id: string;
  name: string;
};

interface TaskBoardProps {
  categories: TaskBoardCategory[];
  deletingTaskId?: string | null;
  executingTaskId?: string | null;
  onCreateTask(taskCategoryId: string | null): void;
  onDeleteTask(taskId: string): Promise<void>;
  onExecuteTask(taskId: string): Promise<void>;
  tasks: TaskBoardTask[];
  includeUncategorizedColumn?: boolean;
  onMoveTask(taskId: string, taskCategoryId: string | null): Promise<void>;
  onOpenTask(taskId: string): void;
}

type TaskBoardColumn = {
  key: string;
  label: string;
  taskCategoryId: string | null;
  tasks: TaskBoardTask[];
};

function buildTaskBoardColumns(
  categories: TaskBoardCategory[],
  tasks: TaskBoardTask[],
  includeUncategorizedColumn: boolean,
): TaskBoardColumn[] {
  const categoryColumns = categories.map((category) => ({
    key: category.id,
    label: category.name,
    taskCategoryId: category.id,
    tasks: tasks.filter((task) => task.taskCategoryId === category.id),
  }));

  if (!includeUncategorizedColumn) {
    return categoryColumns;
  }

  return [...categoryColumns, {
      key: "uncategorized",
      label: "Uncategorized",
      taskCategoryId: null,
      tasks: tasks.filter((task) => task.taskCategoryId === null),
    }];
}

function formatTaskStatus(status: TaskStatus): string {
  return status === "in_progress"
    ? "In Progress"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function resolveTaskStatusVariant(status: TaskStatus): "outline" | "warning" | "positive" {
  if (status === "completed") {
    return "positive";
  }
  if (status === "in_progress") {
    return "warning";
  }

  return "outline";
}

function formatTaskTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function stopTaskCardPropagation(event: {
  stopPropagation(): void;
}) {
  event.stopPropagation();
}

/**
 * Renders the minimal kanban experience for the first `-ng` tasks slice, with persisted lanes and
 * drag-and-drop moves backed by the `SetTaskCategory` mutation.
 */
export function TaskBoard(props: TaskBoardProps) {
  const [dropTargetKey, setDropTargetKey] = useState("");
  const suppressOpenTaskIdRef = useRef<string | null>(null);
  const columns = buildTaskBoardColumns(props.categories, props.tasks, props.includeUncategorizedColumn ?? true);

  async function handleDrop(event: DragEvent<HTMLDivElement>, taskCategoryId: string | null, columnKey: string) {
    event.preventDefault();
    setDropTargetKey("");
    const taskId = event.dataTransfer.getData("text/task-id");
    if (!taskId) {
      return;
    }

    await props.onMoveTask(taskId, taskCategoryId);
    setDropTargetKey((currentKey) => currentKey === columnKey ? "" : currentKey);
  }

  return (
    <div className="modern-scrollbar h-full min-h-0 overflow-x-auto pb-1">
      <div className="flex h-full min-h-0 min-w-full w-fit overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm">
        {columns.map((column, columnIndex) => (
          <section
            key={column.key}
            className={`flex h-full min-h-0 w-[18rem] shrink-0 flex-col ${columnIndex === 0 ? "" : "border-l border-border/60"}`}
          >
            <CardHeader className="shrink-0 border-b border-border/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="truncate text-xs/relaxed font-medium text-foreground">
                    {column.label}
                  </div>
                  <Badge className="h-5 px-1.5 text-[0.625rem]" variant="outline">
                    {column.tasks.length}
                  </Badge>
                </div>
                <Button
                  aria-label={`Create task in ${column.label}`}
                  className="rounded-full"
                  onClick={() => {
                    props.onCreateTask(column.taskCategoryId);
                  }}
                  size="icon-xs"
                  type="button"
                  variant="ghost"
                >
                  <PlusIcon className="size-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent
              className={`no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2.5 ${dropTargetKey === column.key ? "rounded-b-lg bg-accent/20" : ""}`}
              onDragLeave={() => {
                setDropTargetKey((currentKey) => currentKey === column.key ? "" : currentKey);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTargetKey(column.key);
              }}
              onDrop={(event) => void handleDrop(event, column.taskCategoryId, column.key)}
            >
              {column.tasks.length === 0 ? (
                <div className="flex min-h-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 text-center text-[0.7rem] leading-5 text-muted-foreground">
                  Drop tasks here.
                </div>
              ) : null}

              {column.tasks.map((task) => (
                <article
                  key={task.id}
                  className="shrink-0 cursor-grab rounded-lg border border-border/70 bg-background/95 p-2.5 shadow-sm transition hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
                  draggable
                  onClick={() => {
                    if (suppressOpenTaskIdRef.current === task.id) {
                      return;
                    }

                    props.onOpenTask(task.id);
                  }}
                  onDragStart={(event) => {
                    suppressOpenTaskIdRef.current = task.id;
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/task-id", task.id);
                  }}
                  onDragEnd={() => {
                    window.setTimeout(() => {
                      if (suppressOpenTaskIdRef.current === task.id) {
                        suppressOpenTaskIdRef.current = null;
                      }
                    }, 0);
                  }}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) {
                      return;
                    }

                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();
                    props.onOpenTask(task.id);
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 overflow-hidden text-xs font-medium leading-5 text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                        {task.name}
                      </h3>
                      <div className="shrink-0">
                        <div
                          className="flex items-center gap-1"
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
                              stopTaskCardPropagation(event);
                              void props.onExecuteTask(task.id);
                            }}
                            size="icon-xs"
                            type="button"
                            variant="ghost"
                          >
                            {props.executingTaskId === task.id
                              ? <Loader2Icon className="size-2.5 animate-spin" />
                              : <PlayIcon className="size-2.5" />}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                aria-label={`Delete ${task.name}`}
                                disabled={props.deletingTaskId === task.id}
                                onClick={(event) => {
                                  stopTaskCardPropagation(event);
                                }}
                                size="icon-xs"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2Icon className="size-2.5" />
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
                                  This will permanently delete the task and any nested child tasks.
                                  This action cannot be undone.
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
                      </div>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Badge className="h-5 px-1.5 text-[0.625rem]" variant={resolveTaskStatusVariant(task.status)}>
                        {formatTaskStatus(task.status)}
                      </Badge>
                      <span className="ml-auto shrink-0 text-[0.625rem] tabular-nums text-muted-foreground/80">
                        {formatTaskTimestamp(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </CardContent>
          </section>
        ))}
      </div>
    </div>
  );
}
