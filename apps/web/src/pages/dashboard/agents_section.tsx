import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import {
  Card,
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

export type DashboardAgentRecord = {
  id: string;
  modelName: string | null;
  modelProvider: string | null;
  name: string;
  reasoningLevel: string | null;
  sessionCount: number;
  updatedAt: string;
};

function formatProviderLabel(provider: string | null): string {
  if (!provider) {
    return "Not configured";
  }

  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatReasoningLabel(value: string | null): string {
  if (!value) {
    return "Default";
  }

  return value.toUpperCase();
}

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

/**
 * Renders the read-only agent inventory for the dashboard so operators can quickly inspect which
 * agents exist and how many chat sessions each one currently owns.
 */
export function AgentsSection(props: { agents: DashboardAgentRecord[] }) {
  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Agents</CardTitle>
        <CardDescription>
          {props.agents.length} configured agents with their current default model and session count.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {props.agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No agents yet</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              Create an agent to start running chat sessions and environments.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Reasoning</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <Link
                        className="truncate font-medium text-foreground hover:underline"
                        params={{ agentId: agent.id }}
                        to="/agents/$agentId"
                      >
                        {agent.name}
                      </Link>
                      <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">
                        {formatProviderLabel(agent.modelProvider)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{agent.modelName ?? "Not configured"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatReasoningLabel(agent.reasoningLevel)}</Badge>
                  </TableCell>
                  <TableCell>{agent.sessionCount}</TableCell>
                  <TableCell>{formatTimestamp(agent.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
