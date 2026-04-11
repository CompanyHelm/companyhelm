import { Suspense, useState } from "react";
import { FileUpIcon, PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { CreateSecretDialog } from "./create_secret_dialog";
import { EditSecretDialog, type EditableSecretRecord } from "./edit_secret_dialog";
import { ImportSecretsDialog } from "./import_secrets_dialog";
import { SecretsTable, type SecretsTableRecord } from "./secrets_table";
import type { secretsPageCreateSecretMutation } from "./__generated__/secretsPageCreateSecretMutation.graphql";
import type { secretsPageDeleteSecretMutation } from "./__generated__/secretsPageDeleteSecretMutation.graphql";
import type { secretsPageQuery } from "./__generated__/secretsPageQuery.graphql";
import type { secretsPageUpdateSecretMutation } from "./__generated__/secretsPageUpdateSecretMutation.graphql";

const secretsPageQueryNode = graphql`
  query secretsPageQuery {
    Secrets {
      id
      name
      description
      envVarName
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
      createdAt
      updatedAt
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
      createdAt
      updatedAt
    }
  }
`;

function SecretsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Store encrypted company secrets and reference them from chats when command execution needs sensitive values.
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
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
  const [commitDeleteSecret, isDeleteSecretInFlight] = useMutation<secretsPageDeleteSecretMutation>(
    secretsPageDeleteSecretMutationNode,
  );
  const [commitUpdateSecret, isUpdateSecretInFlight] = useMutation<secretsPageUpdateSecretMutation>(
    secretsPageUpdateSecretMutationNode,
  );
  const secrets: SecretsTableRecord[] = data.Secrets.map((secret) => ({
    createdAt: secret.createdAt,
    description: secret.description ?? null,
    envVarName: secret.envVarName,
    id: secret.id,
    name: secret.name,
    updatedAt: secret.updatedAt,
  }));
  const selectedSecret: EditableSecretRecord | null = secrets.find((secret) => secret.id === selectedSecretId) ?? null;

  const createSecret = async (input: {
    description?: string;
    envVarName?: string;
    name: string;
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

  const updateSecret = async (input: {
    envVarName?: string;
    name?: string;
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
              currentSecrets.filter((record): record is NonNullable<typeof record> => {
                return record !== null && record.getDataID() !== deletedId;
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
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Store encrypted company secrets and reference them from chats when command execution needs sensitive values.
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
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
        isOpen={isCreateDialogOpen}
        isSaving={isCreateSecretInFlight}
        onCreate={async (input) => {
          await createSecret(input);
          setCreateDialogOpen(false);
        }}
        onOpenChange={setCreateDialogOpen}
      />

      <ImportSecretsDialog
        errorMessage={isImportDialogOpen ? errorMessage : null}
        existingSecrets={secrets.map((secret) => ({
          envVarName: secret.envVarName,
          id: secret.id,
          name: secret.name,
        }))}
        isOpen={isImportDialogOpen}
        isSaving={isImportingSecrets}
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
 * Secrets are managed at the company level, so this page provides a single place to create and
 * prune reusable encrypted values for sessions.
 */
export function SecretsPage() {
  return (
    <Suspense fallback={<SecretsPageFallback />}>
      <SecretsPageContent />
    </Suspense>
  );
}
