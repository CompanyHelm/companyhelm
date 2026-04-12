import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type McpServersTableRecord = {
  authType: "none" | "custom_headers" | "oauth";
  callTimeoutMs: number;
  createdAt: string;
  description: string | null;
  enabled: boolean;
  headersText: string;
  id: string;
  name: string;
  oauthConnectionStatus: "connected" | "degraded" | "not_connected" | null;
  updatedAt: string;
  url: string;
};

interface McpServersTableProps {
  isLoading: boolean;
  mcpServers: McpServersTableRecord[];
  onSelect(mcpServerId: string): void;
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

function formatAuthLabel(record: McpServersTableRecord): string {
  if (record.authType === "oauth") {
    return record.oauthConnectionStatus ?? "not_connected";
  }
  if (record.authType === "custom_headers") {
    return "custom headers";
  }

  return "none";
}

function getAuthBadgeVariant(record: McpServersTableRecord) {
  if (record.authType === "oauth" && record.oauthConnectionStatus === "connected") {
    return "positive";
  }
  if (record.authType === "oauth" && record.oauthConnectionStatus === "degraded") {
    return "warning";
  }

  return "outline";
}

export function McpServersTable(props: McpServersTableProps) {
  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading MCP servers…
      </div>
    );
  }

  if (props.mcpServers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        No MCP servers configured yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Auth</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.mcpServers.map((mcpServer) => {
            return (
              <TableRow
                className="cursor-pointer"
                key={mcpServer.id}
                onClick={() => {
                  props.onSelect(mcpServer.id);
                }}
              >
                <TableCell>
                  <div className="grid gap-1">
                    <span className="font-medium text-foreground">{mcpServer.name}</span>
                    <span className="max-w-sm text-xs text-muted-foreground">
                      {mcpServer.description?.trim() || "No description"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={getAuthBadgeVariant(mcpServer)}>
                    {formatAuthLabel(mcpServer)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="block max-w-md truncate font-mono text-xs text-muted-foreground">
                    {mcpServer.url}
                  </span>
                </TableCell>
                <TableCell>{mcpServer.enabled ? "Yes" : "No"}</TableCell>
                <TableCell>{formatTimestamp(mcpServer.updatedAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
