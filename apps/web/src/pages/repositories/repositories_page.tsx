import { Suspense, useMemo, useState } from "react";
import {
  ExternalLinkIcon,
  FolderGit2Icon,
  PinIcon,
  PinOffIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import type { RecordSourceSelectorProxy } from "relay-runtime";
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
import { PageTabs } from "@/components/ui/page_tabs";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import type { repositoriesPageCreateGithubRepositoryProvisioningMutation } from "./__generated__/repositoriesPageCreateGithubRepositoryProvisioningMutation.graphql";
import type { repositoriesPageCreateGithubInstallationUrlMutation } from "./__generated__/repositoriesPageCreateGithubInstallationUrlMutation.graphql";
import type { repositoriesPageDeleteGithubInstallationMutation } from "./__generated__/repositoriesPageDeleteGithubInstallationMutation.graphql";
import type { repositoriesPageDeleteGithubRepositoryProvisioningMutation } from "./__generated__/repositoriesPageDeleteGithubRepositoryProvisioningMutation.graphql";
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
    GithubRepositoryProvisionings {
      id
      companyId
      createdAt
      updatedAt
      githubRepository {
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

const repositoriesPageCreateGithubInstallationUrlMutationNode = graphql`
  mutation repositoriesPageCreateGithubInstallationUrlMutation(
    $input: CreateGithubInstallationUrlInput!
  ) {
    CreateGithubInstallationUrl(input: $input) {
      url
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

const repositoriesPageCreateGithubRepositoryProvisioningMutationNode = graphql`
  mutation repositoriesPageCreateGithubRepositoryProvisioningMutation(
    $input: CreateGithubRepositoryProvisioningInput!
  ) {
    CreateGithubRepositoryProvisioning(input: $input) {
      id
      companyId
      createdAt
      updatedAt
      githubRepository {
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

const repositoriesPageDeleteGithubRepositoryProvisioningMutationNode = graphql`
  mutation repositoriesPageDeleteGithubRepositoryProvisioningMutation(
    $input: DeleteGithubRepositoryProvisioningInput!
  ) {
    DeleteGithubRepositoryProvisioning(input: $input) {
      deletedProvisioningId
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
  htmlUrl: string | null | undefined;
  isPrivate: boolean;
  defaultBranch: string | null | undefined;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type RepositoryProvisioningRecord = {
  id: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  githubRepository: RepositoryRecord;
};

type StoreRecord = {
  getDataID(): string;
  getLinkedRecord(name: string): StoreRecord | null;
  getValue(name: string): unknown;
};

type RepositoriesPageTab = "inventory" | "workspace";

const repositoriesPageTabs: Array<{ key: RepositoriesPageTab; label: string }> = [
  {
    key: "inventory",
    label: "Repository Inventory",
  },
  {
    key: "workspace",
    label: "Workspace Repositories",
  },
];

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

function filterStoreRecords(records: ReadonlyArray<unknown>): StoreRecord[] {
  return records.filter((record): record is StoreRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getLinkedRecord" in record
      && typeof record.getLinkedRecord === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function getWorkspaceRepositoryPath(repository: RepositoryRecord): string {
  return `~/workspace/${repository.name}`;
}

function RepositoriesPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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
  const organizationSlug = useCurrentOrganizationSlug();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [refreshedInstallationId, setRefreshedInstallationId] = useState<string | null>(null);
  const [deletingInstallationId, setDeletingInstallationId] = useState<string | null>(null);
  const [deletingProvisioningId, setDeletingProvisioningId] = useState<string | null>(null);
  const [pinningRepositoryId, setPinningRepositoryId] = useState<string | null>(null);
  const [refreshingInstallationId, setRefreshingInstallationId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<RepositoriesPageTab>("inventory");
  const data = useLazyLoadQuery<repositoriesPageQuery>(
    repositoriesPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitDeleteInstallation, isDeleteInstallationInFlight] =
    useMutation<repositoriesPageDeleteGithubInstallationMutation>(
      repositoriesPageDeleteGithubInstallationMutationNode,
    );
  const [commitCreateGithubInstallationUrl, isCreateGithubInstallationUrlInFlight] =
    useMutation<repositoriesPageCreateGithubInstallationUrlMutation>(
      repositoriesPageCreateGithubInstallationUrlMutationNode,
    );
  const [commitRefreshRepositories, isRefreshRepositoriesInFlight] =
    useMutation<repositoriesPageRefreshGithubInstallationRepositoriesMutation>(
      repositoriesPageRefreshGithubInstallationRepositoriesMutationNode,
    );
  const [commitCreateRepositoryProvisioning, isCreateRepositoryProvisioningInFlight] =
    useMutation<repositoriesPageCreateGithubRepositoryProvisioningMutation>(
      repositoriesPageCreateGithubRepositoryProvisioningMutationNode,
    );
  const [commitDeleteRepositoryProvisioning, isDeleteRepositoryProvisioningInFlight] =
    useMutation<repositoriesPageDeleteGithubRepositoryProvisioningMutation>(
      repositoriesPageDeleteGithubRepositoryProvisioningMutationNode,
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
  const repositoryProvisionings: RepositoryProvisioningRecord[] = useMemo(() => {
    return data.GithubRepositoryProvisionings.map((provisioning) => ({
      companyId: provisioning.companyId,
      createdAt: provisioning.createdAt,
      githubRepository: {
        archived: provisioning.githubRepository.archived,
        createdAt: provisioning.githubRepository.createdAt,
        defaultBranch: provisioning.githubRepository.defaultBranch,
        externalId: provisioning.githubRepository.externalId,
        fullName: provisioning.githubRepository.fullName,
        githubInstallationId: provisioning.githubRepository.githubInstallationId,
        htmlUrl: provisioning.githubRepository.htmlUrl,
        id: provisioning.githubRepository.id,
        isPrivate: provisioning.githubRepository.isPrivate,
        name: provisioning.githubRepository.name,
        updatedAt: provisioning.githubRepository.updatedAt,
      },
      id: provisioning.id,
      updatedAt: provisioning.updatedAt,
    }));
  }, [data.GithubRepositoryProvisionings]);
  const provisioningByRepositoryId = useMemo(() => {
    return new Map(
      repositoryProvisionings.map((provisioning) => [provisioning.githubRepository.id, provisioning]),
    );
  }, [repositoryProvisionings]);
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
  const updateRepositoriesStore = (
    store: RecordSourceSelectorProxy,
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

    const refreshedRepositoryIds = new Set(newRepositories.map((repository) => repository.getDataID()));
    const currentProvisionings = filterStoreRecords(rootRecord.getLinkedRecords("GithubRepositoryProvisionings") || []);
    rootRecord.setLinkedRecords(
      currentProvisionings.filter((provisioning) => {
        const githubRepository = provisioning.getLinkedRecord("githubRepository");
        if (!githubRepository) {
          return false;
        }

        return String(githubRepository.getValue("githubInstallationId") || "") !== installationId
          || refreshedRepositoryIds.has(githubRepository.getDataID());
      }),
      "GithubRepositoryProvisionings",
    );
  };
  const appendProvisioningStoreRecord = (
    store: RecordSourceSelectorProxy,
    newProvisioningFieldName: string,
  ) => {
    const rootRecord = store.getRoot();
    const payload = store.getRootField(newProvisioningFieldName);
    if (!payload) {
      return;
    }

    const currentProvisionings = filterStoreRecords(rootRecord.getLinkedRecords("GithubRepositoryProvisionings") || []);
    if (currentProvisionings.some((provisioning) => provisioning.getDataID() === payload.getDataID())) {
      return;
    }

    rootRecord.setLinkedRecords(
      [...currentProvisionings, payload],
      "GithubRepositoryProvisionings",
    );
  };
  const removeProvisioningStoreRecord = (
    store: RecordSourceSelectorProxy,
    deletedProvisioningId: string,
  ) => {
    if (!deletedProvisioningId) {
      return;
    }

    const rootRecord = store.getRoot();
    const currentProvisionings = filterStoreRecords(rootRecord.getLinkedRecords("GithubRepositoryProvisionings") || []);
    rootRecord.setLinkedRecords(
      currentProvisionings.filter((provisioning) => provisioning.getDataID() !== deletedProvisioningId),
      "GithubRepositoryProvisionings",
    );
  };
  const isRepositoryProvisioningMutationInFlight =
    isCreateRepositoryProvisioningInFlight || isDeleteRepositoryProvisioningInFlight;
  const pinRepository = async (repository: RepositoryRecord) => {
    if (isRepositoryProvisioningMutationInFlight) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setPinningRepositoryId(repository.id);

    await new Promise<void>((resolve, reject) => {
      commitCreateRepositoryProvisioning({
        variables: {
          input: {
            githubRepositoryId: repository.id,
          },
        },
        updater: (store) => {
          appendProvisioningStoreRecord(store, "CreateGithubRepositoryProvisioning");
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          setNoticeMessage(`Pinned ${repository.fullName} for workspace checkout.`);
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to pin repository for workspace checkout.",
      );
    });

    setPinningRepositoryId(null);
  };
  const unpinRepository = async (provisioning: RepositoryProvisioningRecord) => {
    if (isRepositoryProvisioningMutationInFlight) {
      return;
    }

    setErrorMessage(null);
    setNoticeMessage(null);
    setDeletingProvisioningId(provisioning.id);

    await new Promise<void>((resolve, reject) => {
      commitDeleteRepositoryProvisioning({
        variables: {
          input: {
            id: provisioning.id,
          },
        },
        updater: (store) => {
          const payload = store.getRootField("DeleteGithubRepositoryProvisioning");
          const deletedProvisioningId = String(payload?.getValue("deletedProvisioningId") || "");
          removeProvisioningStoreRecord(store, deletedProvisioningId);
        },
        onCompleted: (_response, errors) => {
          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          setNoticeMessage(`Unpinned ${provisioning.githubRepository.fullName}.`);
          resolve();
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to unpin repository.",
      );
    });

    setDeletingProvisioningId(null);
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>GitHub Repositories</CardTitle>
            <CardDescription>
              Link GitHub App installations to {data.Me.company.name} and mirror their repositories into CompanyHelm.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              disabled={isCreateGithubInstallationUrlInFlight}
              onClick={() => {
                setErrorMessage(null);
                setNoticeMessage(null);
                commitCreateGithubInstallationUrl({
                  variables: {
                    input: {
                      organizationSlug,
                    },
                  },
                  onCompleted: (response, errors) => {
                    const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                    if (nextErrorMessage) {
                      setErrorMessage(nextErrorMessage);
                      return;
                    }

                    const installationUrl = String(response.CreateGithubInstallationUrl?.url || "").trim();
                    if (!installationUrl) {
                      setErrorMessage("GitHub installation URL was empty.");
                      return;
                    }

                    window.location.assign(installationUrl);
                  },
                  onError: (error: Error) => {
                    setErrorMessage(error.message || "Failed to open the GitHub installation flow.");
                  },
                });
              }}
              size="sm"
            >
              <PlusIcon />
              {isCreateGithubInstallationUrlInFlight ? "Preparing GitHub install..." : "Install GitHub App"}
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
        </CardContent>
      </Card>

      <PageTabs
        items={repositoriesPageTabs}
        onSelect={setSelectedTab}
        selectedKey={selectedTab}
      />

      {selectedTab === "inventory" ? (
        <>
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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
                Install the GitHub App to populate repository data here.
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
                  const showRefreshNotice = refreshedInstallationId === installation.installationId;

                  return (
                    <TableRow key={installation.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>Installation #{installation.installationId}</span>
                          {showRefreshNotice ? (
                            <span className="text-xs font-normal text-emerald-700 dark:text-emerald-300">
                              Repositories refreshed
                            </span>
                          ) : null}
                        </div>
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
                              setRefreshedInstallationId(null);
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

                                    setRefreshedInstallationId(installation.installationId);
                                    resolve();
                                  },
                                  onError: reject,
                                });
                              }).catch((error: unknown) => {
                                setRefreshedInstallationId(null);
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
                                      setRefreshedInstallationId(null);
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
                                            const currentProvisionings = filterStoreRecords(
                                              rootRecord.getLinkedRecords("GithubRepositoryProvisionings") || [],
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
                                            rootRecord.setLinkedRecords(
                                              currentProvisionings.filter((provisioning) => {
                                                const githubRepository = provisioning.getLinkedRecord("githubRepository");
                                                return String(githubRepository?.getValue("githubInstallationId") || "")
                                                  !== deletedInstallationId;
                                              }),
                                              "GithubRepositoryProvisionings",
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

      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
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
                            <TableHead>Workspace</TableHead>
                            <TableHead>Updated</TableHead>
                            <TableHead className="w-32 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installationRepositories.map((repository) => {
                            const provisioning = provisioningByRepositoryId.get(repository.id);
                            const isPinningRepository = pinningRepositoryId === repository.id;
                            const isDeletingProvisioning = deletingProvisioningId === provisioning?.id;

                            return (
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
                                <TableCell>
                                  {provisioning ? (
                                    <Badge className="max-w-48 truncate font-mono" variant="outline">
                                      {getWorkspaceRepositoryPath(repository)}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">Not pinned</span>
                                  )}
                                </TableCell>
                                <TableCell>{formatTimestamp(repository.updatedAt)}</TableCell>
                                <TableCell className="text-right">
                                  {provisioning ? (
                                    <Button
                                      disabled={isDeletingProvisioning || isRepositoryProvisioningMutationInFlight}
                                      onClick={() => {
                                        void unpinRepository(provisioning);
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <PinOffIcon className="h-3.5 w-3.5" />
                                      {isDeletingProvisioning ? "Removing..." : "Unpin"}
                                    </Button>
                                  ) : (
                                    <Button
                                      disabled={
                                        repository.archived
                                        || isPinningRepository
                                        || isRepositoryProvisioningMutationInFlight
                                      }
                                      onClick={() => {
                                        void pinRepository(repository);
                                      }}
                                      size="sm"
                                      variant="ghost"
                                    >
                                      <PinIcon className="h-3.5 w-3.5" />
                                      {isPinningRepository ? "Pinning..." : "Pin"}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
        </>
      ) : (
        <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Workspace Repositories</CardTitle>
              <CardDescription>
                Pinned repositories clone into new agent environments at ~/workspace.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            {repositoryProvisionings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">No workspace repositories pinned</p>
                <p className="mt-2 text-xs/relaxed text-muted-foreground">
                  Pin repositories from the inventory tab to make them available in agent workspaces.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Repository</TableHead>
                    <TableHead>Checkout path</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Default branch</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repositoryProvisionings.map((provisioning) => {
                    const repository = provisioning.githubRepository;
                    const isDeletingProvisioning = deletingProvisioningId === provisioning.id;

                    return (
                      <TableRow key={provisioning.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            <PinIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                          <Badge className="max-w-56 truncate font-mono" variant="outline">
                            {getWorkspaceRepositoryPath(repository)}
                          </Badge>
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
                        <TableCell>{formatTimestamp(provisioning.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            disabled={isDeletingProvisioning || isRepositoryProvisioningMutationInFlight}
                            onClick={() => {
                              void unpinRepository(provisioning);
                            }}
                            size="sm"
                            variant="ghost"
                          >
                            <PinOffIcon className="h-3.5 w-3.5" />
                            {isDeletingProvisioning ? "Removing..." : "Unpin"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
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
