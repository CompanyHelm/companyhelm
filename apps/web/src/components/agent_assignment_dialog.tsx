import { useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import {
  AgentAssignmentSelection,
  type AgentAssignmentAgent,
} from "@/lib/agent_assignment_selection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AgentAssignmentResourceKind = "MCP server" | "secret" | "skill";

export type AgentAssignmentResource = {
  id: string;
  name: string;
};

interface AgentAssignmentDialogProps {
  agents: AgentAssignmentAgent[];
  errorMessage: string | null;
  isAssigning: boolean;
  isOpen: boolean;
  resourceKind: AgentAssignmentResourceKind;
  resources: AgentAssignmentResource[];
  onAssign(agentIds: string[]): Promise<void>;
  onOpenChange(open: boolean): void;
}

/**
 * Offers the same post-create assignment step for every agent resource type. New resources default
 * to all agents so the safest path is one confirmation, while the checkbox list keeps selective
 * rollouts explicit when a secret, skill, or MCP server should only be available to certain agents.
 */
export function AgentAssignmentDialog(props: AgentAssignmentDialogProps) {
  const selection = useMemo(() => new AgentAssignmentSelection(), []);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const resourceCount = props.resources.length;
  const hasAgents = props.agents.length > 0;
  const areAllAgentsSelected = selection.areAllSelected(
    selectedAgentIds,
    props.agents,
  );
  const resourceLabel =
    resourceCount === 1 ? props.resourceKind : `${props.resourceKind}s`;

  useEffect(() => {
    if (!props.isOpen) {
      return;
    }

    setSelectedAgentIds(selection.selectAll(props.agents));
  }, [props.agents, props.isOpen, props.resources, selection]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="flex max-h-[min(88vh,44rem)] w-[min(92vw,34rem)] flex-col overflow-hidden p-0 sm:max-h-[min(88vh,48rem)]">
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>Add {resourceLabel} to agents?</DialogTitle>
          <DialogDescription>
            {resourceCount === 1 ? (
              <>
                {props.resources[0]?.name} was added. Select which agents should
                receive this {props.resourceKind} as a default.
              </>
            ) : (
              <>
                {resourceCount} {resourceLabel} were added. Select which agents
                should receive them as defaults.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 pb-6">
          {props.errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
            </div>
          ) : null}

          {hasAgents ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {selectedAgentIds.length} of {props.agents.length} agents
                  selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    disabled={props.isAssigning || areAllAgentsSelected}
                    onClick={() => {
                      setSelectedAgentIds(selection.selectAll(props.agents));
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Select all
                  </Button>
                  <Button
                    disabled={
                      props.isAssigning || selectedAgentIds.length === 0
                    }
                    onClick={() => {
                      setSelectedAgentIds(selection.deselectAll());
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Deselect all
                  </Button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="grid gap-2">
                  {props.agents.map((agent) => {
                    const inputId = `agent-assignment-${agent.id}`;
                    const isChecked = selectedAgentIds.includes(agent.id);
                    return (
                      <label
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm transition hover:bg-muted/30"
                        htmlFor={inputId}
                        key={agent.id}
                      >
                        <input
                          checked={isChecked}
                          className="size-4 rounded border-border accent-primary"
                          disabled={props.isAssigning}
                          id={inputId}
                          onChange={() => {
                            setSelectedAgentIds((currentSelectedAgentIds) => {
                              return selection.toggleAgent(
                                currentSelectedAgentIds,
                                agent.id,
                                props.agents,
                              );
                            });
                          }}
                          type="checkbox"
                        />
                        <span className="min-w-0 truncate font-medium text-foreground">
                          {agent.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
              There are no agents yet. Create an agent first, then attach this{" "}
              {props.resourceKind} from the agent page.
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 px-6 pb-6">
          <Button
            disabled={props.isAssigning}
            onClick={() => props.onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Skip
          </Button>
          <Button
            disabled={props.isAssigning || selectedAgentIds.length === 0}
            onClick={() => {
              void props.onAssign(selectedAgentIds);
            }}
            type="button"
          >
            {props.isAssigning ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
            Add to selected agents
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
