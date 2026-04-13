import { Suspense, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PencilIcon } from "lucide-react";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { MarkdownContent } from "@/components/markdown_content";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
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

type EditableField = "name" | "description" | "markdownContent";

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

function renderSavedTimestamp(): string {
  return `Saved ${formatTimestamp(new Date().toISOString())}`;
}

function KnowledgeBaseMarkdown({ content, emptyLabel }: { content: string; emptyLabel: string }) {
  return <MarkdownContent content={content} emptyClassName="text-muted-foreground" emptyLabel={emptyLabel} />;
}

function KnowledgeBaseDetailPageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Loading document…</CardTitle>
        </CardHeader>
      </Card>
      <Card variant="page" className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/60 shadow-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-4">
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading document…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function KnowledgeBaseDetailPageContent() {
  const organizationSlug = useCurrentOrganizationSlug();
  const { artifactId } = useParams({ strict: false }) as { artifactId?: string };
  const normalizedArtifactId = String(artifactId || "").trim();
  const { setDetailLabel } = useApplicationBreadcrumb();
  const [editorState, setEditorState] = useState<KnowledgeBaseArtifactEditorState>(
    createArtifactEditorState,
  );
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const pendingSaveFieldRef = useRef<EditableField | null>(null);
  if (!normalizedArtifactId) {
    throw new Error("Artifact ID is required.");
  }

  const data = useLazyLoadQuery<knowledgeBaseDetailPageQuery>(
    knowledgeBaseDetailPageQueryNode,
    {
      artifactId: normalizedArtifactId,
    },
    {
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

  function startEditing(field: EditableField) {
    setErrorMessage(null);
    setSavedMessage(null);
    setEditingField(field);
  }

  async function saveField(field: EditableField) {
    if (!isDocumentArtifact || pendingSaveFieldRef.current === field) {
      return;
    }

    setErrorMessage(null);

    if (field === "name" || field === "description") {
      if (editorState.name.trim().length === 0) {
        setErrorMessage("Title is required.");
        return;
      }

      const hasMetadataChanges = editorState.name !== artifact.name
        || editorState.description !== (artifact.description ?? "");
      if (!hasMetadataChanges) {
        setEditingField((currentField) => (currentField === field ? null : currentField));
        return;
      }

      try {
        pendingSaveFieldRef.current = field;
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

        setSavedMessage(renderSavedTimestamp());
        setEditingField((currentField) => (currentField === field ? null : currentField));
      } catch (error: unknown) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to save document.");
      } finally {
        pendingSaveFieldRef.current = null;
      }

      return;
    }

    if (editorState.markdownContent.trim().length === 0) {
      setErrorMessage("Content is required.");
      return;
    }

    if (editorState.markdownContent === (artifact.markdownContent ?? "")) {
      setEditingField((currentField) => (currentField === field ? null : currentField));
      return;
    }

    try {
      pendingSaveFieldRef.current = field;
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

      setSavedMessage(renderSavedTimestamp());
      setEditingField((currentField) => (currentField === field ? null : currentField));
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save document.");
    } finally {
      pendingSaveFieldRef.current = null;
    }
  }

  function handleFieldKeyDown(field: EditableField, event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key !== "Enter") {
      return;
    }

    if (field === "markdownContent" || field === "description") {
      if (event.shiftKey) {
        return;
      }
    }

    event.preventDefault();
    void saveField(field);
  }

  if (!isDocumentArtifact) {
    return (
      <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Document not available</CardTitle>
            <CardDescription>
              The Knowledge Base now only shows markdown documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild type="button">
              <Link params={{ organizationSlug }} to={OrganizationPath.route("/knowledge-base")}>Back to Knowledge Base</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <Card variant="page" className="shrink-0 rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Title
              </p>
              {editingField === "name" ? (
                <Input
                  autoFocus
                  className="mt-2 h-10 text-lg font-semibold"
                  onBlur={() => {
                    void saveField("name");
                  }}
                  onChange={(event) => {
                    setSavedMessage(null);
                    setEditorState((currentState) => ({
                      ...currentState,
                      name: event.target.value,
                    }));
                  }}
                  onKeyDown={(event) => {
                    handleFieldKeyDown("name", event);
                  }}
                  value={editorState.name}
                />
              ) : (
                <CardTitle className="mt-2 text-lg">{artifact.name}</CardTitle>
              )}
            </div>

            <Button
              aria-label="Edit title"
              disabled={isSaving}
              onClick={() => {
                startEditing("name");
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PencilIcon />
            </Button>
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Description
              </p>
              {editingField === "description" ? (
                <textarea
                  autoFocus
                  className="mt-2 min-h-24 w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onBlur={() => {
                    void saveField("description");
                  }}
                  onChange={(event) => {
                    setSavedMessage(null);
                    setEditorState((currentState) => ({
                      ...currentState,
                      description: event.target.value,
                    }));
                  }}
                  onKeyDown={(event) => {
                    handleFieldKeyDown("description", event);
                  }}
                  placeholder="Short summary for this document."
                  value={editorState.description}
                />
              ) : (
                <div className="mt-2">
                  <KnowledgeBaseMarkdown
                    content={artifact.description ?? ""}
                    emptyLabel="Add a short summary for this document."
                  />
                </div>
              )}
            </div>

            <Button
              aria-label="Edit description"
              disabled={isSaving}
              onClick={() => {
                startEditing("description");
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PencilIcon />
            </Button>
          </div>

          <CardDescription className="mt-4 flex items-center justify-between gap-4 border-t border-border/50 pt-4">
            <span>Updated {formatTimestamp(artifact.updatedAt)}</span>
            <span>{isSaving ? "Saving…" : savedMessage || ""}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card variant="page" className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Content</CardTitle>
              <CardDescription className="mt-1">
                {editingField === "markdownContent"
                  ? "Press Enter to save. Use Shift+Enter for a new line."
                  : "Rendered markdown document."}
              </CardDescription>
            </div>
            <Button
              aria-label="Edit content"
              disabled={isSaving}
              onClick={() => {
                startEditing("markdownContent");
              }}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PencilIcon />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {editingField === "markdownContent" ? (
            <textarea
              autoFocus
              className="min-h-0 flex-1 resize-none rounded-xl border border-input bg-transparent px-4 py-3 font-mono text-sm leading-6 text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onBlur={() => {
                void saveField("markdownContent");
              }}
              onChange={(event) => {
                setSavedMessage(null);
                setEditorState((currentState) => ({
                  ...currentState,
                  markdownContent: event.target.value,
                }));
              }}
              onKeyDown={(event) => {
                handleFieldKeyDown("markdownContent", event);
              }}
              value={editorState.markdownContent}
            />
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto pr-2">
              <KnowledgeBaseMarkdown
                content={artifact.markdownContent ?? ""}
                emptyLabel="This document is empty."
              />
            </div>
          )}
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
