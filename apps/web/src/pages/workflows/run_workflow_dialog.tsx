import { useEffect, useMemo, useState } from "react";
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
import type { WorkflowRecord } from "./workflow_types";

export type WorkflowRunAgentRecord = {
  id: string;
  name: string;
};

type WorkflowRunInputValue = {
  name: string;
  value: string;
};

interface RunWorkflowDialogProps {
  agents: WorkflowRunAgentRecord[];
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  workflow: WorkflowRecord | null;
  onOpenChange(open: boolean): void;
  onRun(input: {
    agentId: string;
    inputValues: WorkflowRunInputValue[];
    workflowDefinitionId: string;
  }): Promise<void>;
}

/**
 * Collects launch-time workflow values without storing them as separate run inputs. The backend
 * resolves these values into the workflow and step templates before the agent session starts.
 */
export function RunWorkflowDialog(props: RunWorkflowDialogProps) {
  const [agentId, setAgentId] = useState("");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!props.isOpen || !props.workflow) {
      setAgentId("");
      setInputValues({});
      return;
    }

    setAgentId(props.agents[0]?.id ?? "");
    setInputValues(Object.fromEntries(
      props.workflow.inputs.map((input) => [input.name, input.defaultValue]),
    ));
  }, [props.agents, props.isOpen, props.workflow]);

  const canRun = useMemo(() => {
    return props.workflow !== null
      && agentId.length > 0
      && props.workflow.inputs.every((input) => {
        return !input.isRequired || /\S/u.test(inputValues[input.name] ?? "");
      });
  }, [agentId, inputValues, props.workflow]);

  function updateInputValue(name: string, value: string): void {
    setInputValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="w-[min(94vw,34rem)]">
        <DialogHeader>
          <DialogTitle>Run workflow</DialogTitle>
          <DialogDescription>
            Pick the agent and provide values used to render the workflow instructions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="workflow-run-agent">
              Agent
            </label>
            <Select
              items={props.agents.map((agent) => ({
                label: agent.name,
                value: agent.id,
              }))}
              onValueChange={(value) => {
                setAgentId(value ?? "");
              }}
              value={agentId}
            >
              <SelectTrigger id="workflow-run-agent">
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

          {props.workflow?.inputs.length ? (
            <div className="grid gap-3">
              {props.workflow.inputs.map((input) => (
                <div className="grid gap-2" key={input.id}>
                  <label className="text-sm font-medium text-foreground" htmlFor={`workflow-run-input-${input.id}`}>
                    {input.name}
                    {input.isRequired ? <span className="text-destructive"> *</span> : null}
                  </label>
                  <Input
                    id={`workflow-run-input-${input.id}`}
                    onChange={(event) => {
                      updateInputValue(input.name, event.target.value);
                    }}
                    placeholder={input.description || "Value"}
                    value={inputValues[input.name] ?? ""}
                  />
                  {input.description.length > 0 ? (
                    <p className="text-xs text-muted-foreground">{input.description}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

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
            disabled={props.isSaving || !canRun}
            onClick={async () => {
              if (!props.workflow) {
                return;
              }

              await props.onRun({
                agentId,
                inputValues: props.workflow.inputs.map((input) => ({
                  name: input.name,
                  value: inputValues[input.name] ?? "",
                })),
                workflowDefinitionId: props.workflow.id,
              });
            }}
            type="button"
          >
            {props.isSaving ? "Starting..." : "Run workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
