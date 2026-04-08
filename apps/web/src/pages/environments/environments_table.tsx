import { Badge } from "@/components/ui/badge";
import { EnvironmentActions } from "@/components/environment_actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type EnvironmentsTableRecord = {
  agentId: string;
  agentName: string | null;
  cpuCount: number;
  diskSpaceGb: number;
  displayName: string | null;
  id: string;
  lastSeenAt: string | null;
  memoryGb: number;
  platform: string;
  provider: string;
  providerDefinitionName: string | null;
  providerEnvironmentId: string;
  status: string;
  updatedAt: string;
};

interface EnvironmentsTableProps {
  actingEnvironmentId: string | null;
  deletingEnvironmentId: string | null;
  environments: EnvironmentsTableRecord[];
  isLoading: boolean;
  onDelete: (environmentId: string, force: boolean) => Promise<void>;
  onOpenDesktop: (environmentId: string) => Promise<void>;
  onStart: (environmentId: string) => Promise<void>;
  onStop: (environmentId: string) => Promise<void>;
}

function formatProviderLabel(provider: string): string {
  if (provider.length === 0) {
    return "Unknown";
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatTimestamp(value: string | null): string {
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
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

/**
 * Renders the company environment inventory in a scan-friendly table so operators can quickly see
 * which agent owns each environment and what its current runtime state looks like.
 */
export function EnvironmentsTable(props: EnvironmentsTableProps) {
  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading environments…
      </div>
    );
  }

  if (props.environments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No environments yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Environments will appear here after an agent provisions or reuses compute.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Environment</TableHead>
          <TableHead>Agent</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>CPU</TableHead>
          <TableHead>Memory</TableHead>
          <TableHead>Disk</TableHead>
          <TableHead>Last seen</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
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
            <TableCell>
              <div className="min-w-0">
                <p className="truncate text-foreground">{environment.agentName ?? environment.agentId}</p>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex min-w-0 flex-col gap-1">
                <div>
                  <Badge variant="outline">{formatProviderLabel(environment.provider)}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {environment.providerDefinitionName ?? "No definition"}
                </p>
              </div>
            </TableCell>
            <TableCell className="capitalize">{environment.platform}</TableCell>
            <TableCell>
              <Badge variant="secondary">{formatStatusLabel(environment.status)}</Badge>
            </TableCell>
            <TableCell>{environment.cpuCount}</TableCell>
            <TableCell>{environment.memoryGb} GB</TableCell>
            <TableCell>{environment.diskSpaceGb} GB</TableCell>
            <TableCell>{formatTimestamp(environment.lastSeenAt)}</TableCell>
            <TableCell>{formatTimestamp(environment.updatedAt)}</TableCell>
            <TableCell className="text-right">
              <EnvironmentActions
                actingEnvironmentId={props.actingEnvironmentId}
                className="justify-end"
                deletingEnvironmentId={props.deletingEnvironmentId}
                environment={environment}
                onDelete={props.onDelete}
                onOpenDesktop={props.onOpenDesktop}
                onStart={props.onStart}
                onStop={props.onStop}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
