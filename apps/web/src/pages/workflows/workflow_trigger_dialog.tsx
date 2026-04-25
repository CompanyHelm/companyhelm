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
import { WorkflowSchedule } from "./workflow_schedule";
import { WorkflowScheduleBuilder } from "./workflow_schedule_builder";
import type { WorkflowCronTriggerRecord, WorkflowRecord } from "./workflow_types";

export type WorkflowTriggerAgentRecord = {
  id: string;
  name: string;
};

export type WorkflowTriggerDraft = {
  agentId: string;
  cronPattern: string;
  enabled: boolean;
  inputValues: Array<{ name: string; value: string }>;
  timezone: string;
  workflowDefinitionId: string;
};

interface WorkflowTriggerDialogProps {
  agents: WorkflowTriggerAgentRecord[];
  errorMessage: string | null;
  isOpen: boolean;
  isSaving: boolean;
  trigger: WorkflowCronTriggerRecord | null;
  workflow: WorkflowRecord;
  onOpenChange(open: boolean): void;
  onSave(draft: WorkflowTriggerDraft): Promise<void>;
}

/**
 * Captures the launch configuration for scheduled workflow runs. Trigger input values are stored
 * separately from workflow defaults so schedule-specific values do not rewrite the definition.
 */
export function WorkflowTriggerDialog(props: WorkflowTriggerDialogProps) {
  const [agentId, setAgentId] = useState("");
  const [cronPattern, setCronPattern] = useState("");
  const [enabledValue, setEnabledValue] = useState("enabled");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [timezone, setTimezone] = useState("");
  const isEditing = props.trigger !== null;

  useEffect(() => {
    if (!props.isOpen) {
      setAgentId("");
      setCronPattern("");
      setEnabledValue("enabled");
      setInputValues({});
      setTimezone("");
      return;
    }

    setAgentId(props.trigger?.agentId ?? props.agents[0]?.id ?? "");
    setCronPattern(props.trigger?.cronPattern ?? WorkflowSchedule.createDefaultCronPattern());
    setEnabledValue(props.trigger?.enabled === false ? "disabled" : "enabled");
    setTimezone(props.trigger?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC");
    const triggerValues = new Map(props.trigger?.inputValues.map((inputValue) => [
      inputValue.name,
      inputValue.value,
    ]));
    setInputValues(Object.fromEntries(
      props.workflow.inputs.map((input) => [input.name, triggerValues.get(input.name) ?? input.defaultValue]),
    ));
  }, [props.agents, props.isOpen, props.trigger, props.workflow.inputs]);

  const canSave = useMemo(() => {
    return agentId.length > 0
      && /\S/u.test(cronPattern)
      && /\S/u.test(timezone)
      && props.workflow.inputs.every((input) => {
        return !input.isRequired || /\S/u.test(inputValues[input.name] ?? "");
      });
  }, [agentId, cronPattern, inputValues, props.workflow.inputs, timezone]);

  function updateInputValue(name: string, value: string): void {
    setInputValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="w-[min(94vw,38rem)]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit schedule" : "Create schedule"}</DialogTitle>
          <DialogDescription>
            Configure when this workflow should run and which agent should execute it.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-agent">
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
              <SelectTrigger id="workflow-trigger-agent">
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

          <WorkflowScheduleBuilder
            cronPattern={cronPattern}
            onCronPatternChange={setCronPattern}
            onTimezoneChange={setTimezone}
            timezone={timezone}
          />

          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="workflow-trigger-enabled">
              State
            </label>
            <Select
              items={[
                { label: "Enabled", value: "enabled" },
                { label: "Disabled", value: "disabled" },
              ]}
              onValueChange={(value) => {
                setEnabledValue(value ?? "enabled");
              }}
              value={enabledValue}
            >
              <SelectTrigger id="workflow-trigger-enabled">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Enabled</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {props.workflow.inputs.length ? (
            <div className="grid gap-3">
              {props.workflow.inputs.map((input) => (
                <div className="grid gap-2" key={input.id}>
                  <label className="text-sm font-medium text-foreground" htmlFor={`workflow-trigger-input-${input.id}`}>
                    {input.name}
                    {input.isRequired ? <span className="text-destructive"> *</span> : null}
                  </label>
                  <Input
                    id={`workflow-trigger-input-${input.id}`}
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
            disabled={props.isSaving || !canSave}
            onClick={async () => {
              await props.onSave({
                agentId,
                cronPattern,
                enabled: enabledValue === "enabled",
                inputValues: props.workflow.inputs.map((input) => ({
                  name: input.name,
                  value: inputValues[input.name] ?? "",
                })),
                timezone,
                workflowDefinitionId: props.workflow.id,
              });
            }}
            type="button"
          >
            {isEditing ? "Save schedule" : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
