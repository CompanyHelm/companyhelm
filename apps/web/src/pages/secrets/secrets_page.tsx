import { Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FileUpIcon, FolderPlusIcon, PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  CreateSecretDialog,
  type CreateSecretDialogGroupOption,
} from "./create_secret_dialog";
import {
  EditSecretDialog,
  type EditableSecretRecord,
  type EditSecretDialogGroupOption,
} from "./edit_secret_dialog";
import {
  ImportSecretsDialog,
  type ImportSecretsDialogGroupOption,
} from "./import_secrets_dialog";
import { SecretsTable, type SecretsTableRecord } from "./secrets_table";
import type { secretsPageCreateSecretMutation } from "./__generated__/secretsPageCreateSecretMutation.graphql";
import type { secretsPageCreateSecretGroupMutation } from "./__generated__/secretsPageCreateSecretGroupMutation.graphql";
import type { secretsPageDeleteSecretMutation } from "./__generated__/secretsPageDeleteSecretMutation.graphql";
import type { secretsPageQuery } from "./__generated__/secretsPageQuery.graphql";
import type { secretsPageUpdateSecretMutation } from "./__generated__/secretsPageUpdateSecretMutation.graphql";

type RelayLinkedRecord = {
  getDataID(): string;
  getValue(key: string): unknown;
};

const secretsPageQueryNode = graphql`
  query secretsPageQuery {
    SecretGroups {
      id
      name
    }
    Secrets {
      id
      name
      description
      envVarName
      secretGroupId
      createdAt
      updatedAt
    }
  }
`;

const secretsPageCreateSecretMutationNode = graphql`
  mutation secretsPageCreateSecretMutation($input: CreateSecretInput!) {
    CreateSecret(input: $input) {
      id
      name
      description
      envVarName
      secretGroupId
      createdAt
      updatedAt
    }
  }
`;

const secretsPageCreateSecretGroupMutationNode = graphql`
  mutation secretsPageCreateSecretGroupMutation($input: CreateSecretGroupInput!) {
    CreateSecretGroup(input: $input) {
      id
      name
    }
  }
`;

const secretsPageDeleteSecretMutationNode = graphql`
  mutation secretsPageDeleteSecretMutation($input: DeleteSecretInput!) {
    DeleteSecret(input: $input) {
      id
    }
  }
`;

const secretsPageUpdateSecretMutationNode = graphql`
  mutation secretsPageUpdateSecretMutation($input: UpdateSecretInput!) {
    UpdateSecret(input: $input) {
      id
      name
      description
      envVarName
      secretGroupId
      createdAt
      updatedAt
    }
  }
`;

function filterRelayRecords(records: ReadonlyArray<unknown>): RelayLinkedRecord[] {
  return records.filter((record): record is RelayLinkedRecord => {
    return typeof record === "object"
      && record !== null
      && "getDataID" in record
      && typeof record.getDataID === "function"
      && "getValue" in record
      && typeof record.getValue === "function";
  });
}

function sortRelayRecords(records: RelayLinkedRecord[]): RelayLinkedRecord[] {
  return [...records].sort((left, right) => {
    return String(left.getValue("name") ?? "").localeCompare(String(right.getValue("name") ?? ""));
  });
}

function SecretsPageFallback() {
  const organizationSlug = useCurrentOrganizationSlug();

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Store encrypted company secrets, organize them into reusable groups, and reference them from chats when command execution needs sensitive values.
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link params={{ organizationSlug }} to={OrganizationPath.route("/secret-groups")}>
                  <FolderPlusIcon />
                  Manage groups
                </Link>
              </Button>
              <Button disabled size="sm" variant="outline">
                <FileUpIcon />
                Import .env
              </Button>
              <Button disabled size="sm">
                <PlusIcon />
                Create secret
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SecretsTable isLoading onSelect={() => undefined} secrets={[]} />
        </CardContent>
      </Card>
    </main>
  );
}

function SecretsPageContent() {
  const organizationSlug = useCurrentOrganizationSlug();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deletingSecretId, setDeletingSecretId] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setImportDialogOpen] = useState(false);
  const [isImportingSecrets, setImportingSecrets] = useState(false);
  const [selectedSecretId, setSelectedSecretId] = useState<string | null>(null);
  const data = useLazyLoadQuery<secretsPageQuery>(
    secretsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateSecret, isCreateSecretInFlight] = useMutation<secretsPageCreateSecretMutation>(
    secretsPageCreateSecretMutationNode,
  );
  const [commitCreateSecretGroup, isCreateSecretGroupInFlight] =
    useMutation<secretsPageCreateSecretGroupMutation>(secretsPageCreateSecretGroupMutationNode);
  const [commitDeleteSecret, isDeleteSecretInFlight] = useMutation<secretsPageDeleteSecretMutation>(
    secretsPageDeleteSecretMutationNode,
  );
  const [commitUpdateSecret, isUpdateSecretInFlight] = useMutation<secretsPageUpdateSecretMutation>(
    secretsPageUpdateSecretMutationNode,
  );
  const secretGroupNameById = useMemo(() => {
    return new Map(data.SecretGroups.map((group) => [group.id, group.name]));
  }, [data.SecretGroups]);
  const groupOptions = useMemo<CreateSecretDialogGroupOption[]>(() => {
    return [...data.SecretGroups]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((group) => ({
        id: group.id,
        name: group.name,
      }));
  }, [data.SecretGroups]);
  const editGroupOptions = useMemo<EditSecretDialogGroupOption[]>(() => {
    return groupOptions.map((group) => ({
      id: group.id,
      name: group.name,
    }));
  }, [groupOptions]);
  const importGroupOptions = useMemo<ImportSecretsDialogGroupOption[]>(() => {
    return groupOptions.map((group) => ({
      id: group.id,
      name: group.name,
    }));
  }, [groupOptions]);
  const secrets: SecretsTableRecord[] = data.Secrets.map((secret) => ({
    createdAt: secret.createdAt,
    description: secret.description ?? null,
    envVarName: secret.envVarName,
    groupName: secret.secretGroupId ? (secretGroupNameById.get(secret.secretGroupId) ?? "Unknown group") : "Ungrouped",
    id: secret.id,
    name: secret.name,
    updatedAt: secret.updatedAt,
  }));
  const editableSecrets: EditableSecretRecord[] = data.Secrets.map((secret) => ({
    description: secret.description ?? null,
    envVarName: secret.envVarName,
    id: secret.id,
    name: secret.name,
    secretGroupId: secret.secretGroupId ?? null,
  }));
  const selectedSecret: EditableSecretRecord | null =
    editableSecrets.find((secret) => secret.id === selectedSecretId) ?? null;

  const createSecret = async (input: {
    description?: string;
    envVarName?: string;
    name: string;
    secretGroupId?: string | null;
    value: string;
  }) => {
    if (isCreateSecretInFlight) {
      return;
    }

    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitCreateSecret({
        variables: {
          input,
        },
        updater: (store) => {
          const newSecret = store.getRootField("CreateSecret");
          if (!newSecret) {
            return;
          }

          const rootRecord = store.getRoot();
          const currentSecrets = (rootRecord.getLinkedRecords("Secrets") || []).filter((record): record is NonNullable<typeof record> => {
            return record !== null;
          });
          rootRecord.setLinkedRecords([newSecret, ...currentSecrets], "Secrets");
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to create secret.");
      throw error;
    });
  };

  const createSecretGroup = async (name: string) => {
    if (isCreateSecretGroupInFlight) {
      throw new Error("A secret group is already being created.");
    }

    setErrorMessage(null);

    return await new Promise<CreateSecretDialogGroupOption>((resolve, reject) => {
      commitCreateSecretGroup({
        variables: {
          input: {
            name,
          },
        },
        updater: (store) => {
          const createdGroup = store.getRootField("CreateSecretGroup");
          if (!createdGroup) {
            return;
          }

          const rootRecord = store.getRoot();
          const currentGroups = filterRelayRecords(rootRecord.getLinkedRecords("SecretGroups") || []);
          const nextGroups = sortRelayRecords([
            createdGroup,
            ...currentGroups.filter((group) => group.getDataID() !== createdGroup.getDataID()),
          ]);
          rootRecord.setLinkedRecords(nextGroups, "SecretGroups");
        },
        onCompleted: (response, errors) => {
          const nextErrorMessage = errors?.[0]?.message;
          if (nextErrorMessage) {
            reject(new Error(nextErrorMessage));
            return;
          }

          const createdGroup = response?.CreateSecretGroup;
          if (!createdGroup) {
            reject(new Error("Failed to create secret group."));
            return;
          }

          resolve({
            id: createdGroup.id,
            name: createdGroup.name,
          });
        },
        onError: reject,
      });
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create secret group.");
      throw error;
    });
  };

  const updateSecret = async (input: {
    envVarName?: string;
    name?: string;
    secretGroupId?: string | null;
    secretId: string;
    value?: string;
  }) => {
    if (isUpdateSecretInFlight) {
      return;
    }

    setErrorMessage(null);

    await new Promise<void>((resolve, reject) => {
      commitUpdateSecret({
        variables: {
          input: {
            envVarName: input.envVarName,
            id: input.secretId,
            name: input.name,
            secretGroupId: input.secretGroupId,
            value: input.value,
          },
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
      setErrorMessage(error instanceof Error ? error.message : "Failed to update secret.");
      throw error;
    });
  };

  const deleteSecret = async (secretId: string) => {
    if (isDeleteSecretInFlight) {
      return;
    }

    setErrorMessage(null);
    setDeletingSecretId(secretId);

    try {
      await new Promise<void>((resolve, reject) => {
        commitDeleteSecret({
          variables: {
            input: {
              id: secretId,
            },
          },
          updater: (store) => {
            const deletedSecret = store.getRootField("DeleteSecret");
            if (!deletedSecret) {
              return;
            }

            const deletedId = deletedSecret.getDataID();
            const rootRecord = store.getRoot();
            const currentSecrets = rootRecord.getLinkedRecords("Secrets") || [];
            rootRecord.setLinkedRecords(
              currentSecrets.filter((record): record is { getDataID(): string } => {
                return typeof record === "object"
                  && record !== null
                  && "getDataID" in record
                  && typeof record.getDataID === "function"
                  && record.getDataID() !== deletedId;
              }),
              "Secrets",
            );
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
      });

      setSelectedSecretId((currentSelectedSecretId) => {
        return currentSelectedSecretId === secretId ? null : currentSelectedSecretId;
      });
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete secret.");
      throw error;
    } finally {
      setDeletingSecretId(null);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Store encrypted company secrets, organize them into reusable groups, and reference them from chats when command execution needs sensitive values.
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline">
                <Link params={{ organizationSlug }} to={OrganizationPath.route("/secret-groups")}>
                  <FolderPlusIcon />
                  Manage groups
                </Link>
              </Button>
              <Button
                onClick={() => {
                  setImportDialogOpen(true);
                }}
                size="sm"
                variant="outline"
              >
                <FileUpIcon />
                Import .env
              </Button>
              <Button
                onClick={() => {
                  setCreateDialogOpen(true);
                }}
                size="sm"
              >
                <PlusIcon />
                Create secret
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage && !isCreateDialogOpen && !isImportDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <SecretsTable
            isLoading={false}
            onSelect={(secretId) => {
              setSelectedSecretId(secretId);
            }}
            secrets={secrets}
          />
        </CardContent>
      </Card>

      <CreateSecretDialog
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        groups={groupOptions}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateSecretInFlight || isCreateSecretGroupInFlight}
        onCreate={async (input) => {
          await createSecret(input);
          setCreateDialogOpen(false);
        }}
        onCreateGroup={createSecretGroup}
        onOpenChange={setCreateDialogOpen}
      />

      <ImportSecretsDialog
        errorMessage={isImportDialogOpen ? errorMessage : null}
        existingSecrets={secrets.map((secret) => ({
          envVarName: secret.envVarName,
          id: secret.id,
          name: secret.name,
        }))}
        groups={importGroupOptions}
        isOpen={isImportDialogOpen}
        isSaving={isImportingSecrets || isCreateSecretGroupInFlight}
        onCreateGroup={createSecretGroup}
        onImport={async (input) => {
          if (isImportingSecrets) {
            return;
          }

          setErrorMessage(null);
          setImportingSecrets(true);

          const existingSecretsByEnvVarName = new Map(
            secrets.map((secret) => [secret.envVarName.toLowerCase(), secret]),
          );
          let importedSecretCount = 0;

          try {
            for (const secretDraft of input.secretDrafts) {
              const existingSecret = existingSecretsByEnvVarName.get(secretDraft.envVarName.toLowerCase()) ?? null;
              if (!existingSecret) {
                await createSecret({
                  envVarName: secretDraft.envVarName,
                  name: secretDraft.name,
                  secretGroupId: input.secretGroupId,
                  value: secretDraft.value,
                });
                importedSecretCount += 1;
                continue;
              }

              if (!input.shouldOverwriteExistingSecrets) {
                continue;
              }

              // Matching env vars only rotate the stored value so existing metadata stays intact.
              await updateSecret({
                secretId: existingSecret.id,
                value: secretDraft.value,
              });
              importedSecretCount += 1;
            }

            setImportDialogOpen(false);
          } catch (error) {
            const nextErrorMessage = error instanceof Error ? error.message : "Failed to import secrets.";
            if (importedSecretCount > 0) {
              setErrorMessage(
                `Import stopped after ${importedSecretCount} secret${importedSecretCount === 1 ? "" : "s"}: ${nextErrorMessage}`,
              );
            }
            throw error;
          } finally {
            setImportingSecrets(false);
          }
        }}
        onOpenChange={setImportDialogOpen}
      />

      <EditSecretDialog
        deletingSecretId={deletingSecretId}
        groupOptions={editGroupOptions}
        isOpen={selectedSecret !== null}
        onDelete={deleteSecret}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSecretId(null);
          }
        }}
        onUpdateEnvVarName={async (secretId, envVarName) => {
          await updateSecret({
            envVarName,
            secretId,
          });
        }}
        onUpdateName={async (secretId, name) => {
          await updateSecret({
            name,
            secretId,
          });
        }}
        onUpdateSecretGroupId={async (secretId, secretGroupId) => {
          await updateSecret({
            secretGroupId,
            secretId,
          });
        }}
        onUpdateValue={async (secretId, value) => {
          await updateSecret({
            secretId,
            value,
          });
        }}
        secret={selectedSecret}
      />
    </main>
  );
}

/**
 * Secrets are managed at the company level, so this page provides a single place to create,
 * group, rotate, and prune reusable encrypted values for sessions.
 */
export function SecretsPage() {
  return (
    <Suspense fallback={<SecretsPageFallback />}>
      <SecretsPageContent />
    </Suspense>
  );
}
