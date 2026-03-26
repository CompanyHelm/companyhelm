import type { FormEvent } from "react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  ExternalLinkIcon,
  FolderGit2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelAction,
  AlertDialogCancelButton,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPrimaryAction,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { repositoriesPageAddGithubInstallationMutation } from "./__generated__/repositoriesPageAddGithubInstallationMutation.graphql";
import type { repositoriesPageDeleteGithubInstallationMutation } from "./__generated__/repositoriesPageDeleteGithubInstallationMutation.graphql";
import type { repositoriesPageQuery } from "./__generated__/repositoriesPageQuery.graphql";
import type { repositoriesPageRefreshGithubInstallationRepositoriesMutation } from "./__generated__/repositoriesPageRefreshGithubInstallationRepositoriesMutation.graphql";

const repositoriesPageQueryNode = graphql`
  query repositoriesPageQuery {
    Me {
      company {
        id
        name
      }
    }
    GithubAppConfig {
      appClientId
      appLink
    }
    GithubInstallations {
      id
      installationId
      createdAt
    }
    GithubRepositories {
      id
      githubInstallationId
      externalId
      name
      fullName
      htmlUrl
      isPrivate
      defaultBranch
      archived
      createdAt
      updatedAt
    }
  }
`;

const repositoriesPageAddGithubInstallationMutationNode = graphql`
  mutation repositoriesPageAddGithubInstallationMutation($input: AddGithubInstallationInput!) {
    AddGithubInstallation(input: $input) {
      githubInstallation {
        id
        installationId
        createdAt
      }
      repositories {
        id
        githubInstallationId
        externalId
        name
        fullName
        htmlUrl
        isPrivate
        defaultBranch
        archived
        createdAt
        updatedAt
      }
    }
  }
`;

const repositoriesPageDeleteGithubInstallationMutationNode = graphql`
  mutation repositoriesPageDeleteGithubInstallationMutation($input: DeleteGithubInstallationInput!) {
    DeleteGithubInstallation(input: $input) {
      deletedInstallationId
    }
  }
`;

const repositoriesPageRefreshGithubInstallationRepositoriesMutationNode = graphql`
  mutation repositoriesPageRefreshGithubInstallationRepositoriesMutation(
    $input: RefreshGithubInstallationRepositoriesInput!
  ) {
    RefreshGithubInstallationRepositories(input: $input) {
      repositories {
        id
        githubInstallationId
        externalId
        name
        fullName
        htmlUrl
        isPrivate
        defaultBranch
        archived
        createdAt
        updatedAt
      }
    }
  }
`;

type InstallationRecord = {
  id: string;
  installationId: string;
  createdAt: string;
};

type RepositoryRecord = {
  id: string;
  githubInstallationId: string;
  externalId: string;
  name: string;
  fullName: string;
  htmlUrl: string | null;
  isPrivate: boolean;
  defaultBranch: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type StoreRecord = {
  getDataID(): string;
  getValue(name: string): unknown;
};

function normalizeSearchValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatTimestamp(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function buildGithubInstallationUrl(appLink: string, companyId: string): string {
  const normalizedAppLink = String(appLink || "").trim();
  if (!normalizedAppLink) {
    return "";
  }

  try {
    const url = new URL(normalizedAppLink);
    if (!/\/installations\/new\/?$/.test(url.pathname)) {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/installations/new`;
    }
    if (companyId) {
      url.searchParams.set("state", companyId);
    }
    return url.toString();
  } catch {
    return normalizedAppLink;
  }
}

function filterStoreRecords(records: ReadonlyArray<unknown>): StoreRecord[] {
  return records.filter((record): record is StoreRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function RepositoriesPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>GitHub Repositories</CardTitle>
            <CardDescription>
              Link GitHub App installations and visualize the cached repositories for this company.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading GitHub installations…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function RepositoriesPageContent() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const callbackHandledRef = useRef<string | null>(null);
  const [manualInstallationId, setManualInstallationId] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [deletingInstallationId, setDeletingInstallationId] = useState<string | null>(null);
  const [refreshingInstallationId, setRefreshingInstallationId] = useState<string | null>(null);
  const data = useLazyLoadQuery<repositoriesPageQuery>(
    repositoriesPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitAddInstallation, isAddInstallationInFlight] =
    useMutation<repositoriesPageAddGithubInstallationMutation>(
      repositoriesPageAddGithubInstallationMutationNode,
    );
  const [commitDeleteInstallation, isDeleteInstallationInFlight] =
    useMutation<repositoriesPageDeleteGithubInstallationMutation>(
      repositoriesPageDeleteGithubInstallationMutationNode,
    );
  const [commitRefreshRepositories, isRefreshRepositoriesInFlight] =
    useMutation<repositoriesPageRefreshGithubInstallationRepositoriesMutation>(
      repositoriesPageRefreshGithubInstallationRepositoriesMutationNode,
    );

  const installations: InstallationRecord[] = useMemo(() => {
    return data.GithubInstallations.map((installation) => ({
      id: installation.id,
      installationId: installation.installationId,
      createdAt: installation.createdAt,
    }));
  }, [data.GithubInstallations]);
  const repositories: RepositoryRecord[] = useMemo(() => {
    return data.GithubRepositories.map((repository) => ({
      id: repository.id,
      githubInstallationId: repository.githubInstallationId,
      externalId: repository.externalId,
      name: repository.name,
      fullName: repository.fullName,
      htmlUrl: repository.htmlUrl,
      isPrivate: repository.isPrivate,
      defaultBranch: repository.defaultBranch,
      archived: repository.archived,
      createdAt: repository.createdAt,
      updatedAt: repository.updatedAt,
    }));
  }, [data.GithubRepositories]);
  const repositoriesByInstallationId = useMemo(() => {
    const nextMap = new Map<string, RepositoryRecord[]>();

    for (const repository of repositories) {
      const currentRepositories = nextMap.get(repository.githubInstallationId) ?? [];
      currentRepositories.push(repository);
      nextMap.set(repository.githubInstallationId, currentRepositories);
    }

    for (const installationRepositories of nextMap.values()) {
      installationRepositories.sort((leftRepository, rightRepository) => {
        return leftRepository.fullName.localeCompare(rightRepository.fullName);
      });
    }

    return nextMap;
  }, [repositories]);
  const githubInstallUrl = useMemo(() => {
    return buildGithubInstallationUrl(data.GithubAppConfig.appLink, data.Me.company.id);
  }, [data.GithubAppConfig.appLink, data.Me.company.id]);

  const clearCallbackSearch = async () => {
    await navigate({
      to: "/repositories",
      search: {},
      replace: true,
    });
  };

  const updateRepositoriesStore = (
    store: {
      getRoot(): {
        getLinkedRecords(name: string): ReadonlyArray<unknown> | null;
        setLinkedRecords(records: ReadonlyArray<unknown>, name: string): void;
      };
      getRootField(name: string): {
        getLinkedRecord(name: string): StoreRecord | null;
        getLinkedRecords(name: string): ReadonlyArray<unknown> | null;
        getValue(name: string): unknown;
      } | null;
    },
    installationId: string,
    newRepositoryFieldName: string,
  ) => {
    const rootRecord = store.getRoot();
    const payload = store.getRootField(newRepositoryFieldName);
    const newRepositories = filterStoreRecords(payload?.getLinkedRecords("repositories") || []);
    const currentRepositories = filterStoreRecords(rootRecord.getLinkedRecords("GithubRepositories") || []);
    const preservedRepositories = currentRepositories.filter((repository) => {
      return String(repository.getValue("githubInstallationId") || "") !== installationId;
    });

    rootRecord.setLinkedRecords(
      [...preservedRepositories, ...newRepositories],
      "GithubRepositories",
    );
  };

  const linkInstallation = async (params: {
    installationId: string;
    setupAction?: string | null;
    successMessage: string;
  }) => {
    const normalizedInstallationId = params.installationId.trim();
    if (!normalizedInstallationId || isAddInstallationInFlight) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitAddInstallation({
        variables: {
          input: {
            installationId: normalizedInstallationId,
            setupAction: params.setupAction ?? null,
          },
        },
        updater: (store) => {
          const payload = store.getRootField("AddGithubInstallation");
          const newInstallation = payload?.getLinkedRecord("githubInstallation");
          if (!newInstallation) {
            return;
          }

          const rootRecord = store.getRoot();
          const currentInstallations = filterStoreRecords(rootRecord.getLinkedRecords("GithubInstallations") || []);
          const nextInstallations = [
            newInstallation,
            ...currentInstallations.filter((installation) => {
              return String(installation.getValue("installationId") || "")
                !== String(newInstallation.getValue("installationId") || "");
            }),
          ];
          rootRecord.setLinkedRecords(nextInstallations, "GithubInstallations");
          updateRepositoriesStore(
            store,
            String(newInstallation.getValue("installationId") || ""),
            "AddGithubInstallation",
          );
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          setNoticeMessage(params.successMessage);
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to link GitHub installation.");
      throw error;
    });
  };

  useEffect(() => {
    const callbackInstallationId = normalizeSearchValue(search.installation_id);
    const callbackSetupAction = normalizeSearchValue(search.setup_action);
    const callbackState = normalizeSearchValue(search.state);
    const callbackKey = [callbackInstallationId, callbackSetupAction, callbackState].join("|");

    if (!callbackKey.replace(/\|/g, "")) {
      callbackHandledRef.current = null;
      return;
    }
    if (callbackHandledRef.current === callbackKey) {
      return;
    }

    callbackHandledRef.current = callbackKey;

    if (!callbackInstallationId) {
      setErrorMessage("GitHub install callback is missing installation_id.");
      void clearCallbackSearch();
      return;
    }
    if (callbackState && callbackState !== data.Me.company.id) {
      setErrorMessage(`GitHub callback belongs to company ${callbackState}, not the current company.`);
      void clearCallbackSearch();
      return;
    }

    let isCancelled = false;
    setIsProcessingCallback(true);

    void linkInstallation({
      installationId: callbackInstallationId,
      setupAction: callbackSetupAction || null,
      successMessage: `Linked GitHub installation ${callbackInstallationId}.`,
    }).finally(() => {
      if (isCancelled) {
        return;
      }

      setIsProcessingCallback(false);
      void clearCallbackSearch();
    });

    return () => {
      isCancelled = true;
    };
  }, [data.Me.company.id, search.installation_id, search.setup_action, search.state]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>GitHub Repositories</CardTitle>
            <CardDescription>
              Link GitHub App installations to {data.Me.company.name} and mirror their repositories into CompanyHelm.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              disabled={!githubInstallUrl || isProcessingCallback}
              onClick={() => {
                window.location.assign(githubInstallUrl);
              }}
              size="sm"
            >
              <PlusIcon />
              Install GitHub App
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {noticeMessage ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              {noticeMessage}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {isProcessingCallback ? (
            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Linking GitHub installation from the callback…
            </div>
          ) : null}

          <div className="grid gap-3 rounded-xl border border-border/60 bg-muted/20 p-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="grid gap-1">
              <p className="text-sm font-medium text-foreground">Add an installation by ID</p>
              <p className="text-xs/relaxed text-muted-foreground">
                Use this when you already know the installation ID and want to link it directly without re-running setup.
              </p>
            </div>
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                try {
                  await linkInstallation({
                    installationId: manualInstallationId,
                    successMessage: `Linked GitHub installation ${manualInstallationId.trim()}.`,
                  });
                  setManualInstallationId("");
                } catch {
                  // Error state is already surfaced above.
                }
              }}
            >
              <Input
                value={manualInstallationId}
                onChange={(event) => {
                  setManualInstallationId(event.currentTarget.value);
                }}
                placeholder="110600868"
              />
              <Button disabled={isAddInstallationInFlight || manualInstallationId.trim().length === 0} size="sm" type="submit">
                Link installation
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Linked Installations</CardTitle>
            <CardDescription>
              Refresh repositories when GitHub permissions or repository membership changes.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {installations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No installations linked yet</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                Install the GitHub App or paste an installation ID above to populate repository data here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Installation</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Cached repos</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installations.map((installation) => {
                  const cachedRepositories = repositoriesByInstallationId.get(installation.installationId) ?? [];
                  const isRefreshing = refreshingInstallationId === installation.installationId;
                  const isDeleting = deletingInstallationId === installation.installationId;

                  return (
                    <TableRow key={installation.id}>
                      <TableCell className="font-medium text-foreground">
                        Installation #{installation.installationId}
                      </TableCell>
                      <TableCell>{formatTimestamp(installation.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cachedRepositories.length} repos</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isRefreshing || isDeleting || isRefreshRepositoriesInFlight}
                            onClick={async () => {
                              if (isRefreshRepositoriesInFlight) {
                                return;
                              }

                              setErrorMessage(null);
                              setNoticeMessage(null);
                              setRefreshingInstallationId(installation.installationId);

                              await new Promise<void>((resolve, reject) => {
                                commitRefreshRepositories({
                                  variables: {
                                    input: {
                                      installationId: installation.installationId,
                                    },
                                  },
                                  updater: (store) => {
                                    updateRepositoriesStore(
                                      store,
                                      installation.installationId,
                                      "RefreshGithubInstallationRepositories",
                                    );
                                  },
                                  onCompleted: (_response, errors) => {
                                    const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                                    if (nextErrorMessage) {
                                      reject(new Error(nextErrorMessage));
                                      return;
                                    }

                                    setNoticeMessage(`Refreshed repositories for installation ${installation.installationId}.`);
                                    resolve();
                                  },
                                  onError: reject,
                                });
                              }).catch((error: unknown) => {
                                setErrorMessage(
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to refresh GitHub installation repositories.",
                                );
                              });

                              setRefreshingInstallationId(null);
                            }}
                          >
                            <RefreshCwIcon className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isRefreshing || isDeleting || isDeleteInstallationInFlight}
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete installation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This removes installation #{installation.installationId} and deletes its cached repositories from CompanyHelm.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancelAction asChild>
                                  <AlertDialogCancelButton variant="outline">Cancel</AlertDialogCancelButton>
                                </AlertDialogCancelAction>
                                <AlertDialogPrimaryAction asChild>
                                  <AlertDialogActionButton
                                    variant="destructive"
                                    disabled={isDeleting || isDeleteInstallationInFlight}
                                    onClick={async () => {
                                      if (isDeleteInstallationInFlight) {
                                        return;
                                      }

                                      setErrorMessage(null);
                                      setNoticeMessage(null);
                                      setDeletingInstallationId(installation.installationId);

                                      await new Promise<void>((resolve, reject) => {
                                        commitDeleteInstallation({
                                          variables: {
                                            input: {
                                              installationId: installation.installationId,
                                            },
                                          },
                                          updater: (store) => {
                                            const payload = store.getRootField("DeleteGithubInstallation");
                                            const deletedInstallationId = String(
                                              payload?.getValue("deletedInstallationId") || "",
                                            );
                                            if (!deletedInstallationId) {
                                              return;
                                            }

                                            const rootRecord = store.getRoot();
                                            const currentInstallations = filterStoreRecords(
                                              rootRecord.getLinkedRecords("GithubInstallations") || [],
                                            );
                                            const currentRepositories = filterStoreRecords(
                                              rootRecord.getLinkedRecords("GithubRepositories") || [],
                                            );

                                            rootRecord.setLinkedRecords(
                                              currentInstallations.filter((currentInstallation) => {
                                                return String(currentInstallation.getValue("installationId") || "")
                                                  !== deletedInstallationId;
                                              }),
                                              "GithubInstallations",
                                            );
                                            rootRecord.setLinkedRecords(
                                              currentRepositories.filter((repository) => {
                                                return String(repository.getValue("githubInstallationId") || "")
                                                  !== deletedInstallationId;
                                              }),
                                              "GithubRepositories",
                                            );
                                          },
                                          onCompleted: (_response, errors) => {
                                            const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                                            if (nextErrorMessage) {
                                              reject(new Error(nextErrorMessage));
                                              return;
                                            }

                                            setNoticeMessage(`Deleted installation ${installation.installationId}.`);
                                            resolve();
                                          },
                                          onError: reject,
                                        });
                                      }).catch((error: unknown) => {
                                        setErrorMessage(
                                          error instanceof Error
                                            ? error.message
                                            : "Failed to delete GitHub installation.",
                                        );
                                      });

                                      setDeletingInstallationId(null);
                                    }}
                                  >
                                    Delete
                                  </AlertDialogActionButton>
                                </AlertDialogPrimaryAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Cached Repositories</CardTitle>
            <CardDescription>
              These repositories are mirrored from GitHub installation access and refresh when you resync an installation.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {installations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No repositories cached yet</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                Link a GitHub installation first, then CompanyHelm will list its repositories here.
              </p>
            </div>
          ) : (
            installations.map((installation) => {
              const installationRepositories = repositoriesByInstallationId.get(installation.installationId) ?? [];

              return (
                <Card key={installation.id} size="sm" className="border border-border/60 shadow-none">
                  <CardHeader className="border-b border-border/50">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        <FolderGit2Icon className="h-4 w-4 text-muted-foreground" />
                        <span>Installation #{installation.installationId}</span>
                      </CardTitle>
                      <CardDescription>
                        Linked {formatTimestamp(installation.createdAt)}. {installationRepositories.length} cached repositories.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {installationRepositories.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center">
                        <p className="text-sm font-medium text-foreground">No repositories cached for this installation</p>
                        <p className="mt-2 text-xs/relaxed text-muted-foreground">
                          Refresh the installation to fetch repository metadata from GitHub.
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Repository</TableHead>
                            <TableHead>Visibility</TableHead>
                            <TableHead>Default branch</TableHead>
                            <TableHead>Archived</TableHead>
                            <TableHead>Updated</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installationRepositories.map((repository) => (
                            <TableRow key={repository.id}>
                              <TableCell>
                                <div className="flex min-w-0 items-center gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-foreground">{repository.fullName}</p>
                                    <p className="truncate text-[11px] text-muted-foreground">{repository.name}</p>
                                  </div>
                                  {repository.htmlUrl ? (
                                    <a
                                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition hover:border-border hover:text-foreground"
                                      href={repository.htmlUrl}
                                      rel="noreferrer"
                                      target="_blank"
                                    >
                                      <ExternalLinkIcon className="h-3.5 w-3.5" />
                                    </a>
                                  ) : null}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={repository.isPrivate ? "secondary" : "outline"}>
                                  {repository.isPrivate ? "Private" : "Public"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {repository.defaultBranch ? (
                                  <Badge variant="outline">{repository.defaultBranch}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Unknown</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {repository.archived ? (
                                  <Badge variant="warning">Archived</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Active</span>
                                )}
                              </TableCell>
                              <TableCell>{formatTimestamp(repository.updatedAt)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function RepositoriesPage() {
  return (
    <Suspense fallback={<RepositoriesPageFallback />}>
      <RepositoriesPageContent />
    </Suspense>
  );
}
