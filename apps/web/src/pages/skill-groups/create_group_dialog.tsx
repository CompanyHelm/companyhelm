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

interface CreateGroupDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onCreate(name: string): Promise<void>;
  onOpenChange(open: boolean): void;
}

/**
 * Collects the single field required to create a new skill group without adding form noise to the
 * group management list itself.
 */
export function CreateGroupDialog(props: CreateGroupDialogProps) {
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (!props.isOpen) {
      setGroupName("");
    }
  }, [props.isOpen]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create skill group</DialogTitle>
          <DialogDescription>
            Add a folder-like group that skills can be moved into from the catalog or from a skill
            detail page.
          </DialogDescription>
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
              await props.onCreate(groupName);
            }}
            type="button"
          >
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
