import { Link, useNavigate } from "@tanstack/react-router";
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

export type DashboardTaskRecord = {
  assigneeName: string;
  completedAt: string | null;
  id: string;
  name: string;
  status: string;
  taskStageName: string;
  updatedAt: string;
};

export type DashboardWindowStat = {
  label: string;
  value: number;
};

type TasksSectionProps = {
  description: string;
  emptyStateDescription: string;
  emptyStateTitle: string;
  stats?: DashboardWindowStat[];
  tasks: DashboardTaskRecord[];
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

/**
 * Renders either the in-progress or completed task slice for the dashboard, keeping the task
 * detail route one click away while surfacing the rolling completion counters in the same card.
 */
export function TasksSection(props: TasksSectionProps) {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader className="gap-3">
        <CardAction>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            params={{ organizationSlug }}
            to={OrganizationPath.route("/tasks")}
          >
            Show all
          </Link>
        </CardAction>
        <div className="space-y-1">
          <CardTitle>{props.title}</CardTitle>
          <CardDescription>
            {props.description} Showing {props.tasks.length} of {props.totalCount}.
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
        {props.tasks.length === 0 ? (
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
                <TableHead>Task</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>{props.timestampLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.tasks.map((task) => (
                <TableRow
                  key={task.id}
                  className="cursor-pointer"
                  onClick={() => {
                    void navigate({
                      params: { organizationSlug, taskId: task.id },
                      to: OrganizationPath.route("/tasks/$taskId"),
                    });
                  }}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{task.name}</p>
                      <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">{task.assigneeName}</p>
                    </div>
                  </TableCell>
                  <TableCell>{task.taskStageName}</TableCell>
                  <TableCell>{formatTimestamp(props.timestampLabel === "Completed" ? task.completedAt : task.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
