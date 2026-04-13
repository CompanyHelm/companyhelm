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

interface TaskCategoryDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onCreate(name: string): Promise<void>;
  onOpenChange(open: boolean): void;
}

/**
 * Collects the single persisted field needed to create a new task category from settings without
 * crowding the primary list view.
 */
export function TaskCategoryDialog(props: TaskCategoryDialogProps) {
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    if (!props.isOpen) {
      setCategoryName("");
    }
  }, [props.isOpen]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task category</DialogTitle>
          <DialogDescription>
            Create a new persisted kanban lane that will appear immediately on the tasks board.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <label className="text-xs font-medium text-foreground" htmlFor="task-category-name">
            Category name
          </label>
          <Input
            id="task-category-name"
            onChange={(event) => {
              setCategoryName(event.target.value);
            }}
            placeholder="Backlog"
            value={categoryName}
          />
        </div>

        {props.errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {props.errorMessage}
          </div>
        ) : null}

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
            data-primary-cta=""
            disabled={props.isSaving || categoryName.length === 0}
            onClick={async () => {
              await props.onCreate(categoryName);
            }}
            type="button"
          >
            Create category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
