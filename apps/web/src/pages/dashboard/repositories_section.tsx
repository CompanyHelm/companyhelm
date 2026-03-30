import { Link } from "@tanstack/react-router";
import { ExternalLinkIcon, FolderGit2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

export type DashboardRepositoryRecord = {
  archived: boolean;
  defaultBranch: string | null;
  fullName: string;
  githubInstallationId: string;
  htmlUrl: string | null;
  id: string;
  isPrivate: boolean;
  name: string;
  updatedAt: string;
};

export type DashboardInstallationRecord = {
  createdAt: string;
  id: string;
  installationId: string;
};

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
 * Shows the cached GitHub repository inventory across every linked installation so operators can
 * audit which repos are currently available to the company without drilling into the repositories
 * management page first.
 */
export function RepositoriesSection(props: {
  installations: DashboardInstallationRecord[];
  repositories: DashboardRepositoryRecord[];
  totalCount: number;
}) {
  const installationLabelById = new Map(
    props.installations.map((installation) => [
      installation.id,
      installation.installationId,
    ]),
  );

  return (
    <Card className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardAction>
          <Link className="text-xs font-medium text-primary hover:underline" to="/repositories">
            Show all
          </Link>
        </CardAction>
        <CardTitle>Repositories</CardTitle>
        <CardDescription>
          Showing {props.repositories.length} of {props.totalCount} repositories cached across{" "}
          {props.installations.length} GitHub installations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {props.repositories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No repositories yet</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              Link a GitHub installation to populate the repository inventory.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Installation</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.repositories.map((repository) => (
                <TableRow key={repository.id}>
                  <TableCell>
                    <div className="flex min-w-0 items-start gap-2">
                      <FolderGit2Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate font-medium text-foreground">{repository.fullName}</p>
                          {repository.htmlUrl ? (
                            <a
                              className="shrink-0 text-muted-foreground hover:text-foreground"
                              href={repository.htmlUrl}
                              rel="noreferrer"
                              target="_blank"
                            >
                              <ExternalLinkIcon className="h-3.5 w-3.5" />
                            </a>
                          ) : null}
                        </div>
                        {repository.archived ? (
                          <p className="mt-1 text-[0.7rem] text-muted-foreground">Archived</p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {installationLabelById.get(repository.githubInstallationId) ?? repository.githubInstallationId}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{repository.isPrivate ? "Private" : "Public"}</Badge>
                  </TableCell>
                  <TableCell>{repository.defaultBranch ?? "—"}</TableCell>
                  <TableCell>{formatTimestamp(repository.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
