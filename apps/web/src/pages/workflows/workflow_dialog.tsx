import { useEffect, useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import type { WorkflowInputRecord, WorkflowRecord, WorkflowStepRecord } from "./workflow_storage";

type WorkflowDialogDraft = {
  description: string;
  inputs: WorkflowInputRecord[];
  instructions: string;
  name: string;
  steps: WorkflowStepRecord[];
};

interface WorkflowDialogProps {
  isOpen: boolean;
  workflow: WorkflowRecord | null;
  onOpenChange(open: boolean): void;
  onSave(draft: WorkflowDialogDraft): void;
}

function createDraftId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function createInputDraft(): WorkflowInputRecord {
  return {
    defaultValue: "",
    description: "",
    id: createDraftId(),
    isRequired: true,
    name: "",
  };
}

function createStepDraft(): WorkflowStepRecord {
  return {
    id: createDraftId(),
    instructions: "",
    name: "",
  };
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

/**
 * Captures the workflow definition fields that can be managed before execution APIs exist. Inputs
 * and steps stay ordered by their array position so the UI maps directly to schema ordinals later.
 */
export function WorkflowDialog(props: WorkflowDialogProps) {
  const [description, setDescription] = useState("");
  const [inputs, setInputs] = useState<WorkflowInputRecord[]>([createInputDraft()]);
  const [instructions, setInstructions] = useState("");
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WorkflowStepRecord[]>([createStepDraft()]);
  const isEditing = props.workflow !== null;

  useEffect(() => {
    if (!props.isOpen) {
      setDescription("");
      setInputs([createInputDraft()]);
      setInstructions("");
      setName("");
      setSteps([createStepDraft()]);
      return;
    }

    setDescription(props.workflow?.description ?? "");
    setInputs(props.workflow?.inputs.length ? [...props.workflow.inputs] : [createInputDraft()]);
    setInstructions(props.workflow?.instructions ?? "");
    setName(props.workflow?.name ?? "");
    setSteps(props.workflow?.steps.length ? [...props.workflow.steps] : [createStepDraft()]);
  }, [props.isOpen, props.workflow]);

  const canSave = useMemo(() => {
    return name.length > 0
      && instructions.length > 0
      && inputs.every((input) => input.name.length > 0)
      && steps.every((step) => step.name.length > 0 && step.instructions.length > 0);
  }, [inputs, instructions, name, steps]);

  function updateInput(inputId: string, patch: Partial<WorkflowInputRecord>): void {
    setInputs((currentInputs) => currentInputs.map((input) => (
      input.id === inputId ? { ...input, ...patch } : input
    )));
  }

  function updateStep(stepId: string, patch: Partial<WorkflowStepRecord>): void {
    setSteps((currentSteps) => currentSteps.map((step) => (
      step.id === stepId ? { ...step, ...patch } : step
    )));
  }

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.isOpen}>
      <DialogContent className="w-[min(94vw,54rem)]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit workflow" : "Create workflow"}</DialogTitle>
          <DialogDescription>
            Define reusable instructions, the inputs it needs, and the ordered steps operators will run later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <section className="grid gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workflow-name">
                Name
              </label>
              <Input
                id="workflow-name"
                onChange={(event) => {
                  setName(event.target.value);
                }}
                placeholder="Customer onboarding"
                value={name}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workflow-description">
                Description
              </label>
              <Input
                id="workflow-description"
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
                placeholder="Prepare, verify, and hand off new customer setup."
                value={description}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="workflow-instructions">
                Instructions
              </label>
              <textarea
                className="min-h-28 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm leading-6 outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                id="workflow-instructions"
                onChange={(event) => {
                  setInstructions(event.target.value);
                }}
                placeholder="Describe how this workflow should be handled and what successful completion means."
                rows={5}
                value={instructions}
              />
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Inputs</h3>
                <p className="text-xs text-muted-foreground">Values collected before a workflow run starts.</p>
              </div>
              <Button
                onClick={() => {
                  setInputs((currentInputs) => [...currentInputs, createInputDraft()]);
                }}
                type="button"
                variant="outline"
              >
                <PlusIcon data-icon="inline-start" />
                Add input
              </Button>
            </div>

            <div className="grid gap-3">
              {inputs.map((input, inputIndex) => (
                <div className="rounded-lg border border-border/60 bg-muted/15 p-3" key={input.id}>
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`workflow-input-${input.id}`}>
                        Name
                      </label>
                      <Input
                        id={`workflow-input-${input.id}`}
                        onChange={(event) => {
                          updateInput(input.id, { name: event.target.value });
                        }}
                        placeholder="account_id"
                        value={input.name}
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`workflow-input-default-${input.id}`}>
                        Default value
                      </label>
                      <Input
                        id={`workflow-input-default-${input.id}`}
                        onChange={(event) => {
                          updateInput(input.id, { defaultValue: event.target.value });
                        }}
                        placeholder="Optional"
                        value={input.defaultValue}
                      />
                    </div>
                    <div className="flex items-end gap-1">
                      <Button
                        aria-label="Move input up"
                        disabled={inputIndex === 0}
                        onClick={() => {
                          setInputs((currentInputs) => moveItem(currentInputs, inputIndex, inputIndex - 1));
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        aria-label="Move input down"
                        disabled={inputIndex === inputs.length - 1}
                        onClick={() => {
                          setInputs((currentInputs) => moveItem(currentInputs, inputIndex, inputIndex + 1));
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        aria-label="Remove input"
                        disabled={inputs.length === 1}
                        onClick={() => {
                          setInputs((currentInputs) => currentInputs.filter((currentInput) => currentInput.id !== input.id));
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`workflow-input-description-${input.id}`}>
                      Description
                    </label>
                    <Input
                      id={`workflow-input-description-${input.id}`}
                      onChange={(event) => {
                        updateInput(input.id, { description: event.target.value });
                      }}
                      placeholder="Where this value comes from and how it is used."
                      value={input.description}
                    />
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      checked={input.isRequired}
                      className="size-4 rounded border-border bg-input/20"
                      onChange={(event) => {
                        updateInput(input.id, { isRequired: event.target.checked });
                      }}
                      type="checkbox"
                    />
                    Required
                  </label>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Steps</h3>
                <p className="text-xs text-muted-foreground">Steps run in order; earlier steps are completed when a later step is running.</p>
              </div>
              <Button
                onClick={() => {
                  setSteps((currentSteps) => [...currentSteps, createStepDraft()]);
                }}
                type="button"
                variant="outline"
              >
                <PlusIcon data-icon="inline-start" />
                Add step
              </Button>
            </div>

            <div className="grid gap-3">
              {steps.map((step, stepIndex) => (
                <div className="rounded-lg border border-border/60 bg-muted/15 p-3" key={step.id}>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium text-muted-foreground" htmlFor={`workflow-step-${step.id}`}>
                        Step {stepIndex + 1}
                      </label>
                      <Input
                        id={`workflow-step-${step.id}`}
                        onChange={(event) => {
                          updateStep(step.id, { name: event.target.value });
                        }}
                        placeholder="Review account"
                        value={step.name}
                      />
                    </div>
                    <div className="flex items-end gap-1">
                      <Button
                        aria-label="Move step up"
                        disabled={stepIndex === 0}
                        onClick={() => {
                          setSteps((currentSteps) => moveItem(currentSteps, stepIndex, stepIndex - 1));
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        aria-label="Move step down"
                        disabled={stepIndex === steps.length - 1}
                        onClick={() => {
                          setSteps((currentSteps) => moveItem(currentSteps, stepIndex, stepIndex + 1));
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        aria-label="Remove step"
                        disabled={steps.length === 1}
                        onClick={() => {
                          setSteps((currentSteps) => currentSteps.filter((currentStep) => currentStep.id !== step.id));
                        }}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`workflow-step-instructions-${step.id}`}>
                      Instructions
                    </label>
                    <textarea
                      className="min-h-20 w-full rounded-md border border-input bg-input/20 px-3 py-2 text-sm leading-6 outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                      id={`workflow-step-instructions-${step.id}`}
                      onChange={(event) => {
                        updateStep(step.id, { instructions: event.target.value });
                      }}
                      placeholder="Describe what should happen in this step."
                      rows={3}
                      value={step.instructions}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
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
            disabled={!canSave}
            onClick={() => {
              props.onSave({
                description,
                inputs,
                instructions,
                name,
                steps,
              });
            }}
            type="button"
          >
            {isEditing ? "Save workflow" : "Create workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
