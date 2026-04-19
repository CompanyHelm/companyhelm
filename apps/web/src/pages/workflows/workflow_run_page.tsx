import { Suspense } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, MessageSquareIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { workflowRunPageQuery } from "./__generated__/workflowRunPageQuery.graphql";

type WorkflowRunRecord = workflowRunPageQuery["response"]["WorkflowRun"];
type WorkflowRunStepRecord = WorkflowRunRecord["steps"][number];
type WorkflowRunStepStatus = "done" | "pending" | "running";

const workflowRunPageQueryNode = graphql`
  query workflowRunPageQuery($workflowId: ID!, $runId: ID!) {
    Workflow(id: $workflowId) {
      id
      name
      description
    }
    WorkflowRun(id: $runId) {
      id
      workflowDefinitionId
      instructions
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

function resolveStepStatus(run: WorkflowRunRecord, step: WorkflowRunStepRecord): WorkflowRunStepStatus {
  if (run.status === "completed") {
    return "done";
  }

  const runningStep = run.steps.find((candidateStep) => candidateStep.id === run.runningStepRunId);
  if (step.id === run.runningStepRunId) {
    return "running";
  }
  if (runningStep && step.ordinal < runningStep.ordinal) {
    return "done";
  }

  return "pending";
}

function resolveStepBadgeVariant(status: WorkflowRunStepStatus): "outline" | "positive" | "secondary" | "warning" {
  if (status === "done") {
    return "positive";
  }
  if (status === "running") {
    return "warning";
  }

  return "outline";
}

function WorkflowRunPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page">
        <CardHeader>
          <CardDescription>Loading workflow run.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="h-20 rounded-lg border border-border/60 bg-muted/30" />
            <div className="h-20 rounded-lg border border-border/60 bg-muted/20" />
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function WorkflowRunPageContent() {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();
  const { runId, workflowId } = useParams({ strict: false }) as {
    runId?: string;
    workflowId?: string;
  };
  const normalizedRunId = String(runId || "").trim();
  const normalizedWorkflowId = String(workflowId || "").trim();
  if (!normalizedRunId || !normalizedWorkflowId) {
    throw new Error("Workflow run ID is required.");
  }

  const data = useLazyLoadQuery<workflowRunPageQuery>(
    workflowRunPageQueryNode,
    {
      runId: normalizedRunId,
      workflowId: normalizedWorkflowId,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const run = data.WorkflowRun;

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
              <CardTitle>{data.Workflow.name}</CardTitle>
              <CardDescription>
                Run {run.id}
              </CardDescription>
            </div>
          </div>
          <CardAction className="flex items-center gap-2">
            <Badge variant={resolveRunBadgeVariant(run.status)}>{run.status}</Badge>
            <Button
              onClick={() => {
                void navigate({
                  params: {
                    organizationSlug,
                  },
                  search: {
                    sessionId: run.sessionId,
                  },
                  to: OrganizationPath.route("/chats"),
                });
              }}
              type="button"
              variant="outline"
            >
              <MessageSquareIcon data-icon="inline-start" />
              Open session
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="grid gap-6 px-0">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
              <p className="text-xs text-muted-foreground">Started</p>
              <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(run.startedAt)}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
              <p className="text-xs text-muted-foreground">Running step</p>
              <p className="mt-1 text-sm font-medium text-foreground">{run.runningStepRunId ?? "None"}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/15 p-3">
              <p className="text-xs text-muted-foreground">Session</p>
              <p className="mt-1 text-sm font-medium text-foreground">{run.sessionId}</p>
            </div>
          </div>

          {run.instructions ? (
            <section className="grid gap-2">
              <h2 className="text-sm font-semibold text-foreground">Resolved instructions</h2>
              <pre className="max-h-72 overflow-auto rounded-lg border border-border/60 bg-muted/15 p-3 text-xs leading-5 text-foreground">
                {run.instructions}
              </pre>
            </section>
          ) : null}

          <section className="grid gap-2">
            <h2 className="text-sm font-semibold text-foreground">Run steps</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.steps.map((step) => {
                  const stepStatus = resolveStepStatus(run, step);

                  return (
                    <TableRow key={step.id}>
                      <TableCell>{step.ordinal}</TableCell>
                      <TableCell>
                        <div className="grid gap-1">
                          <span className="font-medium text-foreground">{step.name}</span>
                          {step.instructions ? (
                            <span className="line-clamp-2 max-w-2xl text-xs text-muted-foreground">
                              {step.instructions}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={resolveStepBadgeVariant(stepStatus)}>{stepStatus}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </CardContent>
      </Card>
    </main>
  );
}

export function WorkflowRunPage() {
  return (
    <Suspense fallback={<WorkflowRunPageFallback />}>
      <WorkflowRunPageContent />
    </Suspense>
  );
}
