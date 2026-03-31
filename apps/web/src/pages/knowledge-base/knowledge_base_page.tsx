import { Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ExternalLinkIcon, FileTextIcon, Link2Icon, PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { knowledgeBasePageCreateExternalLinkArtifactMutation } from "./__generated__/knowledgeBasePageCreateExternalLinkArtifactMutation.graphql";
import type { knowledgeBasePageCreateMarkdownArtifactMutation } from "./__generated__/knowledgeBasePageCreateMarkdownArtifactMutation.graphql";
import type { knowledgeBasePageQuery } from "./__generated__/knowledgeBasePageQuery.graphql";
import type { knowledgeBasePageUpdateArtifactMutation } from "./__generated__/knowledgeBasePageUpdateArtifactMutation.graphql";
import type { knowledgeBasePageUpdateExternalLinkArtifactMutation } from "./__generated__/knowledgeBasePageUpdateExternalLinkArtifactMutation.graphql";
import type { knowledgeBasePageUpdateMarkdownArtifactMutation } from "./__generated__/knowledgeBasePageUpdateMarkdownArtifactMutation.graphql";

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

const knowledgeBasePageUpdateMarkdownArtifactMutationNode = graphql`
  mutation knowledgeBasePageUpdateMarkdownArtifactMutation(
    $input: UpdateMarkdownArtifactInput!
  ) {
    UpdateMarkdownArtifact(input: $input) {
      id
      markdownContent
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

type KnowledgeBaseEditorState = {
  description: string;
  markdownContent: string;
  name: string;
  url: string;
};

function createEmptyEditorState(): KnowledgeBaseEditorState {
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

function getArtifactSummary(artifact: KnowledgeBaseArtifact, tab: KnowledgeBaseTab): string {
  if (tab === "documents") {
    const description = String(artifact.description || "");
    if (description.length > 0) {
      return description;
    }

    return String(artifact.markdownContent || "");
  }

  const url = String(artifact.url || "");
  if (url.length > 0) {
    return url;
  }

  return String(artifact.description || "");
}

function summarizeArtifactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0 rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Loading artifacts…</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
              Loading company knowledge…
            </div>
          </CardContent>
        </Card>
        <Card className="min-h-0 rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle>Loading editor…</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
              Loading editor…
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function KnowledgeBasePageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as KnowledgeBasePageSearch;
  const activeTab = resolveKnowledgeBaseTab(search.tab);
  const [fetchKey, setFetchKey] = useState(0);
  const [selectedArtifactKey, setSelectedArtifactKey] = useState<string | null>(null);
  const [editorState, setEditorState] = useState<KnowledgeBaseEditorState>(createEmptyEditorState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const [commitUpdateMarkdownArtifact, isUpdateMarkdownArtifactInFlight] =
    useMutation<knowledgeBasePageUpdateMarkdownArtifactMutation>(
      knowledgeBasePageUpdateMarkdownArtifactMutationNode,
    );
  const [commitUpdateExternalLinkArtifact, isUpdateExternalLinkArtifactInFlight] =
    useMutation<knowledgeBasePageUpdateExternalLinkArtifactMutation>(
      knowledgeBasePageUpdateExternalLinkArtifactMutationNode,
    );
  const artifacts = useMemo(() => {
    const matchingArtifacts = data.Artifacts.filter((artifact) => {
      return activeTab === "documents"
        ? isDocumentArtifact(artifact)
        : isExternalLinkArtifact(artifact);
    });

    return [...matchingArtifacts].sort(compareArtifactsByUpdatedAt);
  }, [activeTab, data.Artifacts]);
  const selectedArtifact = selectedArtifactKey && selectedArtifactKey !== "new"
    ? artifacts.find((artifact) => artifact.id === selectedArtifactKey) ?? null
    : null;
  const isNewArtifact = selectedArtifactKey === "new";
  const isSaving = isCreateMarkdownArtifactInFlight
    || isCreateExternalLinkArtifactInFlight
    || isUpdateArtifactInFlight
    || isUpdateMarkdownArtifactInFlight
    || isUpdateExternalLinkArtifactInFlight;
  const isSaveDisabled = isSaving
    || editorState.name.trim().length === 0
    || (activeTab === "documents"
      ? editorState.markdownContent.trim().length === 0
      : editorState.url.trim().length === 0);
  const selectedArtifactSummary = selectedArtifact ? getArtifactSummary(selectedArtifact, activeTab) : "";

  useEffect(() => {
    if (selectedArtifactKey === "new") {
      return;
    }

    if (selectedArtifactKey && artifacts.some((artifact) => artifact.id === selectedArtifactKey)) {
      return;
    }

    if (artifacts[0]) {
      setSelectedArtifactKey(artifacts[0].id);
      return;
    }

    setSelectedArtifactKey("new");
  }, [artifacts, selectedArtifactKey]);

  useEffect(() => {
    if (selectedArtifactKey === "new") {
      setEditorState(createEmptyEditorState());
      return;
    }

    if (!selectedArtifact) {
      return;
    }

    setEditorState({
      description: selectedArtifact.description ?? "",
      markdownContent: selectedArtifact.markdownContent ?? "",
      name: selectedArtifact.name,
      url: selectedArtifact.url ?? "",
    });
  }, [selectedArtifact, selectedArtifactKey]);

  async function saveKnowledgeBaseArtifact() {
    if (isSaveDisabled) {
      return;
    }

    setErrorMessage(null);

    try {
      if (isNewArtifact) {
        if (activeTab === "documents") {
          const response = await new Promise<
            knowledgeBasePageCreateMarkdownArtifactMutation["response"]
          >((resolve, reject) => {
            commitCreateMarkdownArtifact({
              variables: {
                input: {
                  contentMarkdown: editorState.markdownContent,
                  description: editorState.description || null,
                  name: editorState.name,
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

          setSelectedArtifactKey(response.CreateMarkdownArtifact.id);
        } else {
          const response = await new Promise<
            knowledgeBasePageCreateExternalLinkArtifactMutation["response"]
          >((resolve, reject) => {
            commitCreateExternalLinkArtifact({
              variables: {
                input: {
                  description: editorState.description || null,
                  name: editorState.name,
                  scopeType: "company",
                  url: editorState.url,
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

          setSelectedArtifactKey(response.CreateExternalLinkArtifact.id);
        }
      } else if (selectedArtifactKey) {
        await new Promise<void>((resolve, reject) => {
          commitUpdateArtifact({
            variables: {
              input: {
                description: editorState.description || null,
                id: selectedArtifactKey,
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

        if (activeTab === "documents") {
          await new Promise<void>((resolve, reject) => {
            commitUpdateMarkdownArtifact({
              variables: {
                input: {
                  contentMarkdown: editorState.markdownContent,
                  id: selectedArtifactKey,
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
        } else {
          await new Promise<void>((resolve, reject) => {
            commitUpdateExternalLinkArtifact({
              variables: {
                input: {
                  id: selectedArtifactKey,
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
      }

      setFetchKey((currentFetchKey) => currentFetchKey + 1);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save artifact.");
    }
  }

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto pb-1">
          {(["documents", "links"] as KnowledgeBaseTab[]).map((tab) => {
            const isSelected = activeTab === tab;
            const label = tab === "documents" ? "Documents" : "Links";

            return (
              <Button
                key={tab}
                className={`h-9 shrink-0 rounded-full border px-4 text-sm ${
                  isSelected
                    ? "border-border/70 bg-muted text-foreground hover:bg-muted"
                    : "border-border/40 bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
                onClick={() => {
                  setErrorMessage(null);
                  setSelectedArtifactKey(null);
                  void navigate({
                    to: "/knowledge-base",
                    search: {
                      tab,
                    },
                  });
                }}
                size="sm"
                variant="ghost"
              >
                {label}
                <span className="ml-1.5 text-xs text-muted-foreground/80">
                  {tab === "documents"
                    ? data.Artifacts.filter(isDocumentArtifact).length
                    : data.Artifacts.filter(isExternalLinkArtifact).length}
                </span>
              </Button>
            );
          })}
        </div>

        <Button
          onClick={() => {
            setErrorMessage(null);
            setSelectedArtifactKey("new");
          }}
          size="sm"
        >
          <PlusIcon />
          {activeTab === "documents" ? "New document" : "New link"}
        </Button>
      </div>

      {errorMessage ? (
        <div className="shrink-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-h-0 rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle>{activeTab === "documents" ? "Company documents" : "Company links"}</CardTitle>
            <CardDescription>
              {activeTab === "documents"
                ? "Shared company docs and long-form markdown notes."
                : "Shared company references and external resources."}
            </CardDescription>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 overflow-y-auto pt-4">
            {artifacts.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 text-center">
                <p className="text-sm font-medium text-foreground">
                  {activeTab === "documents" ? "No documents yet" : "No links yet"}
                </p>
                <p className="mt-2 max-w-xs text-xs/relaxed text-muted-foreground">
                  {activeTab === "documents"
                    ? "Create the first company document to capture durable knowledge."
                    : "Create the first company link to keep shared references in one place."}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {artifacts.map((artifact) => {
                  const isSelected = selectedArtifactKey === artifact.id;
                  const summary = summarizeArtifactText(getArtifactSummary(artifact, activeTab));

                  return (
                    <button
                      key={artifact.id}
                      className={`flex w-full flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left transition ${
                        isSelected
                          ? "border-border/70 bg-muted/70"
                          : "border-transparent bg-transparent hover:border-border/50 hover:bg-muted/40"
                      }`}
                      onClick={() => {
                        setErrorMessage(null);
                        setSelectedArtifactKey(artifact.id);
                      }}
                      type="button"
                    >
                      <div className="flex w-full items-start gap-3">
                        <div className="mt-0.5 rounded-md bg-muted p-1.5 text-muted-foreground">
                          {activeTab === "documents" ? (
                            <FileTextIcon className="size-3.5" />
                          ) : (
                            <Link2Icon className="size-3.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{artifact.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Updated {formatTimestamp(artifact.updatedAt)}
                          </p>
                        </div>
                      </div>
                      {summary ? (
                        <p className="line-clamp-3 text-xs/relaxed text-muted-foreground">
                          {summary}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-h-0 rounded-2xl border border-border/60 shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle>
              {isNewArtifact
                ? activeTab === "documents"
                  ? "New document"
                  : "New link"
                : editorState.name || (activeTab === "documents" ? "Document" : "Link")}
            </CardTitle>
            <CardDescription>
              {isNewArtifact
                ? activeTab === "documents"
                  ? "Draft a new company-level markdown document."
                  : "Add a new company-level external reference."
                : `Updated ${selectedArtifact ? formatTimestamp(selectedArtifact.updatedAt) : "recently"}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-name">
                Name
              </label>
              <Input
                id="knowledge-base-name"
                onChange={(event) => {
                  setEditorState((currentState) => ({
                    ...currentState,
                    name: event.target.value,
                  }));
                }}
                placeholder={activeTab === "documents" ? "Architecture principles" : "Repository handbook"}
                value={editorState.name}
              />
            </div>

            <div className="grid gap-2">
              <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-description">
                Description
              </label>
              <textarea
                className="min-h-24 w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                id="knowledge-base-description"
                onChange={(event) => {
                  setEditorState((currentState) => ({
                    ...currentState,
                    description: event.target.value,
                  }));
                }}
                placeholder="Short summary for the sidebar list."
                value={editorState.description}
              />
            </div>

            {activeTab === "documents" ? (
              <div className="min-h-0 flex-1 grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-markdown">
                  Markdown
                </label>
                <textarea
                  className="min-h-[320px] w-full flex-1 rounded-xl border border-input bg-transparent px-3 py-2 font-mono text-sm text-foreground shadow-xs outline-none transition placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  id="knowledge-base-markdown"
                  onChange={(event) => {
                    setEditorState((currentState) => ({
                      ...currentState,
                      markdownContent: event.target.value,
                    }));
                  }}
                  placeholder="# New document"
                  value={editorState.markdownContent}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <label className="text-xs font-medium text-foreground" htmlFor="knowledge-base-url">
                  URL
                </label>
                <Input
                  id="knowledge-base-url"
                  onChange={(event) => {
                    setEditorState((currentState) => ({
                      ...currentState,
                      url: event.target.value,
                    }));
                  }}
                  placeholder="https://example.com/reference"
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

            {!isNewArtifact && selectedArtifactSummary ? (
              <div className="rounded-xl border border-border/50 bg-muted/30 px-3 py-3 text-xs/relaxed text-muted-foreground">
                {activeTab === "documents" ? "Document summary" : "Link summary"}
                <div className="mt-1 text-foreground/80">{summarizeArtifactText(selectedArtifactSummary)}</div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-4">
              {isNewArtifact ? (
                <Button
                  onClick={() => {
                    setErrorMessage(null);
                    if (artifacts[0]) {
                      setSelectedArtifactKey(artifacts[0].id);
                      return;
                    }

                    setEditorState(createEmptyEditorState());
                  }}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
              ) : null}
              <Button disabled={isSaveDisabled} onClick={() => void saveKnowledgeBaseArtifact()} type="button">
                {isNewArtifact
                  ? activeTab === "documents"
                    ? "Create document"
                    : "Create link"
                  : "Save changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export function KnowledgeBasePage() {
  return (
    <Suspense fallback={<KnowledgeBasePageFallback />}>
      <KnowledgeBasePageContent />
    </Suspense>
  );
}
