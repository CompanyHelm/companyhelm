import { useState } from "react";
import { MonitorIcon, PlayIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { AmplitudeAnalytics } from "@/lib/amplitude_analytics";
import { cn } from "@/lib/utils";

export type EnvironmentActionRecord = {
  id: string;
  provider: string;
  status: string;
};

interface EnvironmentActionsProps {
  actingEnvironmentId: string | null;
  className?: string;
  deletingEnvironmentId: string | null;
  environment: EnvironmentActionRecord;
  onDelete: (environmentId: string, force: boolean) => Promise<void>;
  onOpenDesktop: (environmentId: string) => Promise<void>;
  onStart: (environmentId: string) => Promise<void>;
  onStop: (environmentId: string) => Promise<void>;
  size?: "icon" | "icon-sm";
}

interface DeleteEnvironmentDialogProps {
  actingEnvironmentId: string | null;
  deletingEnvironmentId: string | null;
  environment: EnvironmentActionRecord;
  onDelete: (environmentId: string, force: boolean) => Promise<void>;
  size: "icon" | "icon-sm";
}

function canStartEnvironment(status: string): boolean {
  return status === "stopped" || status === "available";
}

function canStopEnvironment(status: string): boolean {
  return status === "running";
}

function canOpenDesktop(environment: EnvironmentActionRecord): boolean {
  if (environment.provider !== "e2b") {
    return false;
  }

  return environment.status === "available"
    || environment.status === "running"
    || environment.status === "stopped";
}

/**
 * Wraps the destructive environment removal confirmation so callers can reuse the same flow
 * across the table and chat settings without duplicating button order or force-delete copy.
 */
function DeleteEnvironmentDialog(props: DeleteEnvironmentDialogProps) {
  const [forceDelete, setForceDelete] = useState(false);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          aria-label="Delete environment"
          disabled={
            props.actingEnvironmentId === props.environment.id
            || props.deletingEnvironmentId === props.environment.id
          }
          size={props.size}
          title="Delete environment"
          variant="ghost"
        >
          <Trash2Icon className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete environment</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the CompanyHelm environment record and tear down the
            backing compute environment. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
          <input
            checked={forceDelete}
            className="mt-0.5 h-4 w-4 rounded border-border bg-background"
            onChange={(event) => {
              setForceDelete(event.target.checked);
            }}
            type="checkbox"
          />
          <span className="space-y-1">
            <span className="block font-medium text-foreground">Force delete</span>
            <span className="block text-xs leading-relaxed text-muted-foreground">
              Ignore provider teardown errors and remove only the CompanyHelm record from the local
              database.
            </span>
          </span>
        </label>
        <AlertDialogFooter>
          <AlertDialogCancelAction asChild>
            <AlertDialogCancelButton
              onClick={() => {
                setForceDelete(false);
              }}
              variant="outline"
            >
              Cancel
            </AlertDialogCancelButton>
          </AlertDialogCancelAction>
          <AlertDialogPrimaryAction asChild>
            <AlertDialogActionButton
              disabled={
                props.actingEnvironmentId === props.environment.id
                || props.deletingEnvironmentId === props.environment.id
              }
              onClick={async () => {
                AmplitudeAnalytics.trackEnvironmentAction({
                  action: "delete",
                  environmentId: props.environment.id,
                  force: forceDelete,
                  provider: props.environment.provider,
                  status: props.environment.status,
                });
                await props.onDelete(props.environment.id, forceDelete);
                setForceDelete(false);
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogActionButton>
          </AlertDialogPrimaryAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Renders the canonical environment action set in a stable order so every surface exposes the
 * same desktop, lifecycle, and deletion controls for a given environment.
 */
export function EnvironmentActions(props: EnvironmentActionsProps) {
  const size = props.size ?? "icon";
  const isDisabled = props.actingEnvironmentId === props.environment.id
    || props.deletingEnvironmentId === props.environment.id;

  return (
    <div className={cn("flex items-center gap-1", props.className)}>
      {canOpenDesktop(props.environment) ? (
        <Button
          aria-label="Open desktop"
          disabled={isDisabled}
          onClick={async () => {
            AmplitudeAnalytics.trackEnvironmentAction({
              action: "open_desktop",
              environmentId: props.environment.id,
              provider: props.environment.provider,
              status: props.environment.status,
            });
            await props.onOpenDesktop(props.environment.id);
          }}
          size={size}
          title="Open desktop"
          variant="ghost"
        >
          <MonitorIcon className="h-4 w-4" />
        </Button>
      ) : null}
      {canStartEnvironment(props.environment.status) ? (
        <Button
          aria-label="Start environment"
          disabled={isDisabled}
          onClick={async () => {
            AmplitudeAnalytics.trackEnvironmentAction({
              action: "start",
              environmentId: props.environment.id,
              provider: props.environment.provider,
              status: props.environment.status,
            });
            await props.onStart(props.environment.id);
          }}
          size={size}
          title="Start environment"
          variant="ghost"
        >
          <PlayIcon className="h-4 w-4" />
        </Button>
      ) : null}
      {canStopEnvironment(props.environment.status) ? (
        <Button
          aria-label="Stop environment"
          disabled={isDisabled}
          onClick={async () => {
            AmplitudeAnalytics.trackEnvironmentAction({
              action: "stop",
              environmentId: props.environment.id,
              provider: props.environment.provider,
              status: props.environment.status,
            });
            await props.onStop(props.environment.id);
          }}
          size={size}
          title="Stop environment"
          variant="ghost"
        >
          <SquareIcon className="h-4 w-4" />
        </Button>
      ) : null}
      <DeleteEnvironmentDialog
        actingEnvironmentId={props.actingEnvironmentId}
        deletingEnvironmentId={props.deletingEnvironmentId}
        environment={props.environment}
        onDelete={props.onDelete}
        size={size}
      />
    </div>
  );
}
