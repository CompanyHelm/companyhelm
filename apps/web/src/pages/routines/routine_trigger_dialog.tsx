import { useEffect, useState } from "react";
import { ClockIcon } from "lucide-react";
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

export type RoutineTriggerDialogRecord = {
  cronPattern: string;
  enabled: boolean;
  id: string;
};

interface RoutineTriggerDialogProps {
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  routineId: string | null;
  trigger: RoutineTriggerDialogRecord | null;
  onOpenChange(open: boolean): void;
  onSave(input: {
    cronPattern: string;
    enabled: boolean;
    id?: string;
    routineId?: string;
  }): Promise<void>;
}

/**
 * Captures one cron trigger definition. The trigger remains cron-specific so later trigger types
 * can add separate dialogs without weakening this form's validation.
 */
export function RoutineTriggerDialog(props: RoutineTriggerDialogProps) {
  const [cronPattern, setCronPattern] = useState("0 9 * * 1-5");
  const [enabled, setEnabled] = useState(true);
  const isEditing = props.trigger !== null;

  useEffect(() => {
    if (!props.isOpen) {
      setCronPattern("0 9 * * 1-5");
      setEnabled(true);
      return;
    }

    setCronPattern(props.trigger?.cronPattern ?? "0 9 * * 1-5");
    setEnabled(props.trigger?.enabled ?? true);
  }, [props.isOpen, props.trigger]);

  const isSaveDisabled = props.isSaving
    || cronPattern.length === 0
    || (!isEditing && !props.routineId);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit cron trigger" : "Add cron trigger"}</DialogTitle>
          <DialogDescription>
            Configure when this routine should queue its instructions for the assigned agent.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="routine-trigger-cron">
              Cron pattern
            </label>
            <Input
              id="routine-trigger-cron"
              onChange={(event) => {
                setCronPattern(event.target.value);
              }}
              placeholder="0 9 * * 1-5"
              value={cronPattern}
            />
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" />
              Uses standard five-field cron syntax.
            </p>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
            <input
              checked={enabled}
              className="mt-0.5 size-4 rounded border border-input bg-background"
              onChange={(event) => {
                setEnabled(event.target.checked);
              }}
              type="checkbox"
            />
            <span className="grid gap-1">
              <span className="text-xs font-medium text-foreground">Enabled</span>
              <span className="text-xs text-muted-foreground">
                Disabled triggers stay saved but are removed from the BullMQ scheduler.
              </span>
            </span>
          </label>

          {props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
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
            data-primary-cta=""
            disabled={isSaveDisabled}
            onClick={async () => {
              await props.onSave({
                cronPattern,
                enabled,
                id: props.trigger?.id,
                routineId: props.routineId ?? undefined,
              });
            }}
            type="button"
          >
            {props.isSaving ? "Saving..." : isEditing ? "Save trigger" : "Add trigger"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
