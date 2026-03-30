import { useNavigate } from "@tanstack/react-router";
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

export type DashboardSessionRecord = {
  agentId: string;
  agentName: string;
  id: string;
  inferredTitle: string | null;
  status: string;
  updatedAt: string;
  userSetTitle: string | null;
};

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function resolveSessionTitle(session: DashboardSessionRecord): string {
  const preferredTitle = session.userSetTitle ?? session.inferredTitle ?? "";
  const trimmedTitle = preferredTitle.trim();
  if (trimmedTitle.length > 0) {
    return trimmedTitle;
  }

  return "Untitled chat";
}

/**
 * Renders the recent session list and makes each session row navigable directly into the chats
 * page so operators can jump from the dashboard into the full transcript view in one click.
 */
export function SessionsSection(props: { sessions: DashboardSessionRecord[] }) {
  const navigate = useNavigate();

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Sessions</CardTitle>
        <CardDescription>
          {props.sessions.length} sessions. Click any row to open the session in chats.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {props.sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No sessions yet</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              Session history will appear here after users start chatting with agents.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.sessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="cursor-pointer"
                  onClick={() => {
                    void navigate({
                      to: "/chats",
                      search: {
                        agentId: session.agentId,
                        sessionId: session.id,
                      },
                    });
                  }}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{resolveSessionTitle(session)}</p>
                      <p className="mt-1 truncate text-[0.7rem] text-muted-foreground">{session.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{session.agentName}</TableCell>
                  <TableCell>
                    <Badge variant={session.status.trim().toLowerCase() === "running" ? "positive" : "secondary"}>
                      {formatStatusLabel(session.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatTimestamp(session.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
