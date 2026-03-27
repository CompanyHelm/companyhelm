import { useState, type DragEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TaskStatus = "draft" | "pending" | "in_progress" | "completed";

export type TaskBoardTask = {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  taskCategoryId: string | null;
  taskCategoryName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskBoardCategory = {
  id: string;
  name: string;
};

interface TaskBoardProps {
  categories: TaskBoardCategory[];
  tasks: TaskBoardTask[];
  onMoveTask(taskId: string, taskCategoryId: string | null): Promise<void>;
}

type TaskBoardColumn = {
  key: string;
  label: string;
  taskCategoryId: string | null;
  tasks: TaskBoardTask[];
};

function buildTaskBoardColumns(categories: TaskBoardCategory[], tasks: TaskBoardTask[]): TaskBoardColumn[] {
  const categoryColumns = categories.map((category) => ({
    key: category.id,
    label: category.name,
    taskCategoryId: category.id,
    tasks: tasks.filter((task) => task.taskCategoryId === category.id),
  }));

  return [
    ...categoryColumns,
    {
      key: "uncategorized",
      label: "Uncategorized",
      taskCategoryId: null,
      tasks: tasks.filter((task) => task.taskCategoryId === null),
    },
  ];
}

function formatTaskStatus(status: TaskStatus): string {
  return status === "in_progress"
    ? "In Progress"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

function resolveTaskStatusVariant(status: TaskStatus): "outline" | "secondary" | "positive" {
  if (status === "completed") {
    return "positive";
  }
  if (status === "in_progress") {
    return "secondary";
  }

  return "outline";
}

function formatTaskTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

/**
 * Renders the minimal kanban experience for the first `-ng` tasks slice, with persisted lanes and
 * drag-and-drop moves backed by the `SetTaskCategory` mutation.
 */
export function TaskBoard(props: TaskBoardProps) {
  const [dropTargetKey, setDropTargetKey] = useState("");
  const columns = buildTaskBoardColumns(props.categories, props.tasks);

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
    <div className="flex h-full min-h-0 overflow-x-auto pb-1">
      <div className="flex min-h-0 h-full min-w-full gap-4">
        {columns.map((column) => (
          <Card
            key={column.key}
            className="flex h-full min-h-0 w-80 shrink-0 flex-col border border-border/60 bg-card/80 shadow-sm"
          >
            <CardHeader className="shrink-0 border-b border-border/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold">{column.label}</CardTitle>
                <Badge variant="outline">{column.tasks.length}</Badge>
              </div>
            </CardHeader>
            <CardContent
              className={`no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 ${dropTargetKey === column.key ? "rounded-b-lg bg-accent/30" : ""}`}
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
                <div className="flex min-h-32 shrink-0 items-center justify-center rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 text-center text-xs text-muted-foreground">
                  Drop tasks here.
                </div>
              ) : null}

              {column.tasks.map((task) => (
                <article
                  key={task.id}
                  className="h-32 shrink-0 cursor-grab rounded-xl border border-border/70 bg-background/95 p-3 shadow-sm transition hover:border-primary/40 hover:shadow-md active:cursor-grabbing"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/task-id", task.id);
                  }}
                >
                  <div className="flex h-full flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground">{task.name}</h3>
                      </div>
                      <Badge variant={resolveTaskStatusVariant(task.status)}>
                        {formatTaskStatus(task.status)}
                      </Badge>
                    </div>
                    {task.description ? (
                      <p className="mt-2 overflow-hidden text-xs/relaxed text-muted-foreground">{task.description}</p>
                    ) : (
                      <div className="mt-2 flex-1" />
                    )}
                    <p className="mt-auto text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground/80">
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
