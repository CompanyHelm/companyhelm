import { Suspense, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { ComputeProviderLimitsCatalog } from "@/compute_provider_limits_catalog";
import { useToast } from "@/components/toast_provider";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useFeatureFlags } from "@/contextes/feature_flag_context";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { ComputeProviderDefinitionDialog, type ComputeProviderDefinitionDialogRecord } from "./definition_dialog";
import {
  ComputeProviderDefinitionsTable,
  type ComputeProviderDefinitionTableRecord,
} from "./definitions_table";
import type { computeProviderDefinitionsPageAddMutation } from "./__generated__/computeProviderDefinitionsPageAddMutation.graphql";
import type { computeProviderDefinitionsPageDeleteMutation } from "./__generated__/computeProviderDefinitionsPageDeleteMutation.graphql";
import type { computeProviderDefinitionsPageQuery } from "./__generated__/computeProviderDefinitionsPageQuery.graphql";
import type { computeProviderDefinitionsPageSetDefaultMutation } from "./__generated__/computeProviderDefinitionsPageSetDefaultMutation.graphql";
import type { computeProviderDefinitionsPageUpdateMutation } from "./__generated__/computeProviderDefinitionsPageUpdateMutation.graphql";

const computeProviderDefinitionsPageQueryNode = graphql`
  query computeProviderDefinitionsPageQuery {
    ComputeProviderDefinitions {
      id
      isDefault
      name
      provider
      description
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
      isDefault
      name
      provider
      description
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
      isDefault
      name
      provider
      description
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

const computeProviderDefinitionsPageSetDefaultMutationNode = graphql`
  mutation computeProviderDefinitionsPageSetDefaultMutation(
    $input: SetDefaultComputeProviderDefinitionInput!
  ) {
    SetDefaultComputeProviderDefinition(input: $input) {
      id
      isDefault
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
              provisioning. Published CPU, memory, and disk ranges are shown for planning.
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
            settingDefaultDefinitionId={null}
            onDelete={async () => undefined}
            onEdit={() => undefined}
            onSetDefault={async () => undefined}
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
  const [fetchKey, setFetchKey] = useState(0);
  const [settingDefaultDefinitionId, setSettingDefaultDefinitionId] = useState<string | null>(null);
  const data = useLazyLoadQuery<computeProviderDefinitionsPageQuery>(
    computeProviderDefinitionsPageQueryNode,
    {},
    {
      fetchKey,
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
  const [commitSetDefaultDefinition, isSetDefaultDefinitionInFlight] = useMutation<computeProviderDefinitionsPageSetDefaultMutation>(
    computeProviderDefinitionsPageSetDefaultMutationNode,
  );
  const definitions = useMemo<ComputeProviderDefinitionTableRecord[]>(() => {
    return data.ComputeProviderDefinitions.map((definition) => ({
      description: definition.description,
      hasApiKey: definition.e2b?.hasApiKey ?? false,
      id: definition.id,
      isDefault: definition.isDefault,
      name: definition.name,
      provider: definition.provider as "e2b",
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
              provisioning. Published CPU, memory, and disk ranges are shown for planning.
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
          <p className="text-xs text-muted-foreground">
            {ComputeProviderLimitsCatalog.getPublishedRangeDisclaimer()}
          </p>

          {errorMessage && !isDialogOpen ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <ComputeProviderDefinitionsTable
            definitions={definitions}
            deletingDefinitionId={deletingDefinitionId}
            isLoading={false}
            settingDefaultDefinitionId={settingDefaultDefinitionId}
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
                setFetchKey((current) => current + 1);
                toast.showSavedToast("Deleted");
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete compute provider.");
              });

              setDeletingDefinitionId(null);
            }}
            onEdit={(definition) => {
              setDialogDefinition({
                description: definition.description,
                id: definition.id,
                name: definition.name,
                provider: definition.provider,
              });
              setErrorMessage(null);
              setDialogOpen(true);
            }}
            onSetDefault={async (definitionId) => {
              if (isSetDefaultDefinitionInFlight) {
                return;
              }

              setErrorMessage(null);
              setSettingDefaultDefinitionId(definitionId);

              await new Promise<void>((resolve, reject) => {
                commitSetDefaultDefinition({
                  variables: {
                    input: {
                      id: definitionId,
                    },
                  },
                  updater: (store) => {
                    const updatedDefinition = store.getRootField("SetDefaultComputeProviderDefinition");
                    if (!updatedDefinition) {
                      return;
                    }

                    const updatedId = updatedDefinition.getDataID();
                    const rootRecord = store.getRoot();
                    const currentDefinitions = rootRecord.getLinkedRecords("ComputeProviderDefinitions") || [];
                    currentDefinitions.forEach((record) => {
                      record?.setValue(record?.getDataID() === updatedId, "isDefault");
                    });
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
                setFetchKey((current) => current + 1);
                toast.showSavedToast("Default updated");
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to update default compute provider.");
              });

              setSettingDefaultDefinitionId(null);
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
        suggestDefault={definitions.length === 0}
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
            setFetchKey((current) => current + 1);
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
  const featureFlags = useFeatureFlags();
  const organizationSlug = useCurrentOrganizationSlug();
  if (!featureFlags.isEnabled("computer_providers")) {
    return (
      <main className="flex flex-1 flex-col gap-6">
        <Card className="rounded-2xl border border-border/60 shadow-sm">
          <CardHeader>
            <div className="min-w-0">
              <CardDescription>
                Compute Providers is disabled in this browser. Enable the
                <span className="mx-1 font-medium text-foreground">Computer providers</span>
                feature flag to access this page.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Link
              className="inline-flex h-6 items-center rounded-md border border-border px-2 text-xs font-medium text-foreground transition hover:bg-input/50"
              params={{ organizationSlug }}
              to={OrganizationPath.route("/flags")}
            >
              Open feature flags
            </Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <Suspense fallback={<ComputeProviderDefinitionsPageFallback />}>
      <ComputeProviderDefinitionsPageContent />
    </Suspense>
  );
}
