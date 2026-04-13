import { Suspense, useEffect } from "react";
import { Link, useParams, useSearch } from "@tanstack/react-router";
import { ExternalLinkIcon, FileTextIcon, GitPullRequestIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { MarkdownContent } from "@/components/markdown_content";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { cn } from "@/lib/utils";
import type { TaskViewType } from "./task_ui";
import type { artifactDetailPageQuery } from "./__generated__/artifactDetailPageQuery.graphql";

type TaskArtifactType = "markdown_document" | "external_link" | "pull_request";

const artifactDetailPageQueryNode = graphql`
  query artifactDetailPageQuery($artifactId: ID!, $taskId: ID!) {
    Task(id: $taskId) {
      id
      name
    }
    Artifact(id: $artifactId) {
      id
      taskId
      type
      state
      name
      description
      markdownContent
      url
      pullRequestProvider
      pullRequestRepository
      pullRequestNumber
      createdAt
      updatedAt
    }
  }
`;

function formatArtifactType(type: TaskArtifactType): string {
  switch (type) {
    case "markdown_document":
      return "Document";
    case "external_link":
      return "Link";
    case "pull_request":
      return "Pull Request";
  }
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

function resolveArtifactTypeIcon(type: TaskArtifactType) {
  switch (type) {
    case "markdown_document":
      return FileTextIcon;
    case "external_link":
      return ExternalLinkIcon;
    case "pull_request":
      return GitPullRequestIcon;
  }
}

function ArtifactDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Loading artifact…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading artifact…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function ArtifactDetailPageContent() {
  const { artifactId, taskId } = useParams({ strict: false }) as {
    artifactId?: string;
    taskId?: string;
  };
  const search = useSearch({ strict: false }) as { viewType?: TaskViewType };
  const organizationSlug = useCurrentOrganizationSlug();
  const normalizedArtifactId = String(artifactId || "").trim();
  const normalizedTaskId = String(taskId || "").trim();
  const { setDetailLabel } = useApplicationBreadcrumb();
  const currentViewType = search.viewType === "list" ? "list" : search.viewType === "board" ? "board" : undefined;
  if (!normalizedArtifactId || !normalizedTaskId) {
    throw new Error("Task artifact route requires both task ID and artifact ID.");
  }

  const data = useLazyLoadQuery<artifactDetailPageQuery>(
    artifactDetailPageQueryNode,
    {
      artifactId: normalizedArtifactId,
      taskId: normalizedTaskId,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const artifact = data.Artifact;
  const task = data.Task;
  const artifactType = artifact.type as TaskArtifactType;
  const ArtifactIcon = resolveArtifactTypeIcon(artifactType);

  useEffect(() => {
    setDetailLabel(artifact.name);

    return () => {
      setDetailLabel(null);
    };
  }, [artifact.name, setDetailLabel]);

  if (artifact.taskId !== task.id) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Artifact not available</CardTitle>
            <CardDescription>
              This artifact is not attached to the selected task.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              className={buttonVariants({ variant: "default" })}
              params={{ organizationSlug, taskId: normalizedTaskId }}
              search={{
                tab: "artifacts",
                ...(currentViewType ? { viewType: currentViewType } : {}),
              }}
              to={OrganizationPath.route("/tasks/$taskId")}
            >
              Back to Task Artifacts
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-muted p-2 text-muted-foreground">
                  <ArtifactIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="truncate">{artifact.name}</CardTitle>
                  <CardDescription className="mt-1">
                    Attached to task <span className="font-medium text-foreground">{task.name}</span>
                  </CardDescription>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline">{formatArtifactType(artifactType)}</Badge>
              <Badge variant="outline">{artifact.state}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Created</p>
            <p className="mt-3 text-sm text-foreground">{formatTimestamp(artifact.createdAt)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
            <p className="mt-3 text-sm text-foreground">{formatTimestamp(artifact.updatedAt)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Artifact ID</p>
            <p className="mt-3 truncate text-sm text-foreground">{artifact.id}</p>
          </div>
        </CardContent>
      </Card>

      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Description</CardTitle>
          <CardDescription>Summary and context for this artifact.</CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownContent
            content={artifact.description ?? ""}
            emptyClassName="text-muted-foreground"
            emptyLabel="No description."
          />
        </CardContent>
      </Card>

      {artifactType === "markdown_document" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>Rendered markdown document.</CardDescription>
          </CardHeader>
          <CardContent>
            <MarkdownContent
              content={artifact.markdownContent ?? ""}
              emptyClassName="text-muted-foreground"
              emptyLabel="This document is empty."
            />
          </CardContent>
        </Card>
      ) : null}

      {artifactType === "external_link" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>External Link</CardTitle>
            <CardDescription>Open the reference attached to this task.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">URL</p>
              <p className="mt-3 break-all text-sm text-foreground">{artifact.url || "Unavailable"}</p>
            </div>
            {artifact.url ? (
              <div>
                <a
                  className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
                  href={artifact.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLinkIcon />
                  Open Link
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {artifactType === "pull_request" ? (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Pull Request</CardTitle>
            <CardDescription>Delivery target linked to this task.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Provider</p>
              <p className="mt-3 text-sm text-foreground">{artifact.pullRequestProvider || "Unknown"}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Repository</p>
              <p className="mt-3 break-words text-sm text-foreground">{artifact.pullRequestRepository || "Unknown"}</p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card/50 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">PR Number</p>
              <p className="mt-3 text-sm text-foreground">
                {artifact.pullRequestNumber !== null ? `#${artifact.pullRequestNumber}` : "Unknown"}
              </p>
            </div>
            {artifact.url ? (
              <div className="md:col-span-3">
                <a
                  className={cn(buttonVariants({ variant: "default" }), "inline-flex")}
                  href={artifact.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <GitPullRequestIcon />
                  Open Pull Request
                </a>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

export function ArtifactDetailPage() {
  return (
    <Suspense fallback={<ArtifactDetailPageFallback />}>
      <ArtifactDetailPageContent />
    </Suspense>
  );
}
