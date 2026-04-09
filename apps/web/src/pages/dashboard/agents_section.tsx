import { Link, useNavigate } from "@tanstack/react-router";
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
import { formatProviderLabel } from "../model-provider-credentials/provider_label";

export type DashboardAgentRecord = {
  id: string;
  modelName: string | null;
  modelProvider: string | null;
  name: string;
  reasoningLevel: string | null;
  sessionCount: number;
  updatedAt: string;
};

function formatDashboardProviderLabel(provider: string | null): string {
  if (!provider) {
    return "Not configured";
  }

  return formatProviderLabel(provider);
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
export function AgentsSection(props: { agents: DashboardAgentRecord[]; totalCount: number }) {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardAction>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            params={{ organizationSlug }}
            to={OrganizationPath.route("/agents")}
          >
            Show all
          </Link>
        </CardAction>
        <CardTitle>Agents</CardTitle>
        <CardDescription>
          Showing {props.agents.length} of {props.totalCount} configured agents with their current
          default model and active chat count.
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
                <TableHead>Chats</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.agents.map((agent) => (
                <TableRow
                  key={agent.id}
                  className="cursor-pointer"
                  onClick={() => {
                    void navigate({
                      params: { agentId: agent.id, organizationSlug },
                      to: OrganizationPath.route("/agents/$agentId"),
                    });
                  }}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{agent.name}</p>
                      <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">
                        {formatDashboardProviderLabel(agent.modelProvider)}
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
