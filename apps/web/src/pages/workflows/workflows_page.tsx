import { Suspense, useState } from "react";
import { PlayIcon, PlusIcon, Trash2Icon, WorkflowIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { RecordProxy } from "relay-runtime";
import { useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
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
import type { workflowsPageCreateMutation } from "./__generated__/workflowsPageCreateMutation.graphql";
import type { workflowsPageDeleteMutation } from "./__generated__/workflowsPageDeleteMutation.graphql";
import type { workflowsPageQuery } from "./__generated__/workflowsPageQuery.graphql";
import type { workflowsPageStartRunMutation } from "./__generated__/workflowsPageStartRunMutation.graphql";

type WorkflowQueryRecord = workflowsPageQuery["response"]["Workflows"][number];
type WorkflowDialogDraft = {
  description: string;
  inputs: WorkflowRecord["inputs"];
  instructions: string;
  name: string;
  steps: WorkflowRecord["steps"];
};

const workflowsPageQueryNode = graphql`
  query workflowsPageQuery {
    Agents {
      id
      name
    }
    Workflows {
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

const workflowsPageCreateMutationNode = graphql`
  mutation workflowsPageCreateMutation($input: CreateWorkflowInput!) {
    CreateWorkflow(input: $input) {
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

const workflowsPageStartRunMutationNode = graphql`
  mutation workflowsPageStartRunMutation($input: StartWorkflowRunInput!) {
    StartWorkflowRun(input: $input) {
      id
      workflowDefinitionId
      status
      agentId
      sessionId
      startedAt
      createdAt
      updatedAt
    }
  }
`;

const workflowsPageDeleteMutationNode = graphql`
  mutation workflowsPageDeleteMutation($input: DeleteWorkflowInput!) {
    DeleteWorkflow(input: $input) {
      id
    }
  }
`;

function filterStoreRecords(records: ReadonlyArray<unknown>): RecordProxy[] {
  return records.filter((record): record is RecordProxy => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function";
  });
}

function formatDateTime(value: string): string {
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
    triggers: [],
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
    isEnabled: true,
    name: draft.name,
    steps: draft.steps.map((step) => ({
      instructions: step.instructions,
      name: step.name,
    })),
  };
}

function WorkflowsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardHeader>
          <CardDescription>Loading workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="h-16 rounded-lg border border-border/60 bg-muted/30" />
            <div className="h-16 rounded-lg border border-border/60 bg-muted/20" />
            <div className="h-16 rounded-lg border border-border/60 bg-muted/10" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function WorkflowsPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const [dialogErrorMessage, setDialogErrorMessage] = useState<string | null>(null);
  const [pageErrorMessage, setPageErrorMessage] = useState<string | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isRunDialogOpen, setRunDialogOpen] = useState(false);
  const [runDialogErrorMessage, setRunDialogErrorMessage] = useState<string | null>(null);
  const [deletingWorkflow, setDeletingWorkflow] = useState<WorkflowRecord | null>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<WorkflowRecord | null>(null);
  const data = useLazyLoadQuery<workflowsPageQuery>(
    workflowsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateWorkflow, isCreateWorkflowInFlight] = useMutation<workflowsPageCreateMutation>(
    workflowsPageCreateMutationNode,
  );
  const [commitStartWorkflowRun, isStartWorkflowRunInFlight] = useMutation<workflowsPageStartRunMutation>(
    workflowsPageStartRunMutationNode,
  );
  const [commitDeleteWorkflow, isDeleteWorkflowInFlight] = useMutation<workflowsPageDeleteMutation>(
    workflowsPageDeleteMutationNode,
  );
  const workflows = data.Workflows.map(toWorkflowRecord);
  const agents = data.Agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
  }));

  function openCreateDialog(): void {
    setDialogErrorMessage(null);
    setPageErrorMessage(null);
    setDialogOpen(true);
  }

  function openWorkflowDetail(workflowId: string): void {
    void navigate({
      params: {
        organizationSlug,
        workflowId,
      },
      search: {
        tab: "overview",
      },
      to: OrganizationPath.route("/workflows/$workflowId"),
    });
  }

  async function saveWorkflow(draft: WorkflowDialogDraft): Promise<void> {
    setDialogErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitCreateWorkflow({
          variables: {
            input: createWorkflowInput(draft),
          },
          updater: (store) => {
            const createdWorkflow = store.getRootField("CreateWorkflow");
            if (!createdWorkflow) {
              return;
            }

            const rootRecord = store.getRoot();
            const currentWorkflows = filterStoreRecords(rootRecord.getLinkedRecords("Workflows") || []);
            rootRecord.setLinkedRecords([createdWorkflow, ...currentWorkflows], "Workflows");
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
      setRunningWorkflow(null);
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

  async function deleteWorkflow(workflowId: string): Promise<void> {
    if (isDeleteWorkflowInFlight) {
      return;
    }

    setPageErrorMessage(null);
    try {
      await new Promise<void>((resolve, reject) => {
        commitDeleteWorkflow({
          variables: {
            input: {
              id: workflowId,
            },
          },
          updater: (store) => {
            const deletedWorkflow = store.getRootField("DeleteWorkflow");
            if (!deletedWorkflow) {
              return;
            }

            const deletedWorkflowId = deletedWorkflow.getDataID();
            const rootRecord = store.getRoot();
            const currentWorkflows = filterStoreRecords(rootRecord.getLinkedRecords("Workflows") || []);
            rootRecord.setLinkedRecords(
              currentWorkflows.filter((record) => record.getDataID() !== deletedWorkflowId),
              "Workflows",
            );
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
      setDeletingWorkflow(null);
    } catch (error: unknown) {
      setPageErrorMessage(getErrorMessage(error, "Failed to delete workflow."));
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardHeader className="flex flex-col gap-4 px-0 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid gap-1">
            <CardDescription>
              Manage workflow definitions, their required inputs, and ordered execution steps.
            </CardDescription>
          </div>
          <Button data-primary-cta="" onClick={openCreateDialog}>
            <PlusIcon data-icon="inline-start" />
            Create workflow
          </Button>
        </CardHeader>

        <CardContent className="px-0">
          {pageErrorMessage ? (
            <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {pageErrorMessage}
            </div>
          ) : null}

          {workflows.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
              <WorkflowIcon className="size-8 text-muted-foreground" />
              <div className="grid gap-1">
                <p className="text-sm font-medium text-foreground">No workflows yet</p>
                <p className="max-w-md text-sm text-muted-foreground">
                  Create a workflow to define the inputs, templates, and ordered steps the agent should run.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Inputs</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow
                    className="cursor-pointer"
                    key={workflow.id}
                    onClick={() => {
                      openWorkflowDetail(workflow.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) {
                        return;
                      }

                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openWorkflowDetail(workflow.id);
                      }
                    }}
                    role="link"
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="grid gap-1">
                        <span className="font-medium text-foreground">{workflow.name}</span>
                        {workflow.description.length > 0 ? (
                          <span className="line-clamp-2 max-w-xl text-xs text-muted-foreground">
                            {workflow.description}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">No description</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{workflow.inputs.length} inputs</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{workflow.steps.length} steps</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(workflow.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Run ${workflow.name}`}
                          disabled={agents.length === 0}
                          onClick={(event) => {
                            event.stopPropagation();
                            setRunDialogErrorMessage(null);
                            setRunningWorkflow(workflow);
                            setRunDialogOpen(true);
                          }}
                          size="icon-sm"
                          title={`Run ${workflow.name}`}
                          type="button"
                          variant="ghost"
                        >
                          <PlayIcon />
                        </Button>
                        <Button
                          aria-label={`Delete ${workflow.name}`}
                          disabled={isDeleteWorkflowInFlight}
                          onClick={(event) => {
                            event.stopPropagation();
                            setPageErrorMessage(null);
                            setDeletingWorkflow(workflow);
                          }}
                          size="icon-sm"
                          title={`Delete ${workflow.name}`}
                          type="button"
                          variant="ghost"
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WorkflowDialog
        errorMessage={dialogErrorMessage}
        isOpen={isDialogOpen}
        isSaving={isCreateWorkflowInFlight}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setDialogErrorMessage(null);
          }
        }}
        onSave={saveWorkflow}
        workflow={null}
      />

      <RunWorkflowDialog
        agents={agents}
        errorMessage={runDialogErrorMessage}
        isOpen={isRunDialogOpen}
        isSaving={isStartWorkflowRunInFlight}
        onOpenChange={(open) => {
          setRunDialogOpen(open);
          if (!open) {
            setRunningWorkflow(null);
            setRunDialogErrorMessage(null);
          }
        }}
        onRun={runWorkflow}
        workflow={runningWorkflow}
      />

      <AlertDialog
        open={deletingWorkflow !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleteWorkflowInFlight) {
            setDeletingWorkflow(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workflow</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingWorkflow ? (
                <>
                  Delete <span className="font-medium text-foreground">{deletingWorkflow.name}</span>? This
                  removes the workflow definition, inputs, steps, and schedules. Existing runs keep their
                  history.
                </>
              ) : (
                "Delete this workflow? Existing runs keep their history."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancelAction asChild>
              <AlertDialogCancelButton disabled={isDeleteWorkflowInFlight} variant="outline">
                Cancel
              </AlertDialogCancelButton>
            </AlertDialogCancelAction>
            <AlertDialogPrimaryAction asChild>
              <AlertDialogActionButton
                disabled={isDeleteWorkflowInFlight || !deletingWorkflow}
                onClick={async () => {
                  if (!deletingWorkflow) {
                    return;
                  }
                  await deleteWorkflow(deletingWorkflow.id);
                }}
                variant="destructive"
              >
                Delete
              </AlertDialogActionButton>
            </AlertDialogPrimaryAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export function WorkflowsPage() {
  return (
    <Suspense fallback={<WorkflowsPageFallback />}>
      <WorkflowsPageContent />
    </Suspense>
  );
}
