import { Link } from "@tanstack/react-router";
import { TerminalSquareIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";

interface EnvironmentOverviewTabProps {
  environment: {
    cpuCount: number;
    cpuUsedPct: number | null | undefined;
    diskSpaceGb: number;
    diskUsedBytes: number | null | undefined;
    displayName: string | null | undefined;
    id: string;
    lastSeenAt: string | null | undefined;
    memoryGb: number;
    memUsedBytes: number | null | undefined;
    metricsSampledAt: string | null | undefined;
    platform: string;
    provider: string;
    providerDefinitionName: string | null;
    providerEnvironmentId: string;
    status: string;
    templateId: string;
    updatedAt: string | undefined;
  };
  organizationSlug: string;
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "—";
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

function formatCpu(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : `${value.toFixed(1)}%`;
}

function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount: number = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }

  return `${amount.toFixed(amount >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Summarizes one environment's identity, capacity, and most recent usage snapshot so operators can
 * understand what the machine is and whether its current utilization looks healthy at a glance.
 */
export function EnvironmentOverviewTab(props: EnvironmentOverviewTabProps) {
  const { environment, organizationSlug } = props;

  return (
    <div className="grid gap-6 px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {environment.displayName ?? environment.providerEnvironmentId}
          </h1>
          <p className="text-sm text-muted-foreground">
            {environment.providerDefinitionName ?? environment.provider} · {environment.platform} · template {environment.templateId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{formatStatusLabel(environment.status)}</Badge>
          <Button
            render={(
              <Link
                params={{ organizationSlug, environmentId: environment.id }}
                to={OrganizationPath.route("/environments/$environmentId/terminal")}
              />
            )}
            size="sm"
            variant="outline"
          >
            <TerminalSquareIcon data-icon="inline-start" />
            Open terminal
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>CPU usage</CardDescription>
            <CardTitle>{formatCpu(environment.cpuUsedPct)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {environment.cpuCount} vCPU provisioned
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Memory usage</CardDescription>
            <CardTitle>{formatBytes(environment.memUsedBytes)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {environment.memoryGb} GB provisioned
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Disk usage</CardDescription>
            <CardTitle>{formatBytes(environment.diskUsedBytes)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {environment.diskSpaceGb} GB provisioned
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment details</CardTitle>
          <CardDescription>Current machine identity and latest telemetry timestamps.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Provider environment ID</p>
            <p className="mt-1 text-sm text-foreground">{environment.providerEnvironmentId}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last metrics sample</p>
            <p className="mt-1 text-sm text-foreground">{formatTimestamp(environment.metricsSampledAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last seen</p>
            <p className="mt-1 text-sm text-foreground">{formatTimestamp(environment.lastSeenAt)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Updated</p>
            <p className="mt-1 text-sm text-foreground">{formatTimestamp(environment.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
