import { Suspense, useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useToast } from "@/components/toast_provider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ComputeProviderDefinitionDialog, type ComputeProviderDefinitionDialogRecord } from "./definition_dialog";
import {
  ComputeProviderDefinitionsTable,
  type ComputeProviderDefinitionTableRecord,
} from "./definitions_table";
import type { computeProviderDefinitionsPageAddMutation } from "./__generated__/computeProviderDefinitionsPageAddMutation.graphql";
import type { computeProviderDefinitionsPageDeleteMutation } from "./__generated__/computeProviderDefinitionsPageDeleteMutation.graphql";
import type { computeProviderDefinitionsPageQuery } from "./__generated__/computeProviderDefinitionsPageQuery.graphql";
import type { computeProviderDefinitionsPageUpdateMutation } from "./__generated__/computeProviderDefinitionsPageUpdateMutation.graphql";

const computeProviderDefinitionsPageQueryNode = graphql`
  query computeProviderDefinitionsPageQuery {
    ComputeProviderDefinitions {
      id
      name
      provider
      description
      daytona {
        apiUrl
      }
      e2b {
        hasApiKey
      }
      createdAt
      updatedAt
    }
  }
`;

const computeProviderDefinitionsPageAddMutationNode = graphql`
  mutation computeProviderDefinitionsPageAddMutation(
    $input: AddComputeProviderDefinitionInput!
  ) {
    AddComputeProviderDefinition(input: $input) {
      id
      name
      provider
      description
      daytona {
        apiUrl
      }
      e2b {
        hasApiKey
      }
      createdAt
      updatedAt
    }
  }
`;

const computeProviderDefinitionsPageUpdateMutationNode = graphql`
  mutation computeProviderDefinitionsPageUpdateMutation(
    $input: UpdateComputeProviderDefinitionInput!
  ) {
    UpdateComputeProviderDefinition(input: $input) {
      id
      name
      provider
      description
      daytona {
        apiUrl
      }
      e2b {
        hasApiKey
      }
      createdAt
      updatedAt
    }
  }
`;

const computeProviderDefinitionsPageDeleteMutationNode = graphql`
  mutation computeProviderDefinitionsPageDeleteMutation(
    $input: DeleteComputeProviderDefinitionInput!
  ) {
    DeleteComputeProviderDefinition(input: $input) {
      id
    }
  }
`;

function ComputeProviderDefinitionsPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Manage company-scoped compute backends that agents can use for environment
              provisioning.
            </CardDescription>
          </div>
          <CardAction>
            <Button disabled size="sm">
              <PlusIcon />
              Add compute provider
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ComputeProviderDefinitionsTable
            definitions={[]}
            deletingDefinitionId={null}
            isLoading
            onDelete={async () => undefined}
            onEdit={() => undefined}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function ComputeProviderDefinitionsPageContent() {
  const toast = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dialogDefinition, setDialogDefinition] = useState<ComputeProviderDefinitionDialogRecord | null>(null);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [deletingDefinitionId, setDeletingDefinitionId] = useState<string | null>(null);
  const data = useLazyLoadQuery<computeProviderDefinitionsPageQuery>(
    computeProviderDefinitionsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );
  const [commitAddDefinition, isAddDefinitionInFlight] = useMutation<computeProviderDefinitionsPageAddMutation>(
    computeProviderDefinitionsPageAddMutationNode,
  );
  const [commitUpdateDefinition, isUpdateDefinitionInFlight] = useMutation<computeProviderDefinitionsPageUpdateMutation>(
    computeProviderDefinitionsPageUpdateMutationNode,
  );
  const [commitDeleteDefinition, isDeleteDefinitionInFlight] = useMutation<computeProviderDefinitionsPageDeleteMutation>(
    computeProviderDefinitionsPageDeleteMutationNode,
  );
  const definitions = useMemo<ComputeProviderDefinitionTableRecord[]>(() => {
    return data.ComputeProviderDefinitions.map((definition) => ({
      description: definition.description,
      daytonaApiUrl: definition.daytona?.apiUrl ?? null,
      hasApiKey: definition.e2b?.hasApiKey ?? definition.daytona !== null,
      id: definition.id,
      name: definition.name,
      provider: definition.provider as "daytona" | "e2b",
      updatedAt: definition.updatedAt,
    }));
  }, [data.ComputeProviderDefinitions]);
  const isSaving = isAddDefinitionInFlight || isUpdateDefinitionInFlight;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardDescription>
              Manage company-scoped compute backends that agents can use for environment
              provisioning.
            </CardDescription>
          </div>
          <CardAction>
            <Button
              onClick={() => {
                setDialogDefinition(null);
                setErrorMessage(null);
                setDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Add compute provider
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage && !isDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <ComputeProviderDefinitionsTable
            definitions={definitions}
            deletingDefinitionId={deletingDefinitionId}
            isLoading={false}
            onDelete={async (definitionId) => {
              if (isDeleteDefinitionInFlight) {
                return;
              }

              setErrorMessage(null);
              setDeletingDefinitionId(definitionId);

              await new Promise<void>((resolve, reject) => {
                commitDeleteDefinition({
                  variables: {
                    input: {
                      id: definitionId,
                    },
                  },
                  updater: (store) => {
                    const deletedDefinition = store.getRootField("DeleteComputeProviderDefinition");
                    if (!deletedDefinition) {
                      return;
                    }

                    const deletedId = deletedDefinition.getDataID();
                    const rootRecord = store.getRoot();
                    const currentDefinitions = rootRecord.getLinkedRecords("ComputeProviderDefinitions") || [];
                    rootRecord.setLinkedRecords(
                      currentDefinitions.filter((record) => record && record.getDataID() !== deletedId),
                      "ComputeProviderDefinitions",
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
              }).then(() => {
                toast.showSavedToast("Deleted");
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete compute provider.");
              });

              setDeletingDefinitionId(null);
            }}
            onEdit={(definition) => {
              setDialogDefinition({
                description: definition.description,
                daytonaApiUrl: definition.daytonaApiUrl,
                id: definition.id,
                name: definition.name,
                provider: definition.provider,
              });
              setErrorMessage(null);
              setDialogOpen(true);
            }}
          />
        </CardContent>
      </Card>

      <ComputeProviderDefinitionDialog
        definition={dialogDefinition}
        errorMessage={isDialogOpen ? errorMessage : null}
        isOpen={isDialogOpen}
        isSaving={isSaving}
        onOpenChange={setDialogOpen}
        onSave={async (input) => {
          setErrorMessage(null);

          const mutation = "id" in input ? commitUpdateDefinition : commitAddDefinition;
          const mutationName = "id" in input ? "UpdateComputeProviderDefinition" : "AddComputeProviderDefinition";

          await new Promise<void>((resolve, reject) => {
            mutation({
              variables: {
                input,
              },
              updater: "id" in input
                ? undefined
                : (store) => {
                  const newDefinition = store.getRootField(mutationName);
                  if (!newDefinition) {
                    return;
                  }

                  const rootRecord = store.getRoot();
                  const currentDefinitions = rootRecord.getLinkedRecords("ComputeProviderDefinitions") || [];
                  rootRecord.setLinkedRecords([newDefinition, ...currentDefinitions], "ComputeProviderDefinitions");
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
          }).then(() => {
            setDialogOpen(false);
            toast.showSavedToast();
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to save compute provider.");
          });
        }}
      />
    </main>
  );
}

export function ComputeProviderDefinitionsPage() {
  return (
    <Suspense fallback={<ComputeProviderDefinitionsPageFallback />}>
      <ComputeProviderDefinitionsPageContent />
    </Suspense>
  );
}
