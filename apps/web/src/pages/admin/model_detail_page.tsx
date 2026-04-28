import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, PencilIcon, PlusIcon, PowerIcon, RouteIcon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateCredentialDialog } from "@/pages/model-provider-credentials/create_credential_dialog";
import { ModelProviderCredentialCatalog } from "@/pages/model-provider-credentials/provider_catalog";
import { formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
import type { modelDetailPageAddCredentialMutation } from "./__generated__/modelDetailPageAddCredentialMutation.graphql";
import type { modelDetailPageQuery } from "./__generated__/modelDetailPageQuery.graphql";
import type { modelDetailPageSetRoutesMutation } from "./__generated__/modelDetailPageSetRoutesMutation.graphql";
import type { modelDetailPageUpdateMutation } from "./__generated__/modelDetailPageUpdateMutation.graphql";

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

const modelDetailPageUpdateMutationNode = graphql`
  mutation modelDetailPageUpdateMutation($input: UpdatePlatformModelInput!) {
    UpdatePlatformModel(input: $input) {
      id
      name
      isAvailable
      isDefault
      routeCount
      updatedAt
    }
  }
`;

type PlatformCredential = modelDetailPageQuery["response"]["PlatformModelProviderCredentials"][number];
type PlatformCredentialModel = modelDetailPageQuery["response"]["PlatformModelProviderCredentialModels"][number];
type PlatformModel = modelDetailPageQuery["response"]["PlatformModels"][number];
type PlatformRoute = modelDetailPageQuery["response"]["PlatformModelRoutes"][number];

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
  const [addRouteDialogOpen, setAddRouteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
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
  const routeableCredentialModels = useMemo(() => {
    if (!platformModel) {
      return [];
    }

    return data.PlatformModelProviderCredentialModels
      .filter((credentialModel) => {
        return credentialModel.modelId === platformModel.modelId;
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
  }, [credentialById, data.PlatformModelProviderCredentialModels, platformModel]);
  const [commitAddCredential, isAddCredentialInFlight] =
    useMutation<modelDetailPageAddCredentialMutation>(modelDetailPageAddCredentialMutationNode);
  const [commitSetRoutes, isSetRoutesInFlight] =
    useMutation<modelDetailPageSetRoutesMutation>(modelDetailPageSetRoutesMutationNode);
  const [commitUpdateModel, isUpdateModelInFlight] =
    useMutation<modelDetailPageUpdateMutation>(modelDetailPageUpdateMutationNode);
  const routeModelIds = useMemo(() => {
    return data.PlatformModelRoutes.map((route) => route.platformModelProviderCredentialModelId);
  }, [data.PlatformModelRoutes]);
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

  async function replaceRoutes(platformModelRecord: PlatformModel, routeIds: string[]): Promise<void> {
    setErrorMessage(null);
    await new Promise<void>((resolve, reject) => {
      commitSetRoutes({
        variables: {
          input: {
            platformModelId: platformModelRecord.id,
            platformModelProviderCredentialModelIds: [...new Set(routeIds)].sort(),
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
      setAddRouteDialogOpen(false);
      setFetchKey((current) => current + 1);
    }).catch((error: unknown) => {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update model routes.");
    });
  }

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
          <CardAction className="flex flex-wrap justify-end gap-2">
            <Button
              disabled={!platformModel || isUpdateModelInFlight}
              onClick={() => {
                setErrorMessage(null);
                setRenameDialogOpen(true);
              }}
              size="sm"
              variant="outline"
            >
              <PencilIcon />
              Rename
            </Button>
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
              disabled={!platformModel || isUpdateModelInFlight}
              onClick={async () => {
                if (!platformModel) {
                  return;
                }

                setErrorMessage(null);
                await new Promise<void>((resolve, reject) => {
                  commitUpdateModel({
                    variables: {
                      input: {
                        platformModelId: platformModel.id,
                        isAvailable: !platformModel.isAvailable,
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
                  setErrorMessage(error instanceof Error ? error.message : "Failed to update platform model.");
                });
              }}
              size="sm"
              variant="outline"
            >
              <PowerIcon />
              {platformModel?.isAvailable ? "Deactivate" : "Activate"}
            </Button>
            <Button
              disabled={!platformModel || isSetRoutesInFlight}
              onClick={() => {
                setErrorMessage(null);
                setAddRouteDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              Add route
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-5">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {platformModel ? <PlatformModelSummary model={platformModel} /> : null}
          <CurrentRoutesTable
            credentialById={credentialById}
            disabled={!platformModel || isSetRoutesInFlight}
            onDelete={(credentialModelId) => {
              if (!platformModel) {
                return;
              }

              void replaceRoutes(
                platformModel,
                routeModelIds.filter((routeModelId) => routeModelId !== credentialModelId),
              );
            }}
            routes={data.PlatformModelRoutes}
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
            setFetchKey((current) => current + 1);
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create router credential.");
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
      {platformModel ? (
        <AddRouteDialog
          credentialById={credentialById}
          credentialModels={routeableCredentialModels}
          credentials={data.PlatformModelProviderCredentials}
          disabled={isSetRoutesInFlight}
          existingRouteModelIds={routeModelIds}
          onAdd={(credentialModelId) => {
            void replaceRoutes(platformModel, [...routeModelIds, credentialModelId]);
          }}
          onOpenChange={setAddRouteDialogOpen}
          open={addRouteDialogOpen}
          platformModel={platformModel}
        />
      ) : null}
      {platformModel ? (
        <RenamePlatformModelDialog
          inFlight={isUpdateModelInFlight}
          model={platformModel}
          onOpenChange={setRenameDialogOpen}
          onRename={async (name) => {
            setErrorMessage(null);
            await new Promise<void>((resolve, reject) => {
              commitUpdateModel({
                variables: {
                  input: {
                    platformModelId: platformModel.id,
                    name,
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
              setRenameDialogOpen(false);
              setFetchKey((current) => current + 1);
            }).catch((error: unknown) => {
              setErrorMessage(error instanceof Error ? error.message : "Failed to rename platform model.");
            });
          }}
          open={isRenameDialogOpen}
        />
      ) : null}
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

function CurrentRoutesTable(props: {
  credentialById: Map<string, PlatformCredential>;
  disabled: boolean;
  onDelete(credentialModelId: string): void;
  routes: readonly PlatformRoute[];
}) {
  if (props.routes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No routes configured</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Add an existing provider credential model before activating this platform model.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Credential</TableHead>
          <TableHead>Concrete model</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.routes.map((route) => {
          const credentialModel = route.platformModelProviderCredentialModel;
          const credentialId = credentialModel.platformModelProviderCredential?.id ?? "";
          const credential = props.credentialById.get(credentialId);
          return (
            <TableRow key={route.id}>
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
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  aria-label={`Delete route ${credential?.name ?? credentialModel.name}`}
                  disabled={props.disabled}
                  onClick={() => {
                    props.onDelete(credentialModel.id);
                  }}
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function RenamePlatformModelDialog(props: {
  inFlight: boolean;
  model: PlatformModel;
  onOpenChange(open: boolean): void;
  onRename(name: string): Promise<void>;
  open: boolean;
}) {
  const [name, setName] = useState(props.model.name);
  const trimmedName = name.trim();
  const hasChanges = trimmedName !== props.model.name;

  useEffect(() => {
    if (props.open) {
      setName(props.model.name);
    }
  }, [props.model.name, props.open]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename platform model</DialogTitle>
          <DialogDescription>
            Update the display name shown to admins and companies without changing the provider model id.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-foreground" htmlFor="platform-model-name">
            Name
          </label>
          <Input
            autoFocus
            id="platform-model-name"
            onChange={(event) => {
              setName(event.target.value);
            }}
            value={name}
          />
          <p className="font-mono text-xs text-muted-foreground">{props.model.modelId}</p>
        </div>
        <DialogFooter>
          <Button
            disabled={props.inFlight || !trimmedName || !hasChanges}
            onClick={() => {
              void props.onRename(trimmedName);
            }}
          >
            <PencilIcon />
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddRouteDialog(props: {
  credentialById: Map<string, PlatformCredential>;
  credentialModels: readonly PlatformCredentialModel[];
  credentials: readonly PlatformCredential[];
  disabled: boolean;
  existingRouteModelIds: readonly string[];
  onAdd(credentialModelId: string): void;
  onOpenChange(open: boolean): void;
  open: boolean;
  platformModel: PlatformModel;
}) {
  const activeCredentialIds = new Set(
    props.credentials
      .filter((credential) => credential.status === "active")
      .map((credential) => credential.id),
  );
  const existingRouteModelIds = new Set(props.existingRouteModelIds);
  const credentialsWithModels = props.credentials
    .filter((credential) => activeCredentialIds.has(credential.id))
    .filter((credential) =>
      props.credentialModels.some((model) =>
        model.platformModelProviderCredentialId === credential.id
        && model.isAvailable
        && !existingRouteModelIds.has(model.id)
      )
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const [credentialId, setCredentialId] = useState(credentialsWithModels[0]?.id ?? "");
  const modelOptions = props.credentialModels
    .filter((model) =>
      model.platformModelProviderCredentialId === credentialId
      && model.isAvailable
      && !existingRouteModelIds.has(model.id)
    )
    .sort((left, right) => left.name.localeCompare(right.name));
  const [credentialModelId, setCredentialModelId] = useState(modelOptions[0]?.id ?? "");
  const selectedCredentialModelId = credentialModelId || modelOptions[0]?.id || "";

  useEffect(() => {
    const nextCredentialId = credentialsWithModels.some((credential) => credential.id === credentialId)
      ? credentialId
      : credentialsWithModels[0]?.id ?? "";
    if (nextCredentialId !== credentialId) {
      setCredentialId(nextCredentialId);
      setCredentialModelId("");
      return;
    }

    if (!modelOptions.some((model) => model.id === credentialModelId)) {
      setCredentialModelId(modelOptions[0]?.id ?? "");
    }
  }, [credentialId, credentialModelId, credentialsWithModels, modelOptions]);

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add route</DialogTitle>
          <DialogDescription>
            Select an existing provider credential and one discovered model for this platform model.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="route-provider">
              Provider credential
            </label>
            <Select
              items={credentialsWithModels.map((credential) => ({
                label: credential.name,
                value: credential.id,
              }))}
              onValueChange={(value) => {
                setCredentialId(value ?? "");
                setCredentialModelId("");
              }}
              value={credentialId}
            >
              <SelectTrigger id="route-provider">
                <SelectValue placeholder="Select provider credential" />
              </SelectTrigger>
              <SelectContent>
                {credentialsWithModels.map((credential) => (
                  <SelectItem key={credential.id} value={credential.id}>
                    {credential.name} - {formatProviderLabel(credential.modelProvider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="route-model">
              Model
            </label>
            <Select
              items={modelOptions.map((model) => ({
                label: model.name,
                value: model.id,
              }))}
              onValueChange={(value) => {
                setCredentialModelId(value ?? "");
              }}
              value={selectedCredentialModelId}
            >
              <SelectTrigger id="route-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} - {model.modelId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Routes are limited to discovered models with id {props.platformModel.modelId}.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={props.disabled || !selectedCredentialModelId}
            onClick={() => {
              props.onAdd(selectedCredentialModelId);
            }}
          >
            <PlusIcon />
            Add route
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
