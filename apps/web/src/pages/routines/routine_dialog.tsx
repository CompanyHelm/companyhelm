import { useEffect, useState } from "react";
import { BotIcon } from "lucide-react";
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

export type RoutineDialogAgent = {
  id: string;
  name: string;
};

export type RoutineDialogRecord = {
  assignedAgentId: string;
  enabled: boolean;
  id: string;
  instructions: string;
  name: string;
};

interface RoutineDialogProps {
  agents: RoutineDialogAgent[];
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  routine: RoutineDialogRecord | null;
  onOpenChange(open: boolean): void;
  onSave(input: {
    assignedAgentId: string;
    enabled: boolean;
    id?: string;
    instructions: string;
    name: string;
  }): Promise<void>;
}

/**
 * Collects the durable routine prompt and its owning agent. Sessions are intentionally omitted here
 * because the backend creates or reuses the sticky session when the routine actually runs.
 */
export function RoutineDialog(props: RoutineDialogProps) {
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [instructions, setInstructions] = useState("");
  const [name, setName] = useState("");
  const isEditing = props.routine !== null;

  useEffect(() => {
    if (!props.isOpen) {
      setAssignedAgentId("");
      setEnabled(true);
      setInstructions("");
      setName("");
      return;
    }

    setAssignedAgentId(props.routine?.assignedAgentId ?? props.agents[0]?.id ?? "");
    setEnabled(props.routine?.enabled ?? true);
    setInstructions(props.routine?.instructions ?? "");
    setName(props.routine?.name ?? "");
  }, [props.agents, props.isOpen, props.routine]);

  const isSaveDisabled = props.isSaving
    || name.length === 0
    || instructions.length === 0
    || assignedAgentId.length === 0;

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit routine" : "Create routine"}</DialogTitle>
          <DialogDescription>
            Save reusable instructions and choose the agent that should run them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="routine-name">
              Name
            </label>
            <Input
              id="routine-name"
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="Daily research digest"
              value={name}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="routine-agent">
              Agent
            </label>
            <Select
              items={props.agents.map((agent) => ({
                label: agent.name,
                value: agent.id,
              }))}
              onValueChange={(value) => {
                setAssignedAgentId(value ?? "");
              }}
              value={assignedAgentId}
            >
              <SelectTrigger id="routine-agent">
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {props.agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <span className="inline-flex items-center gap-2">
                      <BotIcon className="size-3.5 text-muted-foreground" />
                      {agent.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="routine-instructions">
              Instructions
            </label>
            <textarea
              className="min-h-40 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm leading-6 outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              id="routine-instructions"
              onChange={(event) => {
                setInstructions(event.target.value);
              }}
              placeholder="Review the latest customer updates and summarize the important follow-ups."
              rows={7}
              value={instructions}
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
                Disabled routines keep their definitions but do not run from cron triggers.
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
                assignedAgentId,
                enabled,
                id: props.routine?.id,
                instructions,
                name,
              });
            }}
            type="button"
          >
            {props.isSaving ? "Saving..." : isEditing ? "Save routine" : "Create routine"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
