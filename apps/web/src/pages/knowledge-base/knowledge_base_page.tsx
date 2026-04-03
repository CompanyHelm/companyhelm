import { Suspense, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileTextIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CreateDocumentDialog,
  type CreateDocumentDialogEditorState,
} from "./create_document_dialog";
import type { knowledgeBasePageCreateMarkdownArtifactMutation } from "./__generated__/knowledgeBasePageCreateMarkdownArtifactMutation.graphql";
import type { knowledgeBasePageDeleteArtifactMutation } from "./__generated__/knowledgeBasePageDeleteArtifactMutation.graphql";
import type { knowledgeBasePageQuery } from "./__generated__/knowledgeBasePageQuery.graphql";

const knowledgeBasePageQueryNode = graphql`
  query knowledgeBasePageQuery {
    Artifacts(input: { scopeType: "company" }) {
      id
      state
      type
      name
      description
      markdownContent
      updatedAt
    }
  }
`;

const knowledgeBasePageCreateMarkdownArtifactMutationNode = graphql`
  mutation knowledgeBasePageCreateMarkdownArtifactMutation(
    $input: CreateMarkdownArtifactInput!
  ) {
    CreateMarkdownArtifact(input: $input) {
      id
      type
      name
      description
      markdownContent
      updatedAt
    }
  }
`;

const knowledgeBasePageDeleteArtifactMutationNode = graphql`
  mutation knowledgeBasePageDeleteArtifactMutation($input: DeleteArtifactInput!) {
    DeleteArtifact(input: $input) {
      id
    }
  }
`;

type KnowledgeBaseArtifact = knowledgeBasePageQuery["response"]["Artifacts"][number];

function createEmptyDocumentEditorState(): CreateDocumentDialogEditorState {
  return {
    name: "",
  };
}

function getGraphQLErrorMessage(
  errors: readonly { readonly message: string }[] | null | undefined,
): string | null {
  const errorMessage = String(errors?.[0]?.message || "").trim();
  return errorMessage || null;
}

function isActiveDocumentArtifact(artifact: KnowledgeBaseArtifact): boolean {
  return artifact.type === "markdown_document" && artifact.state !== "archived";
}

function summarizeArtifactText(value: string): string {
  return value
    .replace(/^#+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getDocumentPreview(artifact: KnowledgeBaseArtifact): string {
  const description = String(artifact.description || "").trim();
  if (description.length > 0) {
    return description;
  }

  return summarizeArtifactText(String(artifact.markdownContent || ""));
}

function compareArtifactsByUpdatedAt(
  leftArtifact: KnowledgeBaseArtifact,
  rightArtifact: KnowledgeBaseArtifact,
): number {
  const leftTimestamp = Date.parse(leftArtifact.updatedAt);
  const rightTimestamp = Date.parse(rightArtifact.updatedAt);
  const normalizedLeft = Number.isNaN(leftTimestamp) ? 0 : leftTimestamp;
  const normalizedRight = Number.isNaN(rightTimestamp) ? 0 : rightTimestamp;
  return normalizedRight - normalizedLeft;
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

function KnowledgeBasePageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold text-foreground">Company documents</h1>
          <p className="text-xs text-muted-foreground">
            Shared markdown documents for durable company knowledge.
          </p>
        </div>
        <Button disabled size="sm">
          <PlusIcon />
          New document
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="rounded-2xl border border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle>Loading document…</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-24 rounded-xl border border-dashed border-border/70 bg-muted/20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}

function KnowledgeBasePageContent() {
  const navigate = useNavigate();
  const [isCreateDocumentDialogOpen, setCreateDocumentDialogOpen] = useState(false);
  const [createDocumentState, setCreateDocumentState] = useState<CreateDocumentDialogEditorState>(
    createEmptyDocumentEditorState,
  );
  const [createDocumentErrorMessage, setCreateDocumentErrorMessage] = useState<string | null>(null);
  const [deleteDocumentErrorMessage, setDeleteDocumentErrorMessage] = useState<string | null>(null);
  const [deletedArtifactIds, setDeletedArtifactIds] = useState<Set<string>>(() => new Set());
  const data = useLazyLoadQuery<knowledgeBasePageQuery>(
    knowledgeBasePageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateMarkdownArtifact, isCreateMarkdownArtifactInFlight] =
    useMutation<knowledgeBasePageCreateMarkdownArtifactMutation>(
      knowledgeBasePageCreateMarkdownArtifactMutationNode,
    );
  const [commitDeleteArtifact, isDeleteArtifactInFlight] =
    useMutation<knowledgeBasePageDeleteArtifactMutation>(
      knowledgeBasePageDeleteArtifactMutationNode,
    );
  const documentArtifacts = [...data.Artifacts
    .filter(isActiveDocumentArtifact)
    .filter((artifact) => !deletedArtifactIds.has(artifact.id))]
    .sort(compareArtifactsByUpdatedAt);
  const isCreateDocumentDisabled = isCreateMarkdownArtifactInFlight
    || createDocumentState.name.trim().length === 0;

  async function createDocumentArtifact() {
    if (isCreateDocumentDisabled) {
      return;
    }

    setCreateDocumentErrorMessage(null);

    try {
      const response = await new Promise<
        knowledgeBasePageCreateMarkdownArtifactMutation["response"]
      >((resolve, reject) => {
        commitCreateMarkdownArtifact({
          variables: {
            input: {
              contentMarkdown: `# ${createDocumentState.name}\n\n`,
              name: createDocumentState.name,
              scopeType: "company",
            },
          },
          onCompleted: (mutationResponse, errors) => {
            const mutationErrorMessage = getGraphQLErrorMessage(errors);
            if (mutationErrorMessage) {
              reject(new Error(mutationErrorMessage));
              return;
            }

            resolve(mutationResponse);
          },
          onError: reject,
        });
      });

      setCreateDocumentDialogOpen(false);
      setCreateDocumentState(createEmptyDocumentEditorState());
      void navigate({
        params: {
          artifactId: response.CreateMarkdownArtifact.id,
        },
        to: "/knowledge-base/$artifactId",
      });
    } catch (error: unknown) {
      setCreateDocumentErrorMessage(
        error instanceof Error ? error.message : "Failed to create document.",
      );
    }
  }

  async function deleteDocumentArtifact(artifactId: string) {
    if (isDeleteArtifactInFlight) {
      return;
    }

    setDeleteDocumentErrorMessage(null);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDeleteArtifact({
          variables: {
            input: {
              id: artifactId,
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

      setDeletedArtifactIds((currentDeletedArtifactIds) => {
        const nextDeletedArtifactIds = new Set(currentDeletedArtifactIds);
        nextDeletedArtifactIds.add(artifactId);
        return nextDeletedArtifactIds;
      });
    } catch (error: unknown) {
      setDeleteDocumentErrorMessage(
        error instanceof Error ? error.message : "Failed to delete document.",
      );
    }
  }

  return (
    <>
      <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-foreground">Company documents</h1>
            <p className="text-xs text-muted-foreground">
              Shared markdown documents for durable company knowledge.
            </p>
          </div>
          <Button
            onClick={() => {
              setCreateDocumentErrorMessage(null);
              setCreateDocumentState(createEmptyDocumentEditorState());
              setCreateDocumentDialogOpen(true);
            }}
            size="sm"
          >
            <PlusIcon />
            New document
          </Button>
        </div>

        {deleteDocumentErrorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {deleteDocumentErrorMessage}
          </div>
        ) : null}

        {documentArtifacts.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
            <p className="text-sm font-medium text-foreground">No documents yet</p>
            <p className="mt-2 max-w-sm text-xs/relaxed text-muted-foreground">
              Create the first company document to capture durable knowledge and shared reference material.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {documentArtifacts.map((artifact) => (
              <div key={artifact.id} className="relative">
                <Link
                  className="group block"
                  params={{ artifactId: artifact.id }}
                  to="/knowledge-base/$artifactId"
                >
                  <Card className="h-full rounded-2xl border border-border/60 bg-card/70 shadow-sm transition group-hover:border-border/80 group-hover:bg-card group-hover:shadow-md">
                    <CardHeader className="border-b border-border/40 pr-14">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
                          <FileTextIcon className="size-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate">{artifact.name}</CardTitle>
                          <CardDescription className="mt-1">
                            Updated {formatTimestamp(artifact.updatedAt)}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="line-clamp-6 text-sm/relaxed text-muted-foreground">
                        {getDocumentPreview(artifact) || "Open this document to start writing."}
                      </p>
                    </CardContent>
                  </Card>
                </Link>

                <Button
                  aria-label={`Delete ${artifact.name}`}
                  className="absolute right-4 top-4 z-10"
                  disabled={isDeleteArtifactInFlight}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void deleteDocumentArtifact(artifact.id);
                  }}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateDocumentDialog
        errorMessage={createDocumentErrorMessage}
        isOpen={isCreateDocumentDialogOpen}
        isSaveDisabled={isCreateDocumentDisabled}
        isSaving={isCreateMarkdownArtifactInFlight}
        onEditorStateChange={setCreateDocumentState}
        onOpenChange={(isOpen) => {
          setCreateDocumentDialogOpen(isOpen);
          if (!isOpen) {
            setCreateDocumentErrorMessage(null);
            setCreateDocumentState(createEmptyDocumentEditorState());
          }
        }}
        onSave={() => {
          void createDocumentArtifact();
        }}
        state={createDocumentState}
      />
    </>
  );
}

export function KnowledgeBasePage() {
  return (
    <Suspense fallback={<KnowledgeBasePageFallback />}>
      <KnowledgeBasePageContent />
    </Suspense>
  );
}
