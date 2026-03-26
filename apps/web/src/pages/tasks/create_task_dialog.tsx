import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TaskStatus = "draft" | "pending" | "in_progress" | "completed";

export type CreateTaskDialogCategory = {
  id: string;
  name: string;
};

interface CreateTaskDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  categories: CreateTaskDialogCategory[];
  onCreate(input: {
    name: string;
    description?: string;
    status: TaskStatus;
    taskCategoryId?: string;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
}

const uncategorizedValue = "__uncategorized__";

/**
 * Collects the minimal task fields needed for the first `-ng` task-management slice: title,
 * optional description, status, and optional kanban category.
 */
export function CreateTaskDialog(props: CreateTaskDialogProps) {
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("draft");
  const [taskCategoryId, setTaskCategoryId] = useState(uncategorizedValue);

  useEffect(() => {
    if (!props.isOpen) {
      setTaskName("");
      setTaskDescription("");
      setTaskStatus("draft");
      setTaskCategoryId(uncategorizedValue);
    }
  }, [props.isOpen]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a new task and optionally place it into one of the configured kanban lanes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="task-name">
              Name
            </label>
            <Input
              id="task-name"
              onChange={(event) => {
                setTaskName(event.target.value);
              }}
              placeholder="Write launch announcement"
              value={taskName}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="task-category">
              Category
            </label>
            <Select
              items={[
                { label: "Uncategorized", value: uncategorizedValue },
                ...props.categories.map((category) => ({
                  label: category.name,
                  value: category.id,
                })),
              ]}
              onValueChange={(value) => {
                setTaskCategoryId(value);
              }}
              value={taskCategoryId}
            >
              <SelectTrigger id="task-category">
                <SelectValue placeholder="Select a lane" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={uncategorizedValue}>Uncategorized</SelectItem>
                {props.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="task-status">
              Status
            </label>
            <Select
              items={[
                { label: "Draft", value: "draft" },
                { label: "Pending", value: "pending" },
                { label: "In Progress", value: "in_progress" },
                { label: "Completed", value: "completed" },
              ]}
              onValueChange={(value) => {
                setTaskStatus(value as TaskStatus);
              }}
              value={taskStatus}
            >
              <SelectTrigger id="task-status">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="task-description">
              Description
            </label>
            <textarea
              id="task-description"
              onChange={(event) => {
                setTaskDescription(event.target.value);
              }}
              placeholder="Optional delivery notes or acceptance detail."
              rows={5}
              value={taskDescription}
              className="min-h-28 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          {props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            disabled={props.isSaving || taskName.length === 0}
            onClick={async () => {
              await props.onCreate({
                name: taskName,
                description: taskDescription.length > 0 ? taskDescription : undefined,
                status: taskStatus,
                taskCategoryId: taskCategoryId === uncategorizedValue ? undefined : taskCategoryId,
              });
            }}
            type="button"
          >
            {props.isSaving ? "Creating..." : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
