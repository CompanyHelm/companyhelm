import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatProviderLabel } from "../model-provider-credentials/provider_label";

export type AgentsTableRecord = {
  id: string;
  name: string;
  modelName: string | null;
  modelProvider: string | null;
  reasoningLevel: string | null;
  createdAt: string;
  updatedAt: string;
};

interface AgentsTableProps {
  agents: AgentsTableRecord[];
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

/**
 * Renders the current company agents using the same table treatment as the credentials page so
 * agent management feels consistent with the rest of the settings UI.
 */
export function AgentsTable(props: AgentsTableProps) {
  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading agents…
      </div>
    );
  }

  if (props.agents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No agents yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create your first agent to attach a default model and system prompt.
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
          <TableHead>Model</TableHead>
          <TableHead>Reasoning</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.agents.map((agent) => (
          <TableRow key={agent.id}>
            <TableCell className="font-medium text-foreground">{agent.name}</TableCell>
            <TableCell>
              {agent.modelProvider ? (
                <Badge variant="outline">{formatProviderLabel(agent.modelProvider)}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>{agent.modelName ?? "—"}</TableCell>
            <TableCell>{agent.reasoningLevel ?? "—"}</TableCell>
            <TableCell>{formatTimestamp(agent.createdAt)}</TableCell>
            <TableCell>{formatTimestamp(agent.updatedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
