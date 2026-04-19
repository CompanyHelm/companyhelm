import { Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, MessageSquareIcon, PlayIcon, PlusIcon, Trash2Icon, WorkflowIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { EditableField } from "@/components/editable_field";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { PageTabs } from "@/components/ui/page_tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { RunWorkflowDialog } from "./run_workflow_dialog";
import type { WorkflowInputRecord, WorkflowRecord, WorkflowStepRecord } from "./workflow_types";
import type { workflowDetailPageQuery } from "./__generated__/workflowDetailPageQuery.graphql";
import type { workflowDetailPageStartRunMutation } from "./__generated__/workflowDetailPageStartRunMutation.graphql";
import type {
  UpdateWorkflowInput,
  workflowDetailPageUpdateMutation,
} from "./__generated__/workflowDetailPageUpdateMutation.graphql";

type WorkflowQueryRecord = workflowDetailPageQuery["response"]["Workflow"];
type WorkflowRunRecord = workflowDetailPageQuery["response"]["WorkflowRuns"][number];
type WorkflowDetailTab = "overview" | "runs";
type WorkflowPatch = Pick<Partial<WorkflowRecord>, "description" | "inputs" | "instructions" | "name" | "steps">;

const workflowDetailPageQueryNode = graphql`
  query workflowDetailPageQuery($workflowId: ID!) {
    Agents {
      id
      name
    }
    Workflow(id: $workflowId) {
      id
      name
      description
      instructions
      isEnabled
      inputs {
        id
        name
        description
        isRequired
        defaultValue
        createdAt
      }
      steps {
        id
        stepId
        name
        instructions
        ordinal
        createdAt
      }
      createdAt
      updatedAt
    }
    WorkflowRuns(workflowDefinitionId: $workflowId) {
      id
      workflowDefinitionId
      status
      agentId
      sessionId
      steps {
        id
        workflowRunId
        name
        instructions
        ordinal
        status
      }
      startedAt
      completedAt
      createdAt
      updatedAt
    }
  }
`;

const workflowDetailPageUpdateMutationNode = graphql`
  mutation workflowDetailPageUpdateMutation($input: UpdateWorkflowInput!) {
    UpdateWorkflow(input: $input) {
      id
      name
      description
      instructions
      isEnabled
      inputs {
        id
        name
        description
        isRequired
        defaultValue
        createdAt
      }
      steps {
        id
        stepId
        name
        instructions
        ordinal
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

const workflowDetailPageStartRunMutationNode = graphql`
  mutation workflowDetailPageStartRunMutation($input: StartWorkflowRunInput!) {
    StartWorkflowRun(input: $input) {
      id
      workflowDefinitionId
      status
      agentId
      sessionId
      startedAt
      completedAt
      createdAt
      updatedAt
    }
  }
`;

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function resolveRunBadgeVariant(status: string): "destructive" | "outline" | "positive" | "warning" {
  if (status === "done") {
    return "positive";
  }
  if (status === "running") {
    return "warning";
  }
  if (status === "canceled") {
    return "destructive";
  }

  return "outline";
}

function getRunStepSummary(steps: WorkflowRunRecord["steps"]): string {
  const counts = steps.reduce<Record<string, number>>((nextCounts, step) => {
    nextCounts[step.status] = (nextCounts[step.status] ?? 0) + 1;
    return nextCounts;
  }, {});

  return `${counts.done ?? 0} done / ${counts.running ?? 0} running / ${counts.pending ?? 0} pending`;
}

function createDraftId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function resolveUniqueInputName(inputs: ReadonlyArray<WorkflowInputRecord>): string {
  const names = new Set(inputs.map((input) => input.name));
  let inputIndex = inputs.length + 1;
  let inputName = `input_${inputIndex}`;
  while (names.has(inputName)) {
    inputIndex += 1;
    inputName = `input_${inputIndex}`;
  }

  return inputName;
}

function createInputDraft(inputs: ReadonlyArray<WorkflowInputRecord>): WorkflowInputRecord {
  return {
    defaultValue: "",
    description: "",
    id: createDraftId(),
    isRequired: false,
    name: resolveUniqueInputName(inputs),
  };
}

function createStepDraft(steps: ReadonlyArray<WorkflowStepRecord>): WorkflowStepRecord {
  return {
    id: createDraftId(),
    instructions: "Describe what should happen in this step.",
    name: `Step ${steps.length + 1}`,
    ordinal: steps.length + 1,
  };
}

function moveItem<T>(items: ReadonlyArray<T>, fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items];
  const [item] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, item);
  return nextItems;
}

function normalizeStepOrdinals(steps: ReadonlyArray<WorkflowStepRecord>): WorkflowStepRecord[] {
  return steps.map((step, stepIndex) => ({
    ...step,
    ordinal: stepIndex + 1,
  }));
}

function updateInputRecord(
  inputs: ReadonlyArray<WorkflowInputRecord>,
  inputId: string,
  patch: Partial<WorkflowInputRecord>,
): WorkflowInputRecord[] {
  return inputs.map((input) => (
    input.id === inputId ? { ...input, ...patch } : input
  ));
}

function updateStepRecord(
  steps: ReadonlyArray<WorkflowStepRecord>,
  stepId: string,
  patch: Partial<WorkflowStepRecord>,
): WorkflowStepRecord[] {
  return normalizeStepOrdinals(steps.map((step) => (
    step.id === stepId ? { ...step, ...patch } : step
  )));
}

function createWorkflowMutationPatch(patch: WorkflowPatch): Omit<UpdateWorkflowInput, "id"> {
  return {
    description: patch.description,
    inputs: patch.inputs?.map((input) => ({
      defaultValue: input.defaultValue,
      description: input.description,
      isRequired: input.isRequired,
      name: input.name,
    })),
    instructions: patch.instructions,
    name: patch.name,
    steps: patch.steps?.map((step) => ({
      instructions: step.instructions,
      name: step.name,
    })),
  };
}

function toWorkflowRecord(workflow: WorkflowQueryRecord): WorkflowRecord {
  return {
    createdAt: workflow.createdAt,
    description: workflow.description ?? "",
    id: workflow.id,
    inputs: workflow.inputs.map((input) => ({
      createdAt: input.createdAt,
      defaultValue: input.defaultValue ?? "",
      description: input.description ?? "",
      id: input.id,
      isRequired: input.isRequired,
      name: input.name,
    })),
    instructions: workflow.instructions ?? "",
    isEnabled: workflow.isEnabled,
    name: workflow.name,
    steps: workflow.steps.map((step) => ({
      createdAt: step.createdAt,
      id: step.id,
      instructions: step.instructions ?? "",
      name: step.name,
      ordinal: step.ordinal,
      stepId: step.stepId,
    })),
    updatedAt: workflow.updatedAt,
  };
}

function WorkflowDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardHeader>
          <CardDescription>Loading workflow.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="h-20 rounded-lg border border-border/60 bg-muted/30" />
            <div className="h-20 rounded-lg border border-border/60 bg-muted/20" />
            <div className="h-20 rounded-lg border border-border/60 bg-muted/10" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function WorkflowOverviewTab(props: {
  canExecute: boolean;
  isExecuting: boolean;
  onSave(patch: WorkflowPatch): Promise<void>;
  onExecute(): void;
  workflow: WorkflowRecord;
}) {
  const [definitionErrorMessage, setDefinitionErrorMessage] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const isDefinitionActionPending = pendingActionId !== null;

  async function saveDefinitionPatch(actionId: string, patch: WorkflowPatch): Promise<void> {
    setPendingActionId(actionId);
    setDefinitionErrorMessage(null);

    try {
      await props.onSave(patch);
    } catch (error: unknown) {
      setDefinitionErrorMessage(getErrorMessage(error, "Failed to update workflow definition."));
    } finally {
      setPendingActionId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid gap-1">
          <h2 className="text-sm font-semibold text-foreground">Execute workflow</h2>
          <p className="text-sm text-muted-foreground">
            Start a run from this definition after the inputs and ordered steps look right.
          </p>
        </div>
        <Button
          data-primary-cta=""
          disabled={!props.canExecute || props.isExecuting}
          onClick={props.onExecute}
          type="button"
        >
          <PlayIcon data-icon="inline-start" />
          Execute
        </Button>
      </section>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <Badge variant={props.workflow.isEnabled ? "positive" : "outline"}>
              {props.workflow.isEnabled ? "enabled" : "disabled"}
            </Badge>
          </div>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
          <p className="text-xs text-muted-foreground">Inputs</p>
          <p className="mt-1 text-sm font-medium text-foreground">{props.workflow.inputs.length}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
          <p className="text-xs text-muted-foreground">Steps</p>
          <p className="mt-1 text-sm font-medium text-foreground">{props.workflow.steps.length}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
          <p className="text-xs text-muted-foreground">Updated</p>
          <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(props.workflow.updatedAt)}</p>
        </div>
      </div>

      <section className="grid gap-4">
        <div className="grid gap-1">
          <h2 className="text-sm font-semibold text-foreground">General</h2>
          <p className="text-sm text-muted-foreground">
            Edit the workflow identity and launch instructions without leaving this page.
          </p>
        </div>
        <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
          <EditableField
            emptyValueLabel="Unnamed workflow"
            fieldType="text"
            label="Name"
            onSave={async (value) => {
              await props.onSave({
                name: value,
              });
            }}
            value={props.workflow.name}
            variant="plain"
          />

          <EditableField
            emptyValueLabel="No description"
            fieldType="text"
            label="Description"
            onSave={async (value) => {
              await props.onSave({
                description: value,
              });
            }}
            value={props.workflow.description}
            variant="plain"
          />
        </div>
        <EditableField
          emptyValueLabel="No instructions configured."
          fieldType="textarea"
          label="Instructions"
          onSave={async (value) => {
            await props.onSave({
              instructions: value,
            });
          }}
          readOnlyFormat="markdown"
          value={props.workflow.instructions}
          variant="plain"
        />
      </section>

      <section className="grid gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <h2 className="text-sm font-semibold text-foreground">Inputs</h2>
            <p className="text-sm text-muted-foreground">
              Manage the values collected before a run starts.
            </p>
          </div>
          <Button
            disabled={isDefinitionActionPending}
            onClick={async () => {
              await saveDefinitionPatch("add-input", {
                inputs: [...props.workflow.inputs, createInputDraft(props.workflow.inputs)],
              });
            }}
            type="button"
            variant="outline"
          >
            <PlusIcon data-icon="inline-start" />
            Add input
          </Button>
        </div>
        {props.workflow.inputs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            This workflow does not collect launch inputs.
          </p>
        ) : (
          <div className="grid gap-4">
            {props.workflow.inputs.map((input) => (
              <div className="grid gap-4 rounded-lg border border-border/60 bg-muted/10 p-4" key={input.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-foreground">{input.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {input.isRequired ? "Required launch input" : "Optional launch input"}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove ${input.name}`}
                    disabled={isDefinitionActionPending}
                    onClick={async () => {
                      await saveDefinitionPatch(`remove-input-${input.id}`, {
                        inputs: props.workflow.inputs.filter((currentInput) => currentInput.id !== input.id),
                      });
                    }}
                    size="icon-sm"
                    title={`Remove ${input.name}`}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                  <EditableField
                    emptyValueLabel="Unnamed input"
                    fieldType="text"
                    label="Name"
                    onSave={async (value) => {
                      await props.onSave({
                        inputs: updateInputRecord(props.workflow.inputs, input.id, { name: value }),
                      });
                    }}
                    value={input.name}
                    variant="plain"
                  />
                  <EditableField
                    displayValue={input.isRequired ? "Required" : "Optional"}
                    emptyValueLabel="Optional"
                    fieldType="select"
                    label="Requirement"
                    onSave={async (value) => {
                      await props.onSave({
                        inputs: updateInputRecord(props.workflow.inputs, input.id, {
                          isRequired: value === "required",
                        }),
                      });
                    }}
                    options={[
                      { label: "Required", value: "required" },
                      { label: "Optional", value: "optional" },
                    ]}
                    value={input.isRequired ? "required" : "optional"}
                    variant="plain"
                  />
                  <EditableField
                    emptyValueLabel="No default value"
                    fieldType="text"
                    label="Default value"
                    onSave={async (value) => {
                      await props.onSave({
                        inputs: updateInputRecord(props.workflow.inputs, input.id, { defaultValue: value }),
                      });
                    }}
                    value={input.defaultValue}
                    variant="plain"
                  />
                  <EditableField
                    emptyValueLabel="No description"
                    fieldType="text"
                    label="Description"
                    onSave={async (value) => {
                      await props.onSave({
                        inputs: updateInputRecord(props.workflow.inputs, input.id, { description: value }),
                      });
                    }}
                    value={input.description}
                    variant="plain"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-1">
            <h2 className="text-sm font-semibold text-foreground">Steps</h2>
            <p className="text-sm text-muted-foreground">
              Edit the ordered run plan; moving a step updates the execution order.
            </p>
          </div>
          <Button
            disabled={isDefinitionActionPending}
            onClick={async () => {
              await saveDefinitionPatch("add-step", {
                steps: normalizeStepOrdinals([...props.workflow.steps, createStepDraft(props.workflow.steps)]),
              });
            }}
            type="button"
            variant="outline"
          >
            <PlusIcon data-icon="inline-start" />
            Add step
          </Button>
        </div>
        <div className="grid gap-4">
          {props.workflow.steps.map((step, stepIndex) => (
            <div className="grid gap-4 rounded-lg border border-border/60 bg-muted/10 p-4" key={step.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-medium text-foreground">Step {stepIndex + 1}</p>
                  <p className="text-xs text-muted-foreground">{step.name}</p>
                </div>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    aria-label={`Move ${step.name} up`}
                    disabled={isDefinitionActionPending || stepIndex === 0}
                    onClick={async () => {
                      await saveDefinitionPatch(`move-step-up-${step.id}`, {
                        steps: normalizeStepOrdinals(moveItem(props.workflow.steps, stepIndex, stepIndex - 1)),
                      });
                    }}
                    size="icon-sm"
                    title={`Move ${step.name} up`}
                    type="button"
                    variant="ghost"
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    aria-label={`Move ${step.name} down`}
                    disabled={isDefinitionActionPending || stepIndex === props.workflow.steps.length - 1}
                    onClick={async () => {
                      await saveDefinitionPatch(`move-step-down-${step.id}`, {
                        steps: normalizeStepOrdinals(moveItem(props.workflow.steps, stepIndex, stepIndex + 1)),
                      });
                    }}
                    size="icon-sm"
                    title={`Move ${step.name} down`}
                    type="button"
                    variant="ghost"
                  >
                    <ArrowDownIcon />
                  </Button>
                  <Button
                    aria-label={`Remove ${step.name}`}
                    disabled={isDefinitionActionPending || props.workflow.steps.length === 1}
                    onClick={async () => {
                      await saveDefinitionPatch(`remove-step-${step.id}`, {
                        steps: normalizeStepOrdinals(
                          props.workflow.steps.filter((currentStep) => currentStep.id !== step.id),
                        ),
                      });
                    }}
                    size="icon-sm"
                    title={`Remove ${step.name}`}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
              <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                <EditableField
                  emptyValueLabel="Unnamed step"
                  fieldType="text"
                  label="Name"
                  onSave={async (value) => {
                    await props.onSave({
                      steps: updateStepRecord(props.workflow.steps, step.id, { name: value }),
                    });
                  }}
                  value={step.name}
                  variant="plain"
                />
                <EditableField
                  emptyValueLabel="No instructions"
                  fieldType="textarea"
                  label="Instructions"
                  onSave={async (value) => {
                    await props.onSave({
                      steps: updateStepRecord(props.workflow.steps, step.id, { instructions: value }),
                    });
                  }}
                  readOnlyFormat="markdown"
                  value={step.instructions}
                  variant="plain"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {definitionErrorMessage ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {definitionErrorMessage}
        </div>
      ) : null}
    </div>
  );
}

function WorkflowRunsTab(props: {
  organizationSlug: string;
  runs: ReadonlyArray<WorkflowRunRecord>;
  workflowId: string;
}) {
  const navigate = useNavigate();

  if (props.runs.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
        <WorkflowIcon className="size-8 text-muted-foreground" />
        <div className="grid gap-1">
          <p className="text-sm font-medium text-foreground">No runs yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Execute this workflow to create its first run and track the step history here.
          </p>
        </div>
      </div>
    );
  }

  function openWorkflowRun(runId: string): void {
    void navigate({
      params: {
        organizationSlug: props.organizationSlug,
        runId,
        workflowId: props.workflowId,
      },
      to: OrganizationPath.route("/workflows/$workflowId/runs/$runId"),
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Run</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Started</TableHead>
          <TableHead>Completed</TableHead>
          <TableHead>Steps</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.runs.map((run) => (
          <TableRow
            className="cursor-pointer"
            key={run.id}
            onClick={() => {
              openWorkflowRun(run.id);
            }}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) {
                return;
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openWorkflowRun(run.id);
              }
            }}
            role="link"
            tabIndex={0}
          >
            <TableCell>
              <div className="grid gap-1">
                <span className="font-medium text-foreground">{run.id}</span>
                <span className="text-xs text-muted-foreground">Session {run.sessionId}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={resolveRunBadgeVariant(run.status)}>{run.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDateTime(run.startedAt)}</TableCell>
            <TableCell className="text-muted-foreground">{formatDateTime(run.completedAt)}</TableCell>
            <TableCell>
              <Badge variant="secondary">{getRunStepSummary(run.steps)}</Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  aria-label={`Open session for run ${run.id}`}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  render={(
                    <Link
                      params={{ organizationSlug: props.organizationSlug }}
                      search={{ sessionId: run.sessionId }}
                      to={OrganizationPath.route("/chats")}
                    />
                  )}
                  size="icon-sm"
                  title={`Open session for run ${run.id}`}
                  variant="ghost"
                >
                  <MessageSquareIcon />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function WorkflowDetailPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const search = useSearch({ strict: false }) as { tab?: WorkflowDetailTab };
  const { setDetailLabel } = useApplicationBreadcrumb();
  const { workflowId } = useParams({ strict: false }) as {
    workflowId?: string;
  };
  const normalizedWorkflowId = String(workflowId || "").trim();
  if (!normalizedWorkflowId) {
    throw new Error("Workflow ID is required.");
  }

  const data = useLazyLoadQuery<workflowDetailPageQuery>(
    workflowDetailPageQueryNode,
    {
      workflowId: normalizedWorkflowId,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const workflow = toWorkflowRecord(data.Workflow);
  const selectedTab: WorkflowDetailTab = search.tab === "runs" ? "runs" : "overview";
  const agents = data.Agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
  }));
  const [isRunDialogOpen, setRunDialogOpen] = useState(false);
  const [runDialogErrorMessage, setRunDialogErrorMessage] = useState<string | null>(null);
  const [commitUpdateWorkflow] = useMutation<workflowDetailPageUpdateMutation>(
    workflowDetailPageUpdateMutationNode,
  );
  const [commitStartWorkflowRun, isStartWorkflowRunInFlight] = useMutation<workflowDetailPageStartRunMutation>(
    workflowDetailPageStartRunMutationNode,
  );

  useEffect(() => {
    setDetailLabel(workflow.name);

    return () => {
      setDetailLabel(null);
    };
  }, [setDetailLabel, workflow.name]);

  async function saveWorkflow(patch: WorkflowPatch): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      commitUpdateWorkflow({
        variables: {
          input: {
            id: workflow.id,
            ...createWorkflowMutationPatch(patch),
          },
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }
          resolve();
        },
        onError: reject,
      });
    });
  }

  async function runWorkflow(input: {
    agentId: string;
    inputValues: Array<{ name: string; value: string }>;
    workflowDefinitionId: string;
  }): Promise<void> {
    setRunDialogErrorMessage(null);

    try {
      const workflowRunId = await new Promise<string>((resolve, reject) => {
        commitStartWorkflowRun({
          variables: {
            input,
          },
          onCompleted: (response, errors) => {
            const nextErrorMessage = errors?.[0]?.message;
            if (nextErrorMessage) {
              reject(new Error(nextErrorMessage));
              return;
            }
            resolve(response.StartWorkflowRun.id);
          },
          onError: reject,
        });
      });
      setRunDialogOpen(false);
      void navigate({
        params: {
          organizationSlug,
          runId: workflowRunId,
          workflowId: input.workflowDefinitionId,
        },
        to: OrganizationPath.route("/workflows/$workflowId/runs/$runId"),
      });
    } catch (error: unknown) {
      setRunDialogErrorMessage(getErrorMessage(error, "Failed to start workflow run."));
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardContent className="grid gap-6 px-0">
          <PageTabs
            items={[
              { key: "overview", label: "Overview" },
              { key: "runs", label: "Runs" },
            ]}
            onSelect={(tab) => {
              void navigate({
                params: {
                  organizationSlug,
                  workflowId: workflow.id,
                },
                search: {
                  tab,
                },
                to: OrganizationPath.route("/workflows/$workflowId"),
              });
            }}
            selectedKey={selectedTab}
          />

          {selectedTab === "overview" ? (
            <WorkflowOverviewTab
              canExecute={agents.length > 0}
              isExecuting={isStartWorkflowRunInFlight}
              onExecute={() => {
                setRunDialogErrorMessage(null);
                setRunDialogOpen(true);
              }}
              onSave={saveWorkflow}
              workflow={workflow}
            />
          ) : (
            <WorkflowRunsTab
              organizationSlug={organizationSlug}
              runs={data.WorkflowRuns}
              workflowId={workflow.id}
            />
          )}
        </CardContent>
      </Card>

      <RunWorkflowDialog
        agents={agents}
        errorMessage={runDialogErrorMessage}
        isOpen={isRunDialogOpen}
        isSaving={isStartWorkflowRunInFlight}
        onOpenChange={(open) => {
          setRunDialogOpen(open);
          if (!open) {
            setRunDialogErrorMessage(null);
          }
        }}
        onRun={runWorkflow}
        workflow={workflow}
      />
    </main>
  );
}

export function WorkflowDetailPage() {
  return (
    <Suspense fallback={<WorkflowDetailPageFallback />}>
      <WorkflowDetailPageContent />
    </Suspense>
  );
}
