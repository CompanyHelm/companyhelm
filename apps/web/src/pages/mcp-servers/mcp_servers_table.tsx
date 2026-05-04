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
  authType: "none" | "authorization_header" | "oauth_client_credentials" | "oauth_authorization_code";
  callTimeoutMs: number;
  createdAt: string;
  description: string | null;
  enabled: boolean;
  headersText: string;
  id: string;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  lastValidationStatus: "unknown" | "ok" | "auth_error" | "network_error" | "protocol_error" | "server_error";
  lastValidationToolCount: number | null;
  name: string;
  oauthConnectionStatus: "connected" | "error" | "not_connected" | "reauth_required" | null;
  oauthLastError: string | null;
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
  if (record.authType === "oauth_authorization_code") {
    return record.oauthConnectionStatus === "connected"
      ? "oauth code connected"
      : record.oauthConnectionStatus === "reauth_required"
        ? "oauth code reauth required"
        : record.oauthConnectionStatus === "error"
          ? "oauth code error"
        : "oauth code";
  }
  if (record.authType === "oauth_client_credentials") {
    return record.oauthConnectionStatus === "connected"
      ? "client creds connected"
      : record.oauthConnectionStatus === "reauth_required"
        ? "client creds reauth required"
        : record.oauthConnectionStatus === "error"
          ? "client creds error"
        : "client creds";
  }
  if (record.authType === "authorization_header") {
    return "authorization header";
  }

  return "none";
}

function getAuthBadgeVariant(record: McpServersTableRecord) {
  if (
    (record.authType === "oauth_authorization_code" || record.authType === "oauth_client_credentials")
    && record.oauthConnectionStatus === "connected"
  ) {
    return "positive";
  }
  if (
    (record.authType === "oauth_authorization_code" || record.authType === "oauth_client_credentials")
    && record.oauthConnectionStatus === "reauth_required"
  ) {
    return "destructive";
  }
  if (
    (record.authType === "oauth_authorization_code" || record.authType === "oauth_client_credentials")
    && record.oauthConnectionStatus === "error"
  ) {
    return "warning";
  }

  return "outline";
}

function formatValidationLabel(record: McpServersTableRecord): string {
  if (record.lastValidationStatus === "ok") {
    return record.lastValidationToolCount == null
      ? "validated"
      : `validated · ${record.lastValidationToolCount} tools`;
  }
  if (record.lastValidationStatus === "auth_error") {
    return "auth error";
  }
  if (record.lastValidationStatus === "network_error") {
    return "network error";
  }
  if (record.lastValidationStatus === "protocol_error") {
    return "protocol error";
  }
  if (record.lastValidationStatus === "server_error") {
    return "server error";
  }

  return "not validated";
}

function getValidationBadgeVariant(record: McpServersTableRecord) {
  if (record.lastValidationStatus === "ok") {
    return "positive";
  }
  if (record.lastValidationStatus === "auth_error") {
    return "destructive";
  }
  if (
    record.lastValidationStatus === "network_error"
    || record.lastValidationStatus === "protocol_error"
    || record.lastValidationStatus === "server_error"
  ) {
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
            <TableHead>Validation</TableHead>
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
                  <div className="grid gap-1">
                    <Badge variant={getAuthBadgeVariant(mcpServer)}>
                      {formatAuthLabel(mcpServer)}
                    </Badge>
                    {mcpServer.oauthLastError ? (
                      <span className="max-w-xs text-xs text-muted-foreground">
                        {mcpServer.oauthLastError}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="grid gap-1">
                    <Badge variant={getValidationBadgeVariant(mcpServer)}>
                      {formatValidationLabel(mcpServer)}
                    </Badge>
                    {mcpServer.lastValidationError ? (
                      <span className="max-w-xs text-xs text-muted-foreground">
                        {mcpServer.lastValidationError}
                      </span>
                    ) : mcpServer.lastValidatedAt ? (
                      <span className="max-w-xs text-xs text-muted-foreground">
                        {formatTimestamp(mcpServer.lastValidatedAt)}
                      </span>
                    ) : null}
                  </div>
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
