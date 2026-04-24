import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardWindowStat } from "./tasks_section";

export type DashboardWorkflowRunRecord = {
  agentName: string;
  completedAt: string | null;
  id: string;
  sessionId: string;
  source: string;
  startedAt: string | null;
  status: string;
  stepSummary: string;
  updatedAt: string;
  workflowDefinitionId: string | null;
  workflowName: string;
};

type WorkflowRunsSectionProps = {
  description: string;
  emptyStateDescription: string;
  emptyStateTitle: string;
  runs: DashboardWorkflowRunRecord[];
  stats?: DashboardWindowStat[];
  timestampLabel: string;
  title: string;
  totalCount: number;
};

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Unknown";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatSourceLabel(source: string): string {
  if (source === "manual") {
    return "Manual";
  }
  if (source === "scheduled") {
    return "Scheduled";
  }

  return source;
}

/**
 * Shows either active or recently completed workflow runs with a compact per-run step summary so
 * operators can tell whether automation is moving without opening each workflow detail page.
 */
export function WorkflowRunsSection(props: WorkflowRunsSectionProps) {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader className="gap-3">
        <CardAction>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            params={{ organizationSlug }}
            to={OrganizationPath.route("/workflows")}
          >
            Show all
          </Link>
        </CardAction>
        <div className="space-y-1">
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>
            {props.description} Showing {props.runs.length} of {props.totalCount}.
          </CardDescription>
        </div>
        {props.stats?.length ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {props.stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {props.runs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">{props.emptyStateTitle}</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              {props.emptyStateDescription}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>{props.timestampLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.runs.map((run) => {
                const isNavigable = Boolean(run.workflowDefinitionId);

                return (
                  <TableRow
                    key={run.id}
                    className={isNavigable ? "cursor-pointer" : undefined}
                    onClick={() => {
                      if (!run.workflowDefinitionId) {
                        return;
                      }

                      void navigate({
                        params: {
                          organizationSlug,
                          runId: run.id,
                          workflowId: run.workflowDefinitionId,
                        },
                        to: OrganizationPath.route("/workflows/$workflowId/runs/$runId"),
                      });
                    }}
                  >
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{run.workflowName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{formatSourceLabel(run.source)}</Badge>
                          <span className="truncate text-[0.7rem] text-muted-foreground">{run.agentName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{run.stepSummary}</p>
                        <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">{run.sessionId}</p>
                      </div>
                    </TableCell>
                    <TableCell>{formatTimestamp(props.timestampLabel === "Completed" ? run.completedAt : run.updatedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
