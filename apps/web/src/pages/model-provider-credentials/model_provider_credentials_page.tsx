import { Suspense, useState } from "react";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateCredentialDialog } from "./create_credential_dialog";
import { CredentialsTable, type CredentialsTableRecord } from "./credentials_table";
import { formatProviderLabel } from "./provider_label";
import type { modelProviderCredentialsPageCreateCredentialMutation } from "./__generated__/modelProviderCredentialsPageCreateCredentialMutation.graphql";
import type { modelProviderCredentialsPageDeleteCredentialMutation } from "./__generated__/modelProviderCredentialsPageDeleteCredentialMutation.graphql";
import type { modelProviderCredentialsPageQuery } from "./__generated__/modelProviderCredentialsPageQuery.graphql";

const modelProviderCredentialsPageQueryNode = graphql`
  query modelProviderCredentialsPageQuery {
    ModelProviders {
      id
      name
      type
      authorizationInstructionsMarkdown
    }
    ModelProviderCredentials {
      id
      name
      modelProvider
      createdAt
      updatedAt
    }
  }
`;

const modelProviderCredentialsPageCreateCredentialMutationNode = graphql`
  mutation modelProviderCredentialsPageCreateCredentialMutation(
    $input: AddModelProviderCredentialInput!
  ) {
    AddModelProviderCredential(input: $input) {
      id
      name
      modelProvider
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

function ModelProviderCredentialsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
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
            isLoading
            deletingCredentialId={null}
            onDelete={async () => undefined}
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
  const data = useLazyLoadQuery<modelProviderCredentialsPageQuery>(
    modelProviderCredentialsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitCreateCredential, isCreateCredentialInFlight] =
    useMutation<modelProviderCredentialsPageCreateCredentialMutation>(
      modelProviderCredentialsPageCreateCredentialMutationNode,
    );
  const [commitDeleteCredential, isDeleteCredentialInFlight] =
    useMutation<modelProviderCredentialsPageDeleteCredentialMutation>(
      modelProviderCredentialsPageDeleteCredentialMutationNode,
    );
  const credentials: CredentialsTableRecord[] = data.ModelProviderCredentials.map((credential) => ({
    id: credential.id,
    name: credential.name,
    modelProvider: credential.modelProvider,
    createdAt: credential.createdAt,
    updatedAt: credential.updatedAt,
  }));
  const providers = data.ModelProviders.map((provider) => ({
    authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown,
    id: provider.id,
    name: formatProviderLabel(provider.id),
    type: provider.type as "api_key" | "oauth",
  }));

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
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
            isLoading={false}
            deletingCredentialId={deletingCredentialId}
            onDelete={async (credentialId) => {
              if (isDeleteCredentialInFlight) {
                return;
              }

              setErrorMessage(null);
              setDeletingCredentialId(credentialId);

              await new Promise<void>((resolve, reject) => {
                commitDeleteCredential({
                  variables: {
                    input: {
                      id: credentialId,
                    },
                  },
                  updater: (store) => {
                    const deletedCredential = store.getRootField("DeleteModelProviderCredential");
                    if (!deletedCredential) {
                      return;
                    }

                    const deletedId = deletedCredential.getDataID();
                    const rootRecord = store.getRoot();
                    const currentCredentials = rootRecord.getLinkedRecords("ModelProviderCredentials") || [];
                    rootRecord.setLinkedRecords(
                      currentCredentials.filter((record) => record && record.getDataID() !== deletedId),
                      "ModelProviderCredentials",
                    );
                  },
                  onCompleted: (_response, errors) => {
                    const errorMessage = String(errors?.[0]?.message || "").trim();
                    if (errorMessage) {
                      reject(new Error(errorMessage));
                      return;
                    }

                    resolve();
                  },
                  onError: reject,
                });
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete credential.");
              });

              setDeletingCredentialId(null);
            }}
          />
        </CardContent>
      </Card>

      <CreateCredentialDialog
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isCreateCredentialInFlight}
        providers={providers}
        onCreate={async (input) => {
          setErrorMessage(null);

          await new Promise<void>((resolve, reject) => {
            commitCreateCredential({
              variables: {
                input,
              },
              updater: (store) => {
                const newCredential = store.getRootField("AddModelProviderCredential");
                if (!newCredential) {
                  return;
                }

                const rootRecord = store.getRoot();
                const currentCredentials = rootRecord.getLinkedRecords("ModelProviderCredentials") || [];
                rootRecord.setLinkedRecords(
                  [newCredential, ...currentCredentials],
                  "ModelProviderCredentials",
                );
              },
              onCompleted: (_response, errors) => {
                const errorMessage = String(errors?.[0]?.message || "").trim();
                if (errorMessage) {
                  reject(new Error(errorMessage));
                  return;
                }

                setCreateDialogOpen(false);
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
