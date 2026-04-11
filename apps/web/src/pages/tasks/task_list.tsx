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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatTaskAssigneeMeta,
  formatTaskDateTime,
  formatTaskStatus,
  type TaskRecord,
  resolveTaskStatusVariant,
} from "./task_ui";

interface TaskListProps {
  deletingTaskId?: string | null;
  executingTaskId?: string | null;
  hasActiveFilters: boolean;
  onDeleteTask(taskId: string): Promise<void>;
  onExecuteTask(taskId: string): Promise<void>;
  onOpenTask(taskId: string): void;
  tasks: TaskRecord[];
}

function stopRowNavigation(event: {
  stopPropagation(): void;
}) {
  event.stopPropagation();
}

/**
 * Renders the tasks surface as a readable operations list for quick scanning, filtering, and
 * opening task detail pages without the denser kanban treatment.
 */
export function TaskList(props: TaskListProps) {
  if (props.tasks.length === 0) {
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
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/20 hover:bg-muted/20">
            <TableHead className="w-[34%] text-[0.7rem]">Task</TableHead>
            <TableHead className="text-[0.7rem]">Status</TableHead>
            <TableHead className="text-[0.7rem]">Lane</TableHead>
            <TableHead className="text-[0.7rem]">Assignee</TableHead>
            <TableHead className="text-[0.7rem]">Updated</TableHead>
            <TableHead className="w-24 text-right text-[0.7rem]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.tasks.map((task) => (
            <TableRow
              key={task.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => {
                props.onOpenTask(task.id);
              }}
            >
              <TableCell className="py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{task.name}</p>
                  {task.description ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {task.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No description</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="py-4 text-sm">
                <Badge className="h-6 px-2.5 text-[0.7rem]" variant={resolveTaskStatusVariant(task.status)}>
                  {formatTaskStatus(task.status)}
                </Badge>
              </TableCell>
              <TableCell className="py-4 text-sm text-muted-foreground">
                {task.taskCategoryName ? (
                  <Badge className="h-6 px-2.5 text-[0.7rem]" variant="outline">
                    {task.taskCategoryName}
                  </Badge>
                ) : (
                  "Uncategorized"
                )}
              </TableCell>
              <TableCell className="py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{task.assignee?.name ?? "Unassigned"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTaskAssigneeMeta(task.assignee)}</p>
                </div>
              </TableCell>
              <TableCell className="py-4 text-sm text-muted-foreground">
                {formatTaskDateTime(task.updatedAt, "Unknown")}
              </TableCell>
              <TableCell className="py-4 text-right">
                <div
                  className="flex items-center justify-end gap-1"
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
