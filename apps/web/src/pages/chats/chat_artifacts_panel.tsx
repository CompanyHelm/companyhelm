import { ExternalLinkIcon, FileTextIcon, GitPullRequestIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SessionArtifactRecord } from "./chats_page_data";

function formatArtifactType(type: SessionArtifactRecord["type"]): string {
  switch (type) {
    case "pull_request":
      return "PR";
    case "external_link":
      return "Link";
    case "markdown_document":
      return "Document";
  }

  return "Artifact";
}

function resolveArtifactIcon(type: SessionArtifactRecord["type"]) {
  switch (type) {
    case "pull_request":
      return GitPullRequestIcon;
    case "external_link":
      return ExternalLinkIcon;
    case "markdown_document":
      return FileTextIcon;
  }

  return FileTextIcon;
}

function resolveArtifactMeta(artifact: SessionArtifactRecord): string | null {
  if (artifact.type === "pull_request") {
    return [
      artifact.pullRequestRepository,
      artifact.pullRequestNumber !== null ? `#${artifact.pullRequestNumber}` : null,
    ].filter(Boolean).join(" • ");
  }

  if (artifact.url) {
    try {
      return new URL(artifact.url).hostname;
    } catch {
      return artifact.url;
    }
  }

  return null;
}

/**
 * Renders the selected session's durable artifacts in the lower-right chat rail so operators can
 * jump to PRs, docs, and links without leaving the active conversation context.
 */
export function ChatArtifactsPanel({
  artifacts,
  dismissingArtifactId,
  onDismissArtifact,
  onOpenArtifact,
}: {
  artifacts: ReadonlyArray<SessionArtifactRecord>;
  dismissingArtifactId: string | null;
  onDismissArtifact: (artifact: SessionArtifactRecord) => void;
  onOpenArtifact: (artifact: SessionArtifactRecord) => void;
}) {
  return (
    <div className="shrink-0 border-t border-border/60 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Artifacts
          </p>
        </div>
        <Badge variant="outline">{artifacts.length}</Badge>
      </div>

      <ul className="grid max-h-64 gap-2 overflow-y-auto" role="list" aria-label="Session artifacts">
        {artifacts.map((artifact) => {
          const ArtifactIcon = resolveArtifactIcon(artifact.type);
          const artifactMeta = resolveArtifactMeta(artifact);
          const isDismissingArtifact = dismissingArtifactId === artifact.id;

          return (
            <li key={artifact.id}>
              <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 transition hover:border-border hover:bg-muted/35">
                <button
                  className="flex min-w-0 flex-1 items-start gap-2 text-left"
                  onClick={() => {
                    onOpenArtifact(artifact);
                  }}
                  type="button"
                >
                  <span className="mt-0.5 rounded-md bg-background p-1.5 text-muted-foreground">
                    <ArtifactIcon className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs font-medium text-foreground">{artifact.name}</span>
                      <Badge className="h-4 shrink-0 px-1 text-[0.55rem] leading-none" variant="outline">
                        {formatArtifactType(artifact.type)}
                      </Badge>
                    </span>
                    {artifactMeta ? (
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{artifactMeta}</span>
                    ) : null}
                  </span>
                </button>
                <button
                  aria-label={`Dismiss ${artifact.name}`}
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isDismissingArtifact}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onDismissArtifact(artifact);
                  }}
                  title={isDismissingArtifact ? "Dismissing..." : "Dismiss artifact"}
                  type="button"
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
