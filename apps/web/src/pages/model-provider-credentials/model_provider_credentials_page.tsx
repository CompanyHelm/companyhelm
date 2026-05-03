import { Suspense, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { CreateCredentialDialog } from "./create_credential_dialog";
import { type DeleteCredentialDialogReplacementRecord } from "./delete_credential_dialog";
import { CredentialsTable, type CredentialsTableRecord } from "./credentials_table";
import { ModelProviderCredentialCatalog } from "./provider_catalog";
import { formatProviderLabel } from "./provider_label";
import type { modelProviderCredentialsPageCreateCredentialMutation } from "./__generated__/modelProviderCredentialsPageCreateCredentialMutation.graphql";
import type { modelProviderCredentialsPageDeleteCredentialMutation } from "./__generated__/modelProviderCredentialsPageDeleteCredentialMutation.graphql";
import type { modelProviderCredentialsPageQuery } from "./__generated__/modelProviderCredentialsPageQuery.graphql";
import type { modelProviderCredentialsPageSetDefaultCredentialMutation } from "./__generated__/modelProviderCredentialsPageSetDefaultCredentialMutation.graphql";

type StoreCredentialRecord = {
  getDataID(): string;
  setValue(value: unknown, fieldName: string): void;
};

type StoreRootRecord = {
  getLinkedRecords(name: string): ReadonlyArray<StoreCredentialRecord | null> | null;
  setLinkedRecords(records: ReadonlyArray<StoreCredentialRecord>, name: string): void;
};

type CredentialStoreProxy = {
  getRoot(): StoreRootRecord;
  getRootField(name: string): StoreCredentialRecord | null;
};

const modelProviderCredentialsPageQueryNode = graphql`
  query modelProviderCredentialsPageQuery {
    Agents {
      id
      name
      modelProviderCredentialId
    }
    AgentCreateOptions {
      id
      modelProviderCredentialId
      isDefault
      label
      modelProvider
      models {
        modelProviderCredentialModelId
      }
    }
    ModelProviders {
      id
      name
      type
      authorizationInstructionsMarkdown
    }
    ModelProviderCredentials {
      id
      baseUrl
      isDefault
      name
      modelProvider
      type
      defaultModelId
      status
      errorMessage
      refreshedAt
      createdAt
      updatedAt
    }
    Sessions {
      id
      modelProviderCredentialModelId
    }
  }
`;

const modelProviderCredentialsPageCreateCredentialMutationNode = graphql`
  mutation modelProviderCredentialsPageCreateCredentialMutation(
    $input: AddModelProviderCredentialInput!
  ) {
    AddModelProviderCredential(input: $input) {
      id
      baseUrl
      isDefault
      name
      modelProvider
      type
      defaultModelId
      status
      errorMessage
      refreshedAt
      createdAt
      updatedAt
    }
  }
`;

const modelProviderCredentialsPageDeleteCredentialMutationNode = graphql`
  mutation modelProviderCredentialsPageDeleteCredentialMutation(
    $input: DeleteModelProviderCredentialInput!
  ) {
    DeleteModelProviderCredential(input: $input) {
      id
    }
  }
`;

const modelProviderCredentialsPageSetDefaultCredentialMutationNode = graphql`
  mutation modelProviderCredentialsPageSetDefaultCredentialMutation(
    $input: SetDefaultModelProviderCredentialInput!
  ) {
    SetDefaultModelProviderCredential(input: $input) {
      id
      isDefault
    }
  }
`;

function ModelProviderCredentialsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Store company-level provider keys for agent model access.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled size="sm">
              <PlusIcon />
              Create credentials
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          <CredentialsTable
            credentials={[]}
            defaultingCredentialId={null}
            isLoading
            deletingCredentialId={null}
            onDelete={async () => undefined}
            onSetDefault={async () => undefined}
            replacementOptions={[]}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function ModelProviderCredentialsPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [defaultingCredentialId, setDefaultingCredentialId] = useState<string | null>(null);
  const data = useLazyLoadQuery<modelProviderCredentialsPageQuery>(
    modelProviderCredentialsPageQueryNode,
    {},
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    } as never,
  );
  const [commitCreateCredential, isCreateCredentialInFlight] =
    useMutation<modelProviderCredentialsPageCreateCredentialMutation>(
      modelProviderCredentialsPageCreateCredentialMutationNode,
    );
  const [commitDeleteCredential, isDeleteCredentialInFlight] =
    useMutation<modelProviderCredentialsPageDeleteCredentialMutation>(
      modelProviderCredentialsPageDeleteCredentialMutationNode,
    );
  const [commitSetDefaultCredential, isSetDefaultCredentialInFlight] =
    useMutation<modelProviderCredentialsPageSetDefaultCredentialMutation>(
      modelProviderCredentialsPageSetDefaultCredentialMutationNode,
    );
  const credentialNameById = useMemo(() => {
    return new Map(
      data.ModelProviderCredentials.map((credential) => [credential.id, credential.name]),
    );
  }, [data.ModelProviderCredentials]);
  const replacementOptions = useMemo<DeleteCredentialDialogReplacementRecord[]>(() => {
    return data.AgentCreateOptions
      .filter((providerOption) => providerOption.modelProviderCredentialId)
      .map((providerOption) => ({
        id: String(providerOption.modelProviderCredentialId),
        isDefault: providerOption.isDefault,
        label: credentialNameById.get(String(providerOption.modelProviderCredentialId)) ?? providerOption.label,
      }));
  }, [credentialNameById, data.AgentCreateOptions]);
  const credentialIdByModelId = useMemo(() => {
    const nextCredentialIdByModelId = new Map<string, string>();
    for (const providerOption of data.AgentCreateOptions) {
      if (!providerOption.modelProviderCredentialId) {
        continue;
      }

      for (const model of providerOption.models) {
        if (!model.modelProviderCredentialModelId) {
          continue;
        }

        nextCredentialIdByModelId.set(
          model.modelProviderCredentialModelId,
          providerOption.modelProviderCredentialId,
        );
      }
    }

    return nextCredentialIdByModelId;
  }, [data.AgentCreateOptions]);
  const sessionCountByCredentialId = useMemo(() => {
    const nextSessionCountByCredentialId = new Map<string, number>();
    for (const session of data.Sessions) {
      const modelProviderCredentialModelId = String(session.modelProviderCredentialModelId || "").trim();
      if (modelProviderCredentialModelId.length === 0) {
        continue;
      }

      const credentialId = credentialIdByModelId.get(modelProviderCredentialModelId);
      if (!credentialId) {
        continue;
      }

      nextSessionCountByCredentialId.set(
        credentialId,
        (nextSessionCountByCredentialId.get(credentialId) ?? 0) + 1,
      );
    }

    return nextSessionCountByCredentialId;
  }, [credentialIdByModelId, data.Sessions]);
  const credentials = useMemo<CredentialsTableRecord[]>(() => {
    return data.ModelProviderCredentials.map((credential) => ({
      baseUrl: credential.baseUrl ?? null,
      createdAt: credential.createdAt,
      credentialKind: "user_provided" as const,
      defaultModelId: credential.defaultModelId ?? null,
      errorMessage: credential.errorMessage ?? null,
      id: credential.id,
      isDefault: credential.isDefault,
      modelProvider: credential.modelProvider,
      name: credential.name,
      refreshedAt: credential.refreshedAt ?? null,
      sessionCount: sessionCountByCredentialId.get(credential.id) ?? 0,
      status: credential.status as "active" | "error",
      type: credential.type as "api_key" | "oauth_token",
      updatedAt: credential.updatedAt,
      usingAgents: data.Agents
        .filter((agent) => agent.modelProviderCredentialId === credential.id)
        .map((agent) => ({
          id: agent.id,
          name: agent.name,
        })),
    }));
  }, [data.Agents, data.ModelProviderCredentials, sessionCountByCredentialId]);
  const providers = ModelProviderCredentialCatalog.toDialogProviders(
    data.ModelProviders.map((provider) => ({
      authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown ?? null,
      id: provider.id,
      name: formatProviderLabel(provider.id),
      type: provider.type as "api_key" | "oauth",
    })),
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Store company-level provider keys for agent model access.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              onClick={() => {
                setCreateDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Create credentials
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage && !isCreateDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <CredentialsTable
            credentials={credentials}
            defaultingCredentialId={defaultingCredentialId}
            isLoading={false}
            deletingCredentialId={deletingCredentialId}
            onDelete={async (input) => {
              if (isDeleteCredentialInFlight) {
                return;
              }

              setDeletingCredentialId(input.credentialId);
              await new Promise<void>((resolve, reject) => {
                commitDeleteCredential({
                  variables: {
                    input: {
                      id: input.credentialId,
                      replacementCredentialId: input.replacementCredentialId ?? null,
                    },
                  },
                  updater: (store) => {
                    const relayStore = store as unknown as CredentialStoreProxy;
                    const deletedCredential = relayStore.getRootField("DeleteModelProviderCredential");
                    if (!deletedCredential) {
                      return;
                    }

                    const deletedId = deletedCredential.getDataID();
                    const rootRecord = relayStore.getRoot();
                    const currentCredentials = rootRecord.getLinkedRecords("ModelProviderCredentials") || [];
                    const nextCredentials: StoreCredentialRecord[] = [];
                    for (const record of currentCredentials) {
                      if (!record || record.getDataID() === deletedId) {
                        continue;
                      }

                      nextCredentials.push(record);
                    }

                    rootRecord.setLinkedRecords(
                      nextCredentials,
                      "ModelProviderCredentials",
                    );
                  },
                  onCompleted: (_response, errors) => {
                    const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                    if (nextErrorMessage) {
                      reject(new Error(nextErrorMessage));
                      return;
                    }

                    resolve();
                  },
                  onError: reject,
                });
              }).then(() => {
                setFetchKey((current) => current + 1);
              }).finally(() => {
                setDeletingCredentialId(null);
              });
            }}
            onSetDefault={async (credentialId) => {
              if (isSetDefaultCredentialInFlight) {
                return;
              }

              setErrorMessage(null);
              setDefaultingCredentialId(credentialId);

              await new Promise<void>((resolve, reject) => {
                commitSetDefaultCredential({
                  variables: {
                    input: {
                      id: credentialId,
                    },
                  },
                  updater: (store) => {
                    const relayStore = store as unknown as CredentialStoreProxy;
                    const updatedCredential = relayStore.getRootField("SetDefaultModelProviderCredential");
                    if (!updatedCredential) {
                      return;
                    }

                    const updatedId = updatedCredential.getDataID();
                    const rootRecord = relayStore.getRoot();
                    const currentCredentials = rootRecord.getLinkedRecords("ModelProviderCredentials") || [];
                    currentCredentials.forEach((record) => {
                      if (!record) {
                        return;
                      }

                      record.setValue(record.getDataID() === updatedId, "isDefault");
                    });
                  },
                  onCompleted: (_response, errors) => {
                    const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                    if (nextErrorMessage) {
                      reject(new Error(nextErrorMessage));
                      return;
                    }

                    resolve();
                  },
                  onError: reject,
                });
              }).then(() => {
                setFetchKey((current) => current + 1);
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to update default credential.");
              }).finally(() => {
                setDefaultingCredentialId(null);
              });
            }}
            replacementOptions={replacementOptions}
          />
        </CardContent>
      </Card>

      <CreateCredentialDialog
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateCredentialInFlight}
        providers={providers}
        suggestDefault={data.ModelProviderCredentials.length === 0}
        onCreate={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitCreateCredential({
              variables: {
                input,
              },
              updater: (store) => {
                const relayStore = store as unknown as CredentialStoreProxy;
                const newCredential = relayStore.getRootField("AddModelProviderCredential");
                if (!newCredential) {
                  return;
                }

                const rootRecord = relayStore.getRoot();
                const currentCredentials = rootRecord.getLinkedRecords("ModelProviderCredentials") || [];
                rootRecord.setLinkedRecords(
                  [
                    newCredential,
                    ...currentCredentials.filter((record): record is StoreCredentialRecord => Boolean(record)),
                  ],
                  "ModelProviderCredentials",
                );
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setCreateDialogOpen(false);
                setFetchKey((current) => current + 1);
                resolve();
              },
              onError: reject,
            });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create credential.");
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}

export function ModelProviderCredentialsPage() {
  return (
    <Suspense fallback={<ModelProviderCredentialsPageFallback />}>
      <ModelProviderCredentialsPageContent />
    </Suspense>
  );
}
