import { useRef, useState, type DragEvent } from "react";
import { Loader2Icon, PlayIcon, Trash2Icon } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatTaskStatus,
  formatTaskTimestamp,
  type TaskCategoryRecord,
  type TaskRecord,
  resolveTaskStatusVariant,
} from "./task_ui";

interface TaskBoardProps {
  categories: TaskCategoryRecord[];
  deletingTaskId?: string | null;
  executingTaskId?: string | null;
  onDeleteTask(taskId: string): Promise<void>;
  onExecuteTask(taskId: string): Promise<void>;
  tasks: TaskRecord[];
  includeUncategorizedColumn?: boolean;
  onMoveTask(taskId: string, taskCategoryId: string | null): Promise<void>;
  onOpenTask(taskId: string): void;
}

type TaskBoardColumn = {
  key: string;
  label: string;
  taskCategoryId: string | null;
  tasks: TaskRecord[];
};

function buildTaskBoardColumns(
  categories: TaskCategoryRecord[],
  tasks: TaskRecord[],
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
    <div className="flex h-full min-h-0 overflow-x-auto pb-2">
      <div className="flex h-full min-h-0 min-w-full gap-4">
        {columns.map((column) => (
          <Card
            key={column.key}
            className="flex h-full min-h-0 w-[22rem] shrink-0 flex-col border border-border/60 bg-card/85 shadow-sm"
          >
            <CardHeader className="shrink-0 border-b border-border/60 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base font-semibold tracking-tight">{column.label}</CardTitle>
                <Badge className="h-6 px-2.5 text-[0.7rem]" variant="outline">
                  {column.tasks.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent
              className={`no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 ${dropTargetKey === column.key ? "rounded-b-xl bg-accent/30" : ""}`}
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
                <div className="flex min-h-32 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center text-sm leading-6 text-muted-foreground">
                  Drop tasks here.
                </div>
              ) : null}

              {column.tasks.map((task) => (
                <article
                  key={task.id}
                  className="min-h-44 shrink-0 cursor-grab rounded-2xl border border-border/70 bg-background/95 p-4 shadow-sm transition hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-[0.95rem] font-semibold leading-6 text-foreground">{task.name}</h3>
                        <Badge className="mt-2 h-6 px-2.5 text-[0.7rem]" variant={resolveTaskStatusVariant(task.status)}>
                          {formatTaskStatus(task.status)}
                        </Badge>
                      </div>
                      <div
                        className="flex shrink-0 items-center gap-1"
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
                            ? <Loader2Icon className="size-3.5 animate-spin" />
                            : <PlayIcon className="size-3.5" />}
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
                              <Trash2Icon className="size-3.5" />
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
                    {task.description ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{task.description}</p>
                    ) : (
                      <div className="mt-3 flex-1" />
                    )}
                    {task.assignee ? (
                      <p className="mt-3 truncate text-xs text-muted-foreground">
                        Assigned to {task.assignee.name}
                      </p>
                    ) : null}
                    <p className="mt-auto pt-4 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                      Created {formatTaskTimestamp(task.createdAt)}
                    </p>
                  </div>
                </article>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
