import { Suspense, useState } from "react";
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { ArrowLeftIcon, MessageSquareIcon, PencilIcon, PlayIcon, WorkflowIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { WorkflowDialog } from "./workflow_dialog";
import type { WorkflowRecord } from "./workflow_types";
import type { workflowDetailPageQuery } from "./__generated__/workflowDetailPageQuery.graphql";
import type { workflowDetailPageStartRunMutation } from "./__generated__/workflowDetailPageStartRunMutation.graphql";
import type { workflowDetailPageUpdateMutation } from "./__generated__/workflowDetailPageUpdateMutation.graphql";

type WorkflowQueryRecord = workflowDetailPageQuery["response"]["Workflow"];
type WorkflowRunRecord = workflowDetailPageQuery["response"]["WorkflowRuns"][number];
type WorkflowDetailTab = "overview" | "runs";
type WorkflowDialogDraft = {
  description: string;
  inputs: WorkflowRecord["inputs"];
  instructions: string;
  name: string;
  steps: WorkflowRecord["steps"];
};

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
      runningStepRunId
      steps {
        id
        workflowRunId
        name
        instructions
        ordinal
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
      runningStepRunId
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
  if (status === "completed") {
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

function createWorkflowInput(draft: WorkflowDialogDraft) {
  return {
    description: draft.description,
    inputs: draft.inputs.map((input) => ({
      defaultValue: input.defaultValue,
      description: input.description,
      isRequired: input.isRequired,
      name: input.name,
    })),
    instructions: draft.instructions,
    name: draft.name,
    steps: draft.steps.map((step) => ({
      instructions: step.instructions,
      name: step.name,
    })),
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
  workflow: WorkflowRecord;
}) {
  return (
    <div className="grid gap-6">
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

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-foreground">Instructions</h2>
        {props.workflow.instructions.length > 0 ? (
          <pre className="max-h-72 overflow-auto rounded-lg border border-border/60 bg-muted/15 p-3 text-xs leading-5 text-foreground">
            {props.workflow.instructions}
          </pre>
        ) : (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            No instructions configured.
          </p>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-foreground">Inputs</h2>
        {props.workflow.inputs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 bg-muted/15 p-4 text-sm text-muted-foreground">
            This workflow does not collect launch inputs.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.workflow.inputs.map((input) => (
                <TableRow key={input.id}>
                  <TableCell className="font-medium text-foreground">{input.name}</TableCell>
                  <TableCell className="text-muted-foreground">{input.defaultValue || "None"}</TableCell>
                  <TableCell>
                    <Badge variant={input.isRequired ? "warning" : "outline"}>
                      {input.isRequired ? "required" : "optional"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-lg text-muted-foreground">
                    {input.description || "No description"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="grid gap-2">
        <h2 className="text-sm font-semibold text-foreground">Steps</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Order</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Instructions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.workflow.steps.map((step) => (
              <TableRow key={step.id}>
                <TableCell>{step.ordinal}</TableCell>
                <TableCell className="font-medium text-foreground">{step.name}</TableCell>
                <TableCell className="max-w-2xl text-muted-foreground">
                  <span className="line-clamp-2">{step.instructions}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

function WorkflowRunsTab(props: {
  organizationSlug: string;
  runs: ReadonlyArray<WorkflowRunRecord>;
  workflowId: string;
}) {
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
          <TableRow key={run.id}>
            <TableCell>
              <div className="grid gap-1">
                <Link
                  className="font-medium text-foreground hover:underline"
                  params={{
                    organizationSlug: props.organizationSlug,
                    runId: run.id,
                    workflowId: props.workflowId,
                  }}
                  to={OrganizationPath.route("/workflows/$workflowId/runs/$runId")}
                >
                  {run.id}
                </Link>
                <span className="text-xs text-muted-foreground">Session {run.sessionId}</span>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={resolveRunBadgeVariant(run.status)}>{run.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDateTime(run.startedAt)}</TableCell>
            <TableCell className="text-muted-foreground">{formatDateTime(run.completedAt)}</TableCell>
            <TableCell>
              <Badge variant="secondary">{run.steps.length} steps</Badge>
            </TableCell>
            <TableCell>
              <div className="flex justify-end gap-2">
                <Button
                  aria-label={`Open session for run ${run.id}`}
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
  const [dialogErrorMessage, setDialogErrorMessage] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isRunDialogOpen, setRunDialogOpen] = useState(false);
  const [runDialogErrorMessage, setRunDialogErrorMessage] = useState<string | null>(null);
  const [commitUpdateWorkflow, isUpdateWorkflowInFlight] = useMutation<workflowDetailPageUpdateMutation>(
    workflowDetailPageUpdateMutationNode,
  );
  const [commitStartWorkflowRun, isStartWorkflowRunInFlight] = useMutation<workflowDetailPageStartRunMutation>(
    workflowDetailPageStartRunMutationNode,
  );

  async function saveWorkflow(draft: WorkflowDialogDraft): Promise<void> {
    setDialogErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitUpdateWorkflow({
          variables: {
            input: {
              ...createWorkflowInput(draft),
              id: workflow.id,
              isEnabled: workflow.isEnabled,
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
      setDialogOpen(false);
    } catch (error: unknown) {
      setDialogErrorMessage(getErrorMessage(error, "Failed to save workflow."));
    }
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
        <CardHeader className="flex flex-col gap-4 px-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-2">
            <Button
              className="w-fit"
              onClick={() => {
                void navigate({
                  params: {
                    organizationSlug,
                  },
                  to: OrganizationPath.route("/workflows"),
                });
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Workflows
            </Button>
            <div className="grid gap-1">
              <CardTitle>{workflow.name}</CardTitle>
              <CardDescription>{workflow.description || "No description"}</CardDescription>
            </div>
          </div>
          <CardAction className="flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={() => {
                setDialogErrorMessage(null);
                setDialogOpen(true);
              }}
              type="button"
              variant="outline"
            >
              <PencilIcon data-icon="inline-start" />
              Edit workflow
            </Button>
            <Button
              data-primary-cta=""
              disabled={agents.length === 0}
              onClick={() => {
                setRunDialogErrorMessage(null);
                setRunDialogOpen(true);
              }}
              type="button"
            >
              <PlayIcon data-icon="inline-start" />
              Execute
            </Button>
          </CardAction>
        </CardHeader>

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
            <WorkflowOverviewTab workflow={workflow} />
          ) : (
            <WorkflowRunsTab
              organizationSlug={organizationSlug}
              runs={data.WorkflowRuns}
              workflowId={workflow.id}
            />
          )}
        </CardContent>
      </Card>

      <WorkflowDialog
        errorMessage={dialogErrorMessage}
        isOpen={isDialogOpen}
        isSaving={isUpdateWorkflowInFlight}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDialogErrorMessage(null);
          }
        }}
        onSave={saveWorkflow}
        workflow={workflow}
      />

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
