import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type SecretsTableRecord = {
  createdAt: string;
  description: string | null;
  envVarName: string;
  groupName: string;
  id: string;
  name: string;
  updatedAt: string;
};

interface SecretsTableProps {
  isLoading: boolean;
  onSelect(secretId: string): void;
  secrets: SecretsTableRecord[];
}

function formatTimestamp(value: string): string {
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
 * Shows company-level encrypted secrets without ever displaying plaintext values in the browser.
 */
export function SecretsTable(props: SecretsTableProps) {
  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading secrets…
      </div>
    );
  }

  if (!props.secrets.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No secrets yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create a company secret to make sensitive tokens available to session command execution.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Group</TableHead>
          <TableHead>Environment Variable</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.secrets.map((secret) => (
          <TableRow
            className="cursor-pointer transition hover:bg-muted/40"
            key={secret.id}
            onClick={() => {
              props.onSelect(secret.id);
            }}
          >
            <TableCell className="font-medium text-foreground">{secret.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{secret.groupName}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{secret.envVarName}</TableCell>
            <TableCell className="max-w-sm text-sm text-muted-foreground">
              {secret.description?.trim() || "—"}
            </TableCell>
            <TableCell>{formatTimestamp(secret.createdAt)}</TableCell>
            <TableCell>{formatTimestamp(secret.updatedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
