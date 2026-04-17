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
  endAt: string | null;
  id: string;
  limit: number | null;
  startAt: string | null;
  timezone: string;
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
    endAt?: string | null;
    id?: string;
    limit?: number | null;
    routineId?: string;
    startAt?: string | null;
    timezone: string;
  }): Promise<void>;
}

function formatDatetimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}T${hour}:${minute}`;
}

function parseDatetimeLocalValue(value: string): string | null {
  if (value.length === 0) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid trigger date.");
  }

  return date.toISOString();
}

/**
 * Captures one cron trigger definition and optional run bounds. The trigger remains cron-specific
 * so later trigger types can add separate dialogs without weakening this form's validation.
 */
export function RoutineTriggerDialog(props: RoutineTriggerDialogProps) {
  const [cronPattern, setCronPattern] = useState("0 9 * * 1-5");
  const [enabled, setEnabled] = useState(true);
  const [endAt, setEndAt] = useState("");
  const [limit, setLimit] = useState("");
  const [startAt, setStartAt] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const isEditing = props.trigger !== null;

  useEffect(() => {
    if (!props.isOpen) {
      setCronPattern("0 9 * * 1-5");
      setEnabled(true);
      setEndAt("");
      setLimit("");
      setStartAt("");
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
      return;
    }

    setCronPattern(props.trigger?.cronPattern ?? "0 9 * * 1-5");
    setEnabled(props.trigger?.enabled ?? true);
    setEndAt(formatDatetimeLocalValue(props.trigger?.endAt ?? null));
    setLimit(props.trigger?.limit === null || props.trigger?.limit === undefined ? "" : String(props.trigger.limit));
    setStartAt(formatDatetimeLocalValue(props.trigger?.startAt ?? null));
    setTimezone(props.trigger?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
  }, [props.isOpen, props.trigger]);

  const isSaveDisabled = props.isSaving
    || cronPattern.length === 0
    || timezone.length === 0
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

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="routine-trigger-timezone">
              Timezone
            </label>
            <Input
              id="routine-trigger-timezone"
              onChange={(event) => {
                setTimezone(event.target.value);
              }}
              placeholder="America/Los_Angeles"
              value={timezone}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="routine-trigger-start">
                Start at
              </label>
              <Input
                id="routine-trigger-start"
                onChange={(event) => {
                  setStartAt(event.target.value);
                }}
                type="datetime-local"
                value={startAt}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="routine-trigger-end">
                End at
              </label>
              <Input
                id="routine-trigger-end"
                onChange={(event) => {
                  setEndAt(event.target.value);
                }}
                type="datetime-local"
                value={endAt}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="routine-trigger-limit">
              Run limit
            </label>
            <Input
              id="routine-trigger-limit"
              min={1}
              onChange={(event) => {
                setLimit(event.target.value);
              }}
              placeholder="No limit"
              type="number"
              value={limit}
            />
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
                endAt: parseDatetimeLocalValue(endAt),
                id: props.trigger?.id,
                limit: limit.length > 0 ? Number(limit) : null,
                routineId: props.routineId ?? undefined,
                startAt: parseDatetimeLocalValue(startAt),
                timezone,
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
