import { Suspense, useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { knowledgeBaseDetailPageQuery } from "./__generated__/knowledgeBaseDetailPageQuery.graphql";
import type { knowledgeBaseDetailPageUpdateArtifactMutation } from "./__generated__/knowledgeBaseDetailPageUpdateArtifactMutation.graphql";
import type { knowledgeBaseDetailPageUpdateMarkdownArtifactMutation } from "./__generated__/knowledgeBaseDetailPageUpdateMarkdownArtifactMutation.graphql";

const knowledgeBaseDetailPageQueryNode = graphql`
  query knowledgeBaseDetailPageQuery($artifactId: ID!) {
    Artifact(id: $artifactId) {
      id
      type
      name
      description
      markdownContent
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

type KnowledgeBaseArtifactEditorState = {
  description: string;
  markdownContent: string;
  name: string;
};

function createArtifactEditorState(): KnowledgeBaseArtifactEditorState {
  return {
    description: "",
    markdownContent: "",
    name: "",
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
          <CardTitle>Loading document…</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading document…
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
  const artifact = data.Artifact;
  const isDocumentArtifact = artifact.type === "markdown_document";
  const isSaving = isUpdateArtifactInFlight || isUpdateMarkdownArtifactInFlight;
  const isSaveDisabled = isSaving
    || editorState.name.trim().length === 0
    || editorState.markdownContent.trim().length === 0;

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
    });
  }, [
    artifact.description,
    artifact.markdownContent,
    artifact.name,
  ]);

  async function saveArtifact() {
    if (isSaveDisabled || !isDocumentArtifact) {
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

      setFetchKey((currentFetchKey) => currentFetchKey + 1);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save document.");
    }
  }

  if (!isDocumentArtifact) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Document not available</CardTitle>
            <CardDescription>
              The Knowledge Base now only shows markdown documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild type="button">
              <Link to="/knowledge-base">Back to Knowledge Base</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <CardTitle>{editorState.name || "Document"}</CardTitle>
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
              placeholder="Short summary for this document."
              value={editorState.description}
            />
          </div>

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
