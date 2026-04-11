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

type GroupDialogMode = "create" | "edit";

interface GroupDialogProps {
  errorMessage: string | null;
  initialName: string;
  isOpen: boolean;
  isSaving: boolean;
  mode: GroupDialogMode;
  onOpenChange(open: boolean): void;
  onSubmit(name: string): Promise<void>;
}

/**
 * Collects the single editable field for both creating and renaming skill groups so the management
 * page can keep list actions compact while still validating through one shared flow.
 */
export function GroupDialog(props: GroupDialogProps) {
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (props.isOpen) {
      setGroupName(props.initialName);
      return;
    }

    setGroupName("");
  }, [props.initialName, props.isOpen]);

  const isEditing = props.mode === "edit";
  const title = isEditing ? "Rename skill group" : "Create skill group";
  const description = isEditing
    ? "Update the group name without changing which skills are already assigned to it."
    : "Add a folder-like group that skills can be moved into from the catalog or from a skill detail page.";
  const submitLabel = isEditing ? "Save changes" : "Create group";

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <label className="text-xs font-medium text-foreground" htmlFor="skill-group-name">
            Group name
          </label>
          <Input
            id="skill-group-name"
            onChange={(event) => {
              setGroupName(event.target.value);
            }}
            placeholder="Automation"
            value={groupName}
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
            disabled={props.isSaving || groupName.length === 0}
            onClick={async () => {
              await props.onSubmit(groupName);
            }}
            type="button"
          >
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
