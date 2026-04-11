import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DashboardEnvironmentRecord = {
  agentName: string | null | undefined;
  displayName: string | null | undefined;
  id: string;
  provider: string;
  providerEnvironmentId: string;
  status: string;
  updatedAt: string;
};

function formatTimestamp(value: string): string {
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

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeVariant(status: string): "outline" | "positive" | "secondary" | "warning" {
  switch (status.trim().toLowerCase()) {
    case "running":
      return "positive";
    case "stopped":
      return "secondary";
    case "provisioning":
      return "warning";
    default:
      return "outline";
  }
}

/**
 * Summarizes live environment status on the dashboard, with explicit counts for running and
 * stopped environments plus a compact table of the current inventory.
 */
export function EnvironmentsSection(props: {
  environments: DashboardEnvironmentRecord[];
  otherCount: number;
  runningCount: number;
  stoppedCount: number;
  totalCount: number;
}) {
  const organizationSlug = useCurrentOrganizationSlug();
  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardAction>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            params={{ organizationSlug }}
            to={OrganizationPath.route("/environments")}
          >
            Show all
          </Link>
        </CardAction>
        <CardTitle>Environments</CardTitle>
        <CardDescription>
          Showing {props.environments.length} of {props.totalCount}. {props.runningCount} running,{" "}
          {props.stoppedCount} stopped{props.otherCount > 0 ? `, ${props.otherCount} other` : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {props.environments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No environments yet</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              Environments will appear after agents provision or reuse compute.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Environment</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.environments.map((environment) => (
                <TableRow key={environment.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {environment.displayName ?? environment.providerEnvironmentId}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{environment.agentName ?? "Unknown agent"}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(environment.status)}>
                      {formatStatusLabel(environment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{environment.provider}</TableCell>
                  <TableCell>{formatTimestamp(environment.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
