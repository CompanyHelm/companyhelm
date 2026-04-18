import { Loader2Icon, PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AssignTaskExecutionDialogAgent = {
  id: string;
  name: string;
};

interface AssignTaskExecutionDialogProps {
  agents: AssignTaskExecutionDialogAgent[];
  errorMessage?: string | null;
  isOpen: boolean;
  isSaving: boolean;
  onAssignAndExecute(agentId: string): Promise<void>;
  onOpenChange(open: boolean): void;
  taskName: string;
}

/**
 * Gives unassigned task execution a focused handoff point: the user picks the agent that should
 * become the task assignee, then the same action starts the execution run for that agent.
 */
export function AssignTaskExecutionDialog(props: AssignTaskExecutionDialogProps) {
  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="w-[min(92vw,32rem)]">
        <DialogHeader>
          <DialogTitle>Assign agent and execute</DialogTitle>
          <DialogDescription>
            Choose the agent that should own and execute "{props.taskName}".
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {props.agents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
              Create an agent before executing an unassigned task.
            </div>
          ) : null}

          {props.agents.map((agent) => (
            <Button
              key={agent.id}
              className="h-auto justify-between gap-3 whitespace-normal rounded-lg border-border/70 px-3 py-2 text-left"
              disabled={props.isSaving}
              onClick={() => {
                void props.onAssignAndExecute(agent.id);
              }}
              type="button"
              variant="outline"
            >
              <span className="min-w-0 flex-1 truncate">{agent.name}</span>
              {props.isSaving ? (
                <Loader2Icon data-icon="inline-end" className="animate-spin" />
              ) : (
                <PlayIcon data-icon="inline-end" />
              )}
            </Button>
          ))}
        </div>

        {props.errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {props.errorMessage}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            disabled={props.isSaving}
            onClick={() => {
              props.onOpenChange(false);
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
