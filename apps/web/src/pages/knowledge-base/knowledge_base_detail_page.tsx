import { Suspense, useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { ExternalLinkIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { knowledgeBaseDetailPageQuery } from "./__generated__/knowledgeBaseDetailPageQuery.graphql";
import type { knowledgeBaseDetailPageUpdateArtifactMutation } from "./__generated__/knowledgeBaseDetailPageUpdateArtifactMutation.graphql";
import type { knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation } from "./__generated__/knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation.graphql";
import type { knowledgeBaseDetailPageUpdateMarkdownArtifactMutation } from "./__generated__/knowledgeBaseDetailPageUpdateMarkdownArtifactMutation.graphql";

const knowledgeBaseDetailPageQueryNode = graphql`
  query knowledgeBaseDetailPageQuery($artifactId: ID!) {
    Artifact(id: $artifactId) {
      id
      type
      name
      description
      markdownContent
      url
      updatedAt
    }
  }
`;

const knowledgeBaseDetailPageUpdateArtifactMutationNode = graphql`
  mutation knowledgeBaseDetailPageUpdateArtifactMutation($input: UpdateArtifactInput!) {
    UpdateArtifact(input: $input) {
      id
      name
      description
      updatedAt
    }
  }
`;

const knowledgeBaseDetailPageUpdateMarkdownArtifactMutationNode = graphql`
  mutation knowledgeBaseDetailPageUpdateMarkdownArtifactMutation(
    $input: UpdateMarkdownArtifactInput!
  ) {
    UpdateMarkdownArtifact(input: $input) {
      id
      markdownContent
      updatedAt
    }
  }
`;

const knowledgeBaseDetailPageUpdateExternalLinkArtifactMutationNode = graphql`
  mutation knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation(
    $input: UpdateExternalLinkArtifactInput!
  ) {
    UpdateExternalLinkArtifact(input: $input) {
      id
      url
      updatedAt
    }
  }
`;

type KnowledgeBaseArtifactEditorState = {
  description: string;
  markdownContent: string;
  name: string;
  url: string;
};

function createArtifactEditorState(): KnowledgeBaseArtifactEditorState {
  return {
    description: "",
    markdownContent: "",
    name: "",
    url: "",
  };
}

function getGraphQLErrorMessage(
  errors: readonly { readonly message: string }[] | null | undefined,
): string | null {
  const errorMessage = String(errors?.[0]?.message || "").trim();
  return errorMessage || null;
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

function KnowledgeBaseDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Loading artifact…</CardTitle>
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

function KnowledgeBaseDetailPageContent() {
  const { artifactId } = useParams({ strict: false });
  const normalizedArtifactId = String(artifactId || "").trim();
  const { setDetailLabel } = useApplicationBreadcrumb();
  const [fetchKey, setFetchKey] = useState(0);
  const [editorState, setEditorState] = useState<KnowledgeBaseArtifactEditorState>(
    createArtifactEditorState,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (!normalizedArtifactId) {
    throw new Error("Artifact ID is required.");
  }

  const data = useLazyLoadQuery<knowledgeBaseDetailPageQuery>(
    knowledgeBaseDetailPageQueryNode,
    {
      artifactId: normalizedArtifactId,
    },
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const [commitUpdateArtifact, isUpdateArtifactInFlight] =
    useMutation<knowledgeBaseDetailPageUpdateArtifactMutation>(
      knowledgeBaseDetailPageUpdateArtifactMutationNode,
    );
  const [commitUpdateMarkdownArtifact, isUpdateMarkdownArtifactInFlight] =
    useMutation<knowledgeBaseDetailPageUpdateMarkdownArtifactMutation>(
      knowledgeBaseDetailPageUpdateMarkdownArtifactMutationNode,
    );
  const [commitUpdateExternalLinkArtifact, isUpdateExternalLinkArtifactInFlight] =
    useMutation<knowledgeBaseDetailPageUpdateExternalLinkArtifactMutation>(
      knowledgeBaseDetailPageUpdateExternalLinkArtifactMutationNode,
    );
  const artifact = data.Artifact;
  const isDocumentArtifact = artifact.type === "markdown_document";
  const isExternalLinkArtifact = artifact.type === "external_link";
  const isSaving = isUpdateArtifactInFlight
    || isUpdateMarkdownArtifactInFlight
    || isUpdateExternalLinkArtifactInFlight;
  const isSaveDisabled = isSaving
    || editorState.name.trim().length === 0
    || (isDocumentArtifact
      ? editorState.markdownContent.trim().length === 0
      : editorState.url.trim().length === 0);

  useEffect(() => {
    setDetailLabel(artifact.name);

    return () => {
      setDetailLabel(null);
    };
  }, [artifact.name, setDetailLabel]);

  useEffect(() => {
    setEditorState({
      description: artifact.description ?? "",
      markdownContent: artifact.markdownContent ?? "",
      name: artifact.name,
      url: artifact.url ?? "",
    });
  }, [
    artifact.description,
    artifact.markdownContent,
    artifact.name,
    artifact.url,
  ]);

  async function saveArtifact() {
    if (isSaveDisabled) {
      return;
    }

    setErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitUpdateArtifact({
          variables: {
            input: {
              description: editorState.description || null,
              id: artifact.id,
              name: editorState.name,
            },
          },
          onCompleted: (_mutationResponse, errors) => {
            const mutationErrorMessage = getGraphQLErrorMessage(errors);
            if (mutationErrorMessage) {
              reject(new Error(mutationErrorMessage));
              return;
            }

            resolve();
          },
          onError: reject,
        });
      });

      if (isDocumentArtifact) {
        await new Promise<void>((resolve, reject) => {
          commitUpdateMarkdownArtifact({
            variables: {
              input: {
                contentMarkdown: editorState.markdownContent,
                id: artifact.id,
              },
            },
            onCompleted: (_mutationResponse, errors) => {
              const mutationErrorMessage = getGraphQLErrorMessage(errors);
              if (mutationErrorMessage) {
                reject(new Error(mutationErrorMessage));
                return;
              }

              resolve();
            },
            onError: reject,
          });
        });
      } else if (isExternalLinkArtifact) {
        await new Promise<void>((resolve, reject) => {
          commitUpdateExternalLinkArtifact({
            variables: {
              input: {
                id: artifact.id,
                url: editorState.url,
              },
            },
            onCompleted: (_mutationResponse, errors) => {
              const mutationErrorMessage = getGraphQLErrorMessage(errors);
              if (mutationErrorMessage) {
                reject(new Error(mutationErrorMessage));
                return;
              }

              resolve();
            },
            onError: reject,
          });
        });
      }

      setFetchKey((currentFetchKey) => currentFetchKey + 1);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save artifact.");
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <CardTitle>{editorState.name || (isDocumentArtifact ? "Document" : "Link")}</CardTitle>
          <CardDescription>
            Updated {formatTimestamp(artifact.updatedAt)}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 pt-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-detail-name">
              Title
            </label>
            <Input
              id="knowledge-base-detail-name"
              onChange={(event) => {
                setEditorState((currentState) => ({
                  ...currentState,
                  name: event.target.value,
                }));
              }}
              value={editorState.name}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-detail-description">
              Description
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="knowledge-base-detail-description"
              onChange={(event) => {
                setEditorState((currentState) => ({
                  ...currentState,
                  description: event.target.value,
                }));
              }}
              placeholder="Short summary for this artifact."
              value={editorState.description}
            />
          </div>

          {isDocumentArtifact ? (
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-detail-markdown">
                Markdown
              </label>
              <textarea
                className="min-h-[520px] w-full rounded-xl border border-input bg-transparent px-3 py-2 font-mono text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                id="knowledge-base-detail-markdown"
                onChange={(event) => {
                  setEditorState((currentState) => ({
                    ...currentState,
                    markdownContent: event.target.value,
                  }));
                }}
                value={editorState.markdownContent}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-detail-url">
                URL
              </label>
              <Input
                id="knowledge-base-detail-url"
                onChange={(event) => {
                  setEditorState((currentState) => ({
                    ...currentState,
                    url: event.target.value,
                  }));
                }}
                value={editorState.url}
              />
              {editorState.url ? (
                <div className="pt-1">
                  <a
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition hover:text-primary/80"
                    href={editorState.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLinkIcon className="size-3.5" />
                    Open link
                  </a>
                </div>
              ) : null}
            </div>
          )}

          <div className="flex justify-end border-t border-border/50 pt-4">
            <Button
              disabled={isSaveDisabled}
              onClick={() => {
                void saveArtifact();
              }}
              type="button"
            >
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

export function KnowledgeBaseDetailPage() {
  return (
    <Suspense fallback={<KnowledgeBaseDetailPageFallback />}>
      <KnowledgeBaseDetailPageContent />
    </Suspense>
  );
}
