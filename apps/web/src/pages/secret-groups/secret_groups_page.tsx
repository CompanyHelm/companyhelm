import { Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FolderPlusIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { RecordSourceSelectorProxy } from "relay-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { GroupDialog } from "./group_dialog";
import type { secretGroupsPageCreateSecretGroupMutation } from "./__generated__/secretGroupsPageCreateSecretGroupMutation.graphql";
import type { secretGroupsPageDeleteSecretGroupMutation } from "./__generated__/secretGroupsPageDeleteSecretGroupMutation.graphql";
import type { secretGroupsPageQuery } from "./__generated__/secretGroupsPageQuery.graphql";
import type { secretGroupsPageUpdateSecretGroupMutation } from "./__generated__/secretGroupsPageUpdateSecretGroupMutation.graphql";

type RelayLinkedRecord = {
  getDataID(): string;
  getValue(key: string): unknown;
  setValue(value: unknown, key: string): void;
};

const secretGroupsPageQueryNode = graphql`
  query secretGroupsPageQuery {
    SecretGroups {
      id
      name
    }
    Secrets {
      id
      name
      secretGroupId
    }
  }
`;

const secretGroupsPageCreateSecretGroupMutationNode = graphql`
  mutation secretGroupsPageCreateSecretGroupMutation($input: CreateSecretGroupInput!) {
    CreateSecretGroup(input: $input) {
      id
      name
    }
  }
`;

const secretGroupsPageDeleteSecretGroupMutationNode = graphql`
  mutation secretGroupsPageDeleteSecretGroupMutation($input: DeleteSecretGroupInput!) {
    DeleteSecretGroup(input: $input) {
      id
      name
    }
  }
`;

const secretGroupsPageUpdateSecretGroupMutationNode = graphql`
  mutation secretGroupsPageUpdateSecretGroupMutation($input: UpdateSecretGroupInput!) {
    UpdateSecretGroup(input: $input) {
      id
      name
    }
  }
`;

type SecretGroupDialogState = {
  mode: "create";
} | {
  groupId: string;
  mode: "edit";
  name: string;
};

function filterRelayRecords(records: ReadonlyArray<unknown>): RelayLinkedRecord[] {
  return records.filter((record): record is RelayLinkedRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function"
      && "setValue" in record
      && typeof record.setValue === "function";
  });
}

function sortGroupRecords(records: RelayLinkedRecord[]): RelayLinkedRecord[] {
  return [...records].sort((left, right) => {
    const leftName = String(left.getValue("name") ?? "");
    const rightName = String(right.getValue("name") ?? "");
    return leftName.localeCompare(rightName);
  });
}

function upsertSecretGroupInStore(
  store: RecordSourceSelectorProxy,
  mutationFieldName: "CreateSecretGroup" | "UpdateSecretGroup",
) {
  const nextGroup = store.getRootField(mutationFieldName);
  if (!nextGroup) {
    return;
  }

  const rootRecord = store.getRoot();
  const currentGroups = filterRelayRecords(rootRecord.getLinkedRecords("SecretGroups") || []);
  rootRecord.setLinkedRecords(
    sortGroupRecords([
      nextGroup,
      ...currentGroups.filter((group) => group.getDataID() !== nextGroup.getDataID()),
    ]),
    "SecretGroups",
  );
}

function SecretGroupsPageFallback() {
  const organizationSlug = useCurrentOrganizationSlug();
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Secret groups</CardTitle>
            <CardDescription>
              Loading folder-style groups for your company secrets.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link params={{ organizationSlug }} to={OrganizationPath.route("/secrets")}>Back to secrets</Link>
            </Button>
            <Button disabled size="sm">
              <PlusIcon />
              Create group
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading secret groups...
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

/**
 * Hosts dedicated secret-group management so catalog organization can evolve independently from
 * the main secrets list. Deleting a group intentionally ungroups secrets instead of deleting them.
 */
function SecretGroupsPageContent() {
  const organizationSlug = useCurrentOrganizationSlug();
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [groupDialogState, setGroupDialogState] = useState<SecretGroupDialogState | null>(null);
  const data = useLazyLoadQuery<secretGroupsPageQuery>(
    secretGroupsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateSecretGroup, isCreateSecretGroupInFlight] =
    useMutation<secretGroupsPageCreateSecretGroupMutation>(secretGroupsPageCreateSecretGroupMutationNode);
  const [commitUpdateSecretGroup, isUpdateSecretGroupInFlight] =
    useMutation<secretGroupsPageUpdateSecretGroupMutation>(secretGroupsPageUpdateSecretGroupMutationNode);
  const [commitDeleteSecretGroup] = useMutation<secretGroupsPageDeleteSecretGroupMutation>(
    secretGroupsPageDeleteSecretGroupMutationNode,
  );
  const isSavingGroup = isCreateSecretGroupInFlight || isUpdateSecretGroupInFlight;
  const groupSecretCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const secret of data.Secrets) {
      if (!secret.secretGroupId) {
        continue;
      }

      counts.set(secret.secretGroupId, (counts.get(secret.secretGroupId) ?? 0) + 1);
    }

    return counts;
  }, [data.Secrets]);
  const sortedGroups = useMemo(() => {
    return [...data.SecretGroups].sort((left, right) => left.name.localeCompare(right.name));
  }, [data.SecretGroups]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle>Secret groups</CardTitle>
            <CardDescription>
              Create reusable groups for your secret catalog. Deleting a group moves its secrets back
              to ungrouped instead of removing the secrets.
            </CardDescription>
          </div>
          <CardAction className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link params={{ organizationSlug }} to={OrganizationPath.route("/secrets")}>Back to secrets</Link>
            </Button>
            <Button
              onClick={() => {
                setErrorMessage(null);
                setGroupDialogState({
                  mode: "create",
                });
              }}
              size="sm"
            >
              <FolderPlusIcon />
              Create group
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3">
          {errorMessage ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          {sortedGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No secret groups yet</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                Create your first group here, then move secrets into it from the main secrets page or
                while importing a `.env` file.
              </p>
            </div>
          ) : null}

          {sortedGroups.map((group) => {
            const secretCount = groupSecretCounts.get(group.id) ?? 0;

            return (
              <div
                key={group.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/90 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{group.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {secretCount} {secretCount === 1 ? "secret" : "secrets"} currently assigned
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    aria-label={`Rename ${group.name}`}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={deletingGroupId === group.id || isSavingGroup}
                    onClick={() => {
                      setErrorMessage(null);
                      setGroupDialogState({
                        groupId: group.id,
                        mode: "edit",
                        name: group.name,
                      });
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Delete ${group.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    disabled={deletingGroupId === group.id || isSavingGroup}
                    onClick={() => {
                      setErrorMessage(null);
                      setDeletingGroupId(group.id);

                      void new Promise<void>((resolve, reject) => {
                        commitDeleteSecretGroup({
                          variables: {
                            input: {
                              id: group.id,
                            },
                          },
                          updater: (store) => {
                            const deletedGroup = store.getRootField("DeleteSecretGroup");
                            if (!deletedGroup) {
                              return;
                            }

                            const deletedGroupId = deletedGroup.getDataID();
                            const rootRecord = store.getRoot();
                            const currentGroups = filterRelayRecords(rootRecord.getLinkedRecords("SecretGroups") || []);
                            rootRecord.setLinkedRecords(
                              currentGroups.filter((candidateGroup) => candidateGroup.getDataID() !== deletedGroupId),
                              "SecretGroups",
                            );

                            const currentSecrets = filterRelayRecords(rootRecord.getLinkedRecords("Secrets") || []);
                            for (const secret of currentSecrets) {
                              if (secret.getValue("secretGroupId") === deletedGroupId) {
                                secret.setValue(null, "secretGroupId");
                              }
                            }
                          },
                          onCompleted: (_response, errors) => {
                            const nextErrorMessage = errors?.[0]?.message;
                            if (nextErrorMessage) {
                              reject(new Error(nextErrorMessage));
                              return;
                            }

                            resolve();
                          },
                          onError: reject,
                        });
                      }).catch((error: unknown) => {
                        setErrorMessage(error instanceof Error ? error.message : "Failed to delete secret group.");
                      }).finally(() => {
                        setDeletingGroupId(null);
                      });
                    }}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {groupDialogState ? (
        <GroupDialog
          errorMessage={errorMessage}
          initialName={groupDialogState.mode === "edit" ? groupDialogState.name : ""}
          isOpen
          isSaving={isCreateSecretGroupInFlight || isUpdateSecretGroupInFlight}
          mode={groupDialogState.mode}
          onOpenChange={(open) => {
            if (!open) {
              setGroupDialogState(null);
            }
          }}
          onSubmit={async (name) => {
            setErrorMessage(null);

            const isEditing = groupDialogState.mode === "edit";
            await new Promise<void>((resolve, reject) => {
              if (isEditing) {
                commitUpdateSecretGroup({
                  variables: {
                    input: {
                      id: groupDialogState.groupId,
                      name,
                    },
                  },
                  updater: (store) => {
                    upsertSecretGroupInStore(store, "UpdateSecretGroup");
                  },
                  onCompleted: (_response, errors) => {
                    const nextErrorMessage = errors?.[0]?.message;
                    if (nextErrorMessage) {
                      reject(new Error(nextErrorMessage));
                      return;
                    }

                    resolve();
                  },
                  onError: reject,
                });
                return;
              }

              commitCreateSecretGroup({
                variables: {
                  input: {
                    name,
                  },
                },
                updater: (store) => {
                  upsertSecretGroupInStore(store, "CreateSecretGroup");
                },
                onCompleted: (_response, errors) => {
                  const nextErrorMessage = errors?.[0]?.message;
                  if (nextErrorMessage) {
                    reject(new Error(nextErrorMessage));
                    return;
                  }

                  resolve();
                },
                onError: reject,
              });
            }).catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : "Failed to save secret group.");
              throw error;
            });

            setGroupDialogState(null);
          }}
        />
      ) : null}
    </main>
  );
}

export function SecretGroupsPage() {
  return (
    <Suspense fallback={<SecretGroupsPageFallback />}>
      <SecretGroupsPageContent />
    </Suspense>
  );
}
