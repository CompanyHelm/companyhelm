import { PlayIcon, SquareIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogCancelAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPrimaryAction,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  providerEnvironmentId: string;
  status: string;
  updatedAt: string;
};

interface EnvironmentsTableProps {
  actingEnvironmentId: string | null;
  deletingEnvironmentId: string | null;
  environments: EnvironmentsTableRecord[];
  isLoading: boolean;
  onDelete: (environmentId: string) => Promise<void>;
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

function canStartEnvironment(status: string): boolean {
  return status === "stopped" || status === "available";
}

function canStopEnvironment(status: string): boolean {
  return status === "running";
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
              <Badge variant="outline">{formatProviderLabel(environment.provider)}</Badge>
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
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={props.actingEnvironmentId === environment.id || props.deletingEnvironmentId === environment.id}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete environment</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the CompanyHelm environment record and tear down
                        the backing compute environment. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancelAction asChild>
                        <AlertDialogCancelButton variant="outline">Cancel</AlertDialogCancelButton>
                      </AlertDialogCancelAction>
                      <AlertDialogPrimaryAction asChild>
                        <AlertDialogActionButton
                          variant="destructive"
                          disabled={props.actingEnvironmentId === environment.id || props.deletingEnvironmentId === environment.id}
                          onClick={async () => {
                            await props.onDelete(environment.id);
                          }}
                        >
                          Delete
                        </AlertDialogActionButton>
                      </AlertDialogPrimaryAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
