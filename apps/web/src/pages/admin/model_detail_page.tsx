import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, PlusIcon, RouteIcon, SaveIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CreateCredentialDialog } from "@/pages/model-provider-credentials/create_credential_dialog";
import { ModelProviderCredentialCatalog } from "@/pages/model-provider-credentials/provider_catalog";
import { formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
import type { modelDetailPageAddCredentialMutation } from "./__generated__/modelDetailPageAddCredentialMutation.graphql";
import type { modelDetailPageQuery } from "./__generated__/modelDetailPageQuery.graphql";
import type { modelDetailPageSetRoutesMutation } from "./__generated__/modelDetailPageSetRoutesMutation.graphql";

const modelDetailPageQueryNode = graphql`
  query modelDetailPageQuery($platformModelId: ID!) {
    ModelProviders {
      id
      name
      type
      authorizationInstructionsMarkdown
    }
    PlatformModels {
      id
      modelProvider
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
      isDefault
      isAvailable
      routeCount
    }
    PlatformModelRoutes(platformModelId: $platformModelId) {
      id
      platformModelProviderCredentialModelId
      platformModelProviderCredentialModel {
        id
        isAvailable
        modelId
        name
        platformModelProviderCredential {
          id
          name
          modelProvider
          status
        }
      }
    }
    PlatformModelProviderCredentials {
      id
      baseUrl
      name
      modelProvider
      status
    }
    PlatformModelProviderCredentialModels {
      id
      isAvailable
      isDefault
      platformModelProviderCredentialId
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
      updatedAt
    }
  }
`;

const modelDetailPageAddCredentialMutationNode = graphql`
  mutation modelDetailPageAddCredentialMutation($input: AddPlatformModelProviderCredentialInput!) {
    AddPlatformModelProviderCredential(input: $input) {
      id
      defaultModelId
    }
  }
`;

const modelDetailPageSetRoutesMutationNode = graphql`
  mutation modelDetailPageSetRoutesMutation($input: SetPlatformModelRoutesInput!) {
    SetPlatformModelRoutes(input: $input) {
      id
      routeCount
      updatedAt
    }
  }
`;

type PlatformCredential = modelDetailPageQuery["response"]["PlatformModelProviderCredentials"][number];
type PlatformCredentialModel = modelDetailPageQuery["response"]["PlatformModelProviderCredentialModels"][number];
type PlatformModel = modelDetailPageQuery["response"]["PlatformModels"][number];

/**
 * Lets platform admins choose the concrete platform credential and provider model that should
 * receive requests for one stable platform model.
 */
export function AdminModelDetailPage() {
  return (
    <PlatformAdminGuard>
      <AdminModelDetailPageContent />
    </PlatformAdminGuard>
  );
}

function AdminModelDetailPageContent() {
  const params = useParams({ strict: false }) as { platformModelId?: string };
  const platformModelId = params.platformModelId ?? "";
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [showAllCredentials, setShowAllCredentials] = useState(false);
  const data = useLazyLoadQuery<modelDetailPageQuery>(
    modelDetailPageQueryNode,
    {
      platformModelId,
    },
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const platformModel = data.PlatformModels.find((model) => model.id === platformModelId) ?? null;
  const credentialById = useMemo(() => {
    return new Map(data.PlatformModelProviderCredentials.map((credential) => [credential.id, credential]));
  }, [data.PlatformModelProviderCredentials]);
  const visibleCredentialModels = useMemo(() => {
    return data.PlatformModelProviderCredentialModels
      .filter((credentialModel) => {
        const credential = credentialById.get(credentialModel.platformModelProviderCredentialId);
        if (!credential) {
          return false;
        }
        if (showAllCredentials) {
          return true;
        }
        if (!platformModel) {
          return false;
        }

        return credential.modelProvider === platformModel.modelProvider
          && credentialModel.modelId === platformModel.modelId;
      })
      .sort((left, right) => {
        const leftCredential = credentialById.get(left.platformModelProviderCredentialId);
        const rightCredential = credentialById.get(right.platformModelProviderCredentialId);
        const credentialComparison = String(leftCredential?.name ?? "")
          .localeCompare(String(rightCredential?.name ?? ""));
        if (credentialComparison !== 0) {
          return credentialComparison;
        }

        return left.name.localeCompare(right.name);
      });
  }, [credentialById, data.PlatformModelProviderCredentialModels, platformModel, showAllCredentials]);
  const initialRouteModelIds = useMemo(() => {
    return data.PlatformModelRoutes.map((route) => route.platformModelProviderCredentialModelId);
  }, [data.PlatformModelRoutes]);
  const [selectedRouteModelIds, setSelectedRouteModelIds] = useState<Set<string>>(() => new Set(initialRouteModelIds));
  const [commitAddCredential, isAddCredentialInFlight] =
    useMutation<modelDetailPageAddCredentialMutation>(modelDetailPageAddCredentialMutationNode);
  const [commitSetRoutes, isSetRoutesInFlight] =
    useMutation<modelDetailPageSetRoutesMutation>(modelDetailPageSetRoutesMutationNode);
  const providers = useMemo(() => {
    const apiProviders = data.ModelProviders
      .filter((provider) => {
        return provider.id !== "companyhelm";
      })
      .map((provider) => ({
        authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown ?? null,
        id: provider.id,
        name: formatProviderLabel(provider.id),
        type: provider.type as "api_key" | "oauth",
      }));

    return ModelProviderCredentialCatalog.toDialogProviders(apiProviders);
  }, [data.ModelProviders]);

  useEffect(() => {
    setSelectedRouteModelIds(new Set(initialRouteModelIds));
  }, [initialRouteModelIds]);

  const selectedRouteModelIdsArray = [...selectedRouteModelIds].sort();
  const hasChanges = selectedRouteModelIdsArray.join("|") !== [...initialRouteModelIds].sort().join("|");

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <Button asChild className="mb-4" size="sm" variant="ghost">
              <Link to="/admin/models">
                <ArrowLeftIcon />
                Back
              </Link>
            </Button>
            <CardTitle className="flex items-center gap-2">
              <RouteIcon className="size-5 text-muted-foreground" />
              {platformModel?.name ?? "Platform model routing"}
            </CardTitle>
            <CardDescription>
              {platformModel ? `${formatProviderLabel(platformModel.modelProvider)} / ${platformModel.modelId}` : ""}
            </CardDescription>
          </div>
          <CardAction>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                disabled={!platformModel || providers.length === 0}
                onClick={() => {
                  setErrorMessage(null);
                  setCreateDialogOpen(true);
                }}
                size="sm"
                variant="outline"
              >
                <PlusIcon />
                Add router
              </Button>
              <Button
                disabled={!platformModel || !hasChanges || isSetRoutesInFlight}
                onClick={async () => {
                  if (!platformModel) {
                    return;
                  }

                  setErrorMessage(null);
                  await new Promise<void>((resolve, reject) => {
                    commitSetRoutes({
                      variables: {
                        input: {
                          platformModelId: platformModel.id,
                          platformModelProviderCredentialModelIds: selectedRouteModelIdsArray,
                        },
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
                    setErrorMessage(error instanceof Error ? error.message : "Failed to update model routes.");
                  });
                }}
                size="sm"
              >
                <SaveIcon />
                Save routes
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-5">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {platformModel ? <PlatformModelSummary model={platformModel} /> : null}
          <div className="flex items-center justify-end">
            <Button
              onClick={() => {
                setShowAllCredentials((current) => !current);
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              {showAllCredentials ? "Show matching credentials" : "Show all credentials"}
            </Button>
          </div>
          <EligibleRoutesTable
            credentialById={credentialById}
            credentialModels={visibleCredentialModels}
            platformModel={platformModel}
            selectedRouteModelIds={selectedRouteModelIds}
            onToggle={(credentialModelId) => {
              setSelectedRouteModelIds((current) => {
                const next = new Set(current);
                if (next.has(credentialModelId)) {
                  next.delete(credentialModelId);
                } else {
                  next.add(credentialModelId);
                }

                return next;
              });
            }}
          />
        </CardContent>
      </Card>

      <CreateCredentialDialog
        defaultCheckboxDescription="Use this credential as the platform fallback for managed model selection."
        defaultCheckboxTitle="Platform default"
        description={platformModel
          ? `Add a platform credential. Its discovered models can be selected as routes for ${platformModel.modelId}.`
          : "Add an operator-owned provider credential."}
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isAddCredentialInFlight}
        providers={providers}
        suggestDefault={data.PlatformModelProviderCredentials.length === 0}
        onCreate={async (input) => {
          setErrorMessage(null);
          await new Promise<void>((resolve, reject) => {
            commitAddCredential({
              variables: {
                input,
              },
              onCompleted: (_response, errors) => {
                const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                setCreateDialogOpen(false);
                resolve();
              },
              onError: reject,
            });
          }).then(() => {
            setShowAllCredentials(true);
            setFetchKey((current) => current + 1);
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create router credential.");
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}

function PlatformModelSummary(props: { model: PlatformModel }) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 md:grid-cols-4">
      <div className="md:col-span-2">
        <div className="flex items-center gap-2">
          <ModelProviderIcon
            label={formatProviderLabel(props.model.modelProvider)}
            providerId={props.model.modelProvider}
          />
          <p className="text-sm font-medium text-foreground">{formatProviderLabel(props.model.modelProvider)}</p>
        </div>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{props.model.modelId}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Status</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {props.model.isAvailable ? <Badge variant="positive">Available</Badge> : <Badge variant="destructive">Unavailable</Badge>}
          {props.model.isDefault ? <Badge variant="secondary">Default</Badge> : null}
        </div>
      </div>
      <div>
        <p className="text-xs font-medium uppercase text-muted-foreground">Reasoning</p>
        <p className="mt-2 text-sm text-foreground">
          {props.model.reasoningSupported ? props.model.reasoningLevels.join(", ") || "Supported" : "None"}
        </p>
      </div>
    </div>
  );
}

function EligibleRoutesTable(props: {
  credentialById: Map<string, PlatformCredential>;
  credentialModels: readonly PlatformCredentialModel[];
  platformModel: PlatformModel | null;
  selectedRouteModelIds: Set<string>;
  onToggle(credentialModelId: string): void;
}) {
  if (props.credentialModels.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No eligible credential models</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Add or update platform LLM credentials, or show all credentials to select a different provider model.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Use</TableHead>
          <TableHead>Credential</TableHead>
          <TableHead>Concrete model</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.credentialModels.map((credentialModel) => {
          const credential = props.credentialById.get(credentialModel.platformModelProviderCredentialId);
          const isSelected = props.selectedRouteModelIds.has(credentialModel.id);
          const isSameModelId = props.platformModel
            ? credential?.modelProvider === props.platformModel.modelProvider
              && credentialModel.modelId === props.platformModel.modelId
            : false;
          return (
            <TableRow
              key={credentialModel.id}
              className={cn(isSelected ? "bg-primary/5" : "")}
            >
              <TableCell>
                <input
                  aria-label={`Use ${credential?.name ?? credentialModel.name}`}
                  checked={isSelected}
                  className="size-4 rounded border-border accent-primary"
                  onChange={() => {
                    props.onToggle(credentialModel.id);
                  }}
                  type="checkbox"
                />
              </TableCell>
              <TableCell>
                <div className="font-medium text-foreground">{credential?.name ?? "Unknown credential"}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  {credential ? (
                    <ModelProviderIcon
                      label={formatProviderLabel(credential.modelProvider)}
                      providerId={credential.modelProvider}
                    />
                  ) : null}
                  {credential ? formatProviderLabel(credential.modelProvider) : "Unknown provider"}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium text-foreground">{credentialModel.name}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">{credentialModel.modelId}</div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {credential?.status === "active" ? <Badge variant="positive">Credential active</Badge> : <Badge variant="destructive">Credential error</Badge>}
                  {credentialModel.isAvailable ? <Badge variant="positive">Model available</Badge> : <Badge variant="warning">Model unavailable</Badge>}
                  {credentialModel.isDefault ? <Badge variant="secondary">Credential default</Badge> : null}
                  {isSameModelId ? null : <Badge variant="outline">Different target model</Badge>}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
