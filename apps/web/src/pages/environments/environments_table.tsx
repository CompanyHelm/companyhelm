import { PlayIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  onStart: (environmentId: string) => Promise<void>;
  onStop: (environmentId: string) => Promise<void>;
}

interface DeleteEnvironmentActionsProps {
  actingEnvironmentId: string | null;
  deletingEnvironmentId: string | null;
  environment: EnvironmentsTableRecord;
  onDelete: (environmentId: string, force: boolean) => Promise<void>;
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

function canStartEnvironment(status: string): boolean {
  return status === "stopped" || status === "available";
}

function canStopEnvironment(status: string): boolean {
  return status === "running";
}

/**
 * Keeps environment deletion direct from the row while still exposing the explicit force-delete
 * path for cases where provider teardown fails and only the CompanyHelm record should be removed.
 */
function DeleteEnvironmentActions(props: DeleteEnvironmentActionsProps) {
  const isDisabled =
    props.actingEnvironmentId === props.environment.id
    || props.deletingEnvironmentId === props.environment.id;

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        className="h-8 px-2 text-destructive hover:text-destructive"
        disabled={isDisabled}
        onClick={async () => {
          await props.onDelete(props.environment.id, true);
        }}
        size="sm"
        title="Force delete environment"
        variant="ghost"
      >
        Force
      </Button>
      <Button
        disabled={isDisabled}
        onClick={async () => {
          await props.onDelete(props.environment.id, false);
        }}
        size="icon"
        title="Delete environment"
        variant="ghost"
      >
        <Trash2Icon className="h-4 w-4" />
      </Button>
    </div>
  );
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
          <TableHead className="w-40 text-right">Actions</TableHead>
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
              <div className="flex items-center justify-end gap-1">
                {canStartEnvironment(environment.status) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={props.actingEnvironmentId === environment.id || props.deletingEnvironmentId === environment.id}
                    onClick={async () => {
                      await props.onStart(environment.id);
                    }}
                  >
                    <PlayIcon className="h-4 w-4" />
                  </Button>
                ) : null}
                {canStopEnvironment(environment.status) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={props.actingEnvironmentId === environment.id || props.deletingEnvironmentId === environment.id}
                    onClick={async () => {
                      await props.onStop(environment.id);
                    }}
                  >
                    <SquareIcon className="h-4 w-4" />
                  </Button>
                ) : null}
                <DeleteEnvironmentActions
                  actingEnvironmentId={props.actingEnvironmentId}
                  deletingEnvironmentId={props.deletingEnvironmentId}
                  environment={environment}
                  onDelete={props.onDelete}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
