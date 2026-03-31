import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ExternalLinkIcon, FileTextIcon, Link2Icon, PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CreateDocumentDialog,
  type CreateDocumentDialogEditorState,
} from "./create_document_dialog";
import type { knowledgeBasePageCreateExternalLinkArtifactMutation } from "./__generated__/knowledgeBasePageCreateExternalLinkArtifactMutation.graphql";
import type { knowledgeBasePageCreateMarkdownArtifactMutation } from "./__generated__/knowledgeBasePageCreateMarkdownArtifactMutation.graphql";
import type { knowledgeBasePageQuery } from "./__generated__/knowledgeBasePageQuery.graphql";
import type { knowledgeBasePageUpdateArtifactMutation } from "./__generated__/knowledgeBasePageUpdateArtifactMutation.graphql";
import type { knowledgeBasePageUpdateExternalLinkArtifactMutation } from "./__generated__/knowledgeBasePageUpdateExternalLinkArtifactMutation.graphql";

const knowledgeBasePageQueryNode = graphql`
  query knowledgeBasePageQuery {
    Artifacts(input: { scopeType: "company" }) {
      id
      taskId
      scopeType
      type
      state
      name
      description
      markdownContent
      url
      createdAt
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

const knowledgeBasePageCreateExternalLinkArtifactMutationNode = graphql`
  mutation knowledgeBasePageCreateExternalLinkArtifactMutation(
    $input: CreateExternalLinkArtifactInput!
  ) {
    CreateExternalLinkArtifact(input: $input) {
      id
      type
      name
      description
      url
      updatedAt
    }
  }
`;

const knowledgeBasePageUpdateArtifactMutationNode = graphql`
  mutation knowledgeBasePageUpdateArtifactMutation($input: UpdateArtifactInput!) {
    UpdateArtifact(input: $input) {
      id
      name
      description
      updatedAt
    }
  }
`;

const knowledgeBasePageUpdateExternalLinkArtifactMutationNode = graphql`
  mutation knowledgeBasePageUpdateExternalLinkArtifactMutation(
    $input: UpdateExternalLinkArtifactInput!
  ) {
    UpdateExternalLinkArtifact(input: $input) {
      id
      url
      updatedAt
    }
  }
`;

type KnowledgeBaseTab = "documents" | "links";

type KnowledgeBasePageSearch = {
  tab?: string;
};

type KnowledgeBaseArtifact = knowledgeBasePageQuery["response"]["Artifacts"][number];

type KnowledgeBaseLinkEditorState = {
  description: string;
  name: string;
  url: string;
};

function createEmptyLinkEditorState(): KnowledgeBaseLinkEditorState {
  return {
    description: "",
    name: "",
    url: "",
  };
}

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

function resolveKnowledgeBaseTab(tabValue: string | undefined): KnowledgeBaseTab {
  return tabValue === "links" ? "links" : "documents";
}

function isDocumentArtifact(artifact: KnowledgeBaseArtifact): boolean {
  return artifact.type === "markdown_document";
}

function isExternalLinkArtifact(artifact: KnowledgeBaseArtifact): boolean {
  return artifact.type === "external_link";
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

function getLinkPreview(artifact: KnowledgeBaseArtifact): string {
  const description = String(artifact.description || "").trim();
  if (description.length > 0) {
    return description;
  }

  return String(artifact.url || "").trim();
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

function KnowledgeBasePageFallback() {
  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button className="h-9 rounded-full border border-border/60 bg-muted px-4 text-sm" disabled variant="ghost">
            Documents
          </Button>
          <Button className="h-9 rounded-full border border-border/40 px-4 text-sm" disabled variant="ghost">
            Links
          </Button>
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

function KnowledgeBaseDocumentsView(props: {
  artifacts: KnowledgeBaseArtifact[];
}) {
  if (props.artifacts.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 px-6 text-center">
        <p className="text-sm font-medium text-foreground">No documents yet</p>
        <p className="mt-2 max-w-sm text-xs/relaxed text-muted-foreground">
          Create the first company document to capture durable knowledge and shared reference material.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {props.artifacts.map((artifact) => (
        <Link
          key={artifact.id}
          className="group block"
          params={{ artifactId: artifact.id }}
          to="/knowledge-base/$artifactId"
        >
          <Card className="h-full rounded-2xl border border-border/60 bg-card/70 shadow-sm transition group-hover:border-border/80 group-hover:bg-card group-hover:shadow-md">
            <CardHeader className="border-b border-border/40">
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
      ))}
    </div>
  );
}

function KnowledgeBaseLinksView(props: {
  artifacts: KnowledgeBaseArtifact[];
  editorState: KnowledgeBaseLinkEditorState;
  errorMessage: string | null;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onEditorStateChange: (state: KnowledgeBaseLinkEditorState) => void;
  onSave: () => void;
  onSelectArtifact: (artifactId: string) => void;
  onStartCreate: () => void;
  selectedArtifactId: string | null;
}) {
  const selectedArtifact = props.selectedArtifactId && props.selectedArtifactId !== "new"
    ? props.artifacts.find((artifact) => artifact.id === props.selectedArtifactId) ?? null
    : null;
  const isCreating = props.selectedArtifactId === "new";

  return (
    <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="min-h-0 rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <CardTitle>Company links</CardTitle>
          <CardDescription>Shared external references and resources.</CardDescription>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto pt-4">
          {props.artifacts.length === 0 ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center">
              <p className="text-sm font-medium text-foreground">No links yet</p>
              <p className="mt-2 max-w-xs text-xs/relaxed text-muted-foreground">
                Add the first company link to keep shared references in one place.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {props.artifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  className={`flex w-full flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition ${
                    props.selectedArtifactId === artifact.id
                      ? "border-border/70 bg-muted/70"
                      : "border-transparent bg-transparent hover:border-border/50 hover:bg-muted/40"
                  }`}
                  onClick={() => {
                    props.onSelectArtifact(artifact.id);
                  }}
                  type="button"
                >
                  <div className="flex w-full items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
                      <Link2Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{artifact.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Updated {formatTimestamp(artifact.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <p className="line-clamp-3 text-xs/relaxed text-muted-foreground">
                    {getLinkPreview(artifact)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-h-0 rounded-2xl border border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/50">
          <CardTitle>{isCreating ? "New link" : props.editorState.name || "Link"}</CardTitle>
          <CardDescription>
            {isCreating
              ? "Add a new company-level external reference."
              : `Updated ${selectedArtifact ? formatTimestamp(selectedArtifact.updatedAt) : "recently"}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
          {props.errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {props.errorMessage}
            </div>
          ) : null}

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-link-name">
              Name
            </label>
            <Input
              id="knowledge-base-link-name"
              onChange={(event) => {
                props.onEditorStateChange({
                  ...props.editorState,
                  name: event.target.value,
                });
              }}
              placeholder="Repository handbook"
              value={props.editorState.name}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-link-description">
              Description
            </label>
            <textarea
              className="min-h-24 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              id="knowledge-base-link-description"
              onChange={(event) => {
                props.onEditorStateChange({
                  ...props.editorState,
                  description: event.target.value,
                });
              }}
              placeholder="Short summary for the link list."
              value={props.editorState.description}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-link-url">
              URL
            </label>
            <Input
              id="knowledge-base-link-url"
              onChange={(event) => {
                props.onEditorStateChange({
                  ...props.editorState,
                  url: event.target.value,
                });
              }}
              placeholder="https://example.com/reference"
              value={props.editorState.url}
            />
            {props.editorState.url ? (
              <div className="pt-1">
                <a
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition hover:text-primary/80"
                  href={props.editorState.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLinkIcon className="size-3.5" />
                  Open link
                </a>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-4">
            {isCreating ? (
              <Button
                onClick={() => {
                  props.onStartCreate();
                }}
                type="button"
                variant="ghost"
              >
                Reset
              </Button>
            ) : null}
            <Button
              disabled={props.isSaveDisabled}
              onClick={props.onSave}
              type="button"
            >
              {props.isSaving ? "Saving…" : isCreating ? "Create link" : "Save changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KnowledgeBasePageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as KnowledgeBasePageSearch;
  const activeTab = resolveKnowledgeBaseTab(search.tab);
  const [fetchKey, setFetchKey] = useState(0);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [linkEditorState, setLinkEditorState] = useState<KnowledgeBaseLinkEditorState>(
    createEmptyLinkEditorState,
  );
  const [linkErrorMessage, setLinkErrorMessage] = useState<string | null>(null);
  const [isCreateDocumentDialogOpen, setCreateDocumentDialogOpen] = useState(false);
  const [createDocumentState, setCreateDocumentState] = useState<CreateDocumentDialogEditorState>(
    createEmptyDocumentEditorState,
  );
  const [createDocumentErrorMessage, setCreateDocumentErrorMessage] = useState<string | null>(null);
  const data = useLazyLoadQuery<knowledgeBasePageQuery>(
    knowledgeBasePageQueryNode,
    {},
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateMarkdownArtifact, isCreateMarkdownArtifactInFlight] =
    useMutation<knowledgeBasePageCreateMarkdownArtifactMutation>(
      knowledgeBasePageCreateMarkdownArtifactMutationNode,
    );
  const [commitCreateExternalLinkArtifact, isCreateExternalLinkArtifactInFlight] =
    useMutation<knowledgeBasePageCreateExternalLinkArtifactMutation>(
      knowledgeBasePageCreateExternalLinkArtifactMutationNode,
    );
  const [commitUpdateArtifact, isUpdateArtifactInFlight] =
    useMutation<knowledgeBasePageUpdateArtifactMutation>(
      knowledgeBasePageUpdateArtifactMutationNode,
    );
  const [commitUpdateExternalLinkArtifact, isUpdateExternalLinkArtifactInFlight] =
    useMutation<knowledgeBasePageUpdateExternalLinkArtifactMutation>(
      knowledgeBasePageUpdateExternalLinkArtifactMutationNode,
    );
  const documentArtifacts = useMemo(() => {
    return [...data.Artifacts.filter(isDocumentArtifact)].sort(compareArtifactsByUpdatedAt);
  }, [data.Artifacts]);
  const linkArtifacts = useMemo(() => {
    return [...data.Artifacts.filter(isExternalLinkArtifact)].sort(compareArtifactsByUpdatedAt);
  }, [data.Artifacts]);
  const selectedLinkArtifact = selectedLinkId && selectedLinkId !== "new"
    ? linkArtifacts.find((artifact) => artifact.id === selectedLinkId) ?? null
    : null;
  const isCreatingLink = selectedLinkId === "new";
  const isLinkSaving = isCreateExternalLinkArtifactInFlight
    || isUpdateArtifactInFlight
    || isUpdateExternalLinkArtifactInFlight;
  const isLinkSaveDisabled = isLinkSaving
    || linkEditorState.name.trim().length === 0
    || linkEditorState.url.trim().length === 0;
  const isCreateDocumentDisabled = isCreateMarkdownArtifactInFlight
    || createDocumentState.name.trim().length === 0;

  useEffect(() => {
    if (selectedLinkId === "new") {
      return;
    }

    if (selectedLinkId && linkArtifacts.some((artifact) => artifact.id === selectedLinkId)) {
      return;
    }

    if (linkArtifacts[0]) {
      setSelectedLinkId(linkArtifacts[0].id);
      return;
    }

    setSelectedLinkId("new");
  }, [linkArtifacts, selectedLinkId]);

  useEffect(() => {
    if (selectedLinkId === "new") {
      setLinkEditorState(createEmptyLinkEditorState());
      return;
    }

    if (!selectedLinkArtifact) {
      return;
    }

    setLinkEditorState({
      description: selectedLinkArtifact.description ?? "",
      name: selectedLinkArtifact.name,
      url: selectedLinkArtifact.url ?? "",
    });
  }, [selectedLinkArtifact, selectedLinkId]);

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

  async function saveLinkArtifact() {
    if (isLinkSaveDisabled) {
      return;
    }

    setLinkErrorMessage(null);

    try {
      if (isCreatingLink) {
        const response = await new Promise<
          knowledgeBasePageCreateExternalLinkArtifactMutation["response"]
        >((resolve, reject) => {
          commitCreateExternalLinkArtifact({
            variables: {
              input: {
                description: linkEditorState.description || null,
                name: linkEditorState.name,
                scopeType: "company",
                url: linkEditorState.url,
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

        setSelectedLinkId(response.CreateExternalLinkArtifact.id);
      } else if (selectedLinkId) {
        await new Promise<void>((resolve, reject) => {
          commitUpdateArtifact({
            variables: {
              input: {
                description: linkEditorState.description || null,
                id: selectedLinkId,
                name: linkEditorState.name,
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
          commitUpdateExternalLinkArtifact({
            variables: {
              input: {
                id: selectedLinkId,
                url: linkEditorState.url,
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
      setLinkErrorMessage(error instanceof Error ? error.message : "Failed to save link.");
    }
  }

  return (
    <>
      <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
            {(["documents", "links"] as KnowledgeBaseTab[]).map((tab) => {
              const isSelected = activeTab === tab;
              const label = tab === "documents" ? "Documents" : "Links";
              const count = tab === "documents" ? documentArtifacts.length : linkArtifacts.length;

              return (
                <Button
                  key={tab}
                  className={`h-9 shrink-0 rounded-full border px-4 text-sm ${
                    isSelected
                      ? "border-border/70 bg-muted text-foreground hover:bg-muted"
                      : "border-border/40 bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                  onClick={() => {
                    setLinkErrorMessage(null);
                    setCreateDocumentErrorMessage(null);
                    void navigate({
                      search: {
                        tab,
                      },
                      to: "/knowledge-base",
                    });
                  }}
                  size="sm"
                  variant="ghost"
                >
                  {label}
                  <span className="ml-1.5 text-xs text-muted-foreground/80">{count}</span>
                </Button>
              );
            })}
          </div>

          <Button
            onClick={() => {
              if (activeTab === "documents") {
                setCreateDocumentErrorMessage(null);
                setCreateDocumentState(createEmptyDocumentEditorState());
                setCreateDocumentDialogOpen(true);
                return;
              }

              setLinkErrorMessage(null);
              setSelectedLinkId("new");
              setLinkEditorState(createEmptyLinkEditorState());
            }}
            size="sm"
          >
            <PlusIcon />
            {activeTab === "documents" ? "New document" : "New link"}
          </Button>
        </div>

        {activeTab === "documents" ? (
          <KnowledgeBaseDocumentsView artifacts={documentArtifacts} />
        ) : (
          <KnowledgeBaseLinksView
            artifacts={linkArtifacts}
            editorState={linkEditorState}
            errorMessage={linkErrorMessage}
            isSaveDisabled={isLinkSaveDisabled}
            isSaving={isLinkSaving}
            onEditorStateChange={setLinkEditorState}
            onSave={() => {
              void saveLinkArtifact();
            }}
            onSelectArtifact={setSelectedLinkId}
            onStartCreate={() => {
              setLinkErrorMessage(null);
              setSelectedLinkId("new");
              setLinkEditorState(createEmptyLinkEditorState());
            }}
            selectedArtifactId={selectedLinkId}
          />
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
