import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CredentialsTableRecord = {
  id: string;
  name: string;
  modelProvider: string;
  createdAt: string;
  updatedAt: string;
};

interface CredentialsTableProps {
  credentials: CredentialsTableRecord[];
  isLoading: boolean;
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

function formatProvider(value: string): string {
  if (value === "openai") {
    return "OpenAI / Codex";
  }

  return value;
}

export function CredentialsTable(props: CredentialsTableProps) {
  const navigate = useNavigate();

  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading credentials…
      </div>
    );
  }

  if (!props.credentials.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No credentials yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create your first provider credential to let agents call external models.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.credentials.map((credential) => (
          <TableRow
            key={credential.id}
            className="cursor-pointer transition hover:bg-muted/40"
            onClick={() => {
              void navigate({
                to: "/model-provider-credentials/$credentialId",
                params: {
                  credentialId: credential.id,
                },
              });
            }}
          >
            <TableCell className="font-medium text-foreground">{credential.name}</TableCell>
            <TableCell>
              <Badge variant="outline">{formatProvider(credential.modelProvider)}</Badge>
            </TableCell>
            <TableCell>API key</TableCell>
            <TableCell>{formatTimestamp(credential.createdAt)}</TableCell>
            <TableCell>{formatTimestamp(credential.updatedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
