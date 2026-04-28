import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, BoxesIcon, PlusIcon, RouteIcon, Trash2Icon, UploadIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { ModelProviderIcon } from "@/components/model_provider_icon";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
import type { modelsPageCreateMutation } from "./__generated__/modelsPageCreateMutation.graphql";
import type { modelsPageDeleteMutation } from "./__generated__/modelsPageDeleteMutation.graphql";
import type { modelsPageImportMutation } from "./__generated__/modelsPageImportMutation.graphql";
import type { modelsPageQuery } from "./__generated__/modelsPageQuery.graphql";

const modelsPageQueryNode = graphql`
  query modelsPageQuery {
    PlatformModels {
      id
      key
      modelProvider
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
      isDefault
      isAvailable
      routeCount
      updatedAt
    }
    PlatformModelProviderCredentials {
      id
      name
      modelProvider
      status
    }
    PlatformModelProviderCredentialModels {
      id
      isAvailable
      modelId
      name
      platformModelProviderCredentialId
    }
  }
`;

const modelsPageImportMutationNode = graphql`
  mutation modelsPageImportMutation($input: ImportPlatformModelInput!) {
    ImportPlatformModel(input: $input) {
      id
    }
  }
`;

const modelsPageCreateMutationNode = graphql`
  mutation modelsPageCreateMutation($input: CreatePlatformModelInput!) {
    CreatePlatformModel(input: $input) {
      id
    }
  }
`;

const modelsPageDeleteMutationNode = graphql`
  mutation modelsPageDeleteMutation($input: DeletePlatformModelInput!) {
    DeletePlatformModel(input: $input) {
      id
    }
  }
`;

type PlatformModel = modelsPageQuery["response"]["PlatformModels"][number];
type PlatformCredential = modelsPageQuery["response"]["PlatformModelProviderCredentials"][number];
type PlatformCredentialModel = modelsPageQuery["response"]["PlatformModelProviderCredentialModels"][number];

/**
 * Lists the stable platform model catalog that companies can select while keeping concrete
 * operator credential routing behind the detail page.
 */
export function AdminModelsPage() {
  return (
    <PlatformAdminGuard>
      <AdminModelsPageContent />
    </PlatformAdminGuard>
  );
}

function AdminModelsPageContent() {
  const navigate = useNavigate();
  const [fetchKey, setFetchKey] = useState(0);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const data = useLazyLoadQuery<modelsPageQuery>(
    modelsPageQueryNode,
    {},
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const [commitImport, isImportInFlight] = useMutation<modelsPageImportMutation>(modelsPageImportMutationNode);
  const [commitCreate, isCreateInFlight] = useMutation<modelsPageCreateMutation>(modelsPageCreateMutationNode);
  const [commitDelete, isDeleteInFlight] = useMutation<modelsPageDeleteMutation>(modelsPageDeleteMutationNode);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <BoxesIcon className="size-5 text-muted-foreground" />
              Platform models
            </CardTitle>
            <CardDescription>
              Stable model options exposed to companies, with operator-managed credential routes.
            </CardDescription>
          </div>
          <CardAction className="flex gap-2">
            <Button
              onClick={() => {
                setErrorMessage(null);
                setImportDialogOpen(true);
              }}
              size="sm"
              variant="outline"
            >
              <UploadIcon />
              Import
            </Button>
            <Button
              onClick={() => {
                setErrorMessage(null);
                setManualDialogOpen(true);
              }}
              size="sm"
            >
              <PlusIcon />
              New model
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          <PlatformModelsTable
            deleteInFlight={isDeleteInFlight}
            models={data.PlatformModels}
            onDeleteModel={async (modelId) => {
              setErrorMessage(null);
              await new Promise<void>((resolve, reject) => {
                commitDelete({
                  variables: {
                    input: {
                      id: modelId,
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
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete platform model.");
              });
            }}
            onOpenModel={(modelId) => {
              void navigate({
                to: `/admin/models/${modelId}`,
              });
            }}
          />
        </CardContent>
      </Card>
      <ImportPlatformModelDialog
        credentialModels={data.PlatformModelProviderCredentialModels}
        credentials={data.PlatformModelProviderCredentials}
        inFlight={isImportInFlight}
        onImport={async (input) => {
          setErrorMessage(null);
          await new Promise<string>((resolve, reject) => {
            commitImport({
              variables: {
                input,
              },
              onCompleted: (response, errors) => {
                const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                resolve(response.ImportPlatformModel.id);
              },
              onError: reject,
            });
          }).then((modelId) => {
            setImportDialogOpen(false);
            setFetchKey((current) => current + 1);
            void navigate({ to: `/admin/models/${modelId}` });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to import platform model.");
          });
        }}
        onOpenChange={setImportDialogOpen}
        open={importDialogOpen}
      />
      <ManualPlatformModelDialog
        inFlight={isCreateInFlight}
        onCreate={async (input) => {
          setErrorMessage(null);
          await new Promise<string>((resolve, reject) => {
            commitCreate({
              variables: {
                input,
              },
              onCompleted: (response, errors) => {
                const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                if (nextErrorMessage) {
                  reject(new Error(nextErrorMessage));
                  return;
                }

                resolve(response.CreatePlatformModel.id);
              },
              onError: reject,
            });
          }).then((modelId) => {
            setManualDialogOpen(false);
            setFetchKey((current) => current + 1);
            void navigate({ to: `/admin/models/${modelId}` });
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create platform model.");
          });
        }}
        onOpenChange={setManualDialogOpen}
        open={manualDialogOpen}
      />
    </main>
  );
}

function PlatformModelsTable(props: {
  deleteInFlight: boolean;
  models: readonly PlatformModel[];
  onDeleteModel(modelId: string): Promise<void>;
  onOpenModel(modelId: string): void;
}) {
  if (props.models.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No platform models stored</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Import a discovered credential model, or create an inactive model and add routes later.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Reasoning</TableHead>
          <TableHead>Routes</TableHead>
          <TableHead className="w-32 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.models.map((model) => (
          <TableRow key={model.id}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-medium text-foreground">{model.name}</span>
                {model.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                {model.isAvailable ? null : <Badge variant="destructive">Unavailable</Badge>}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{model.modelId}</div>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-sm">
                <ModelProviderIcon label={formatProviderLabel(model.modelProvider)} providerId={model.modelProvider} />
                {formatProviderLabel(model.modelProvider)}
              </div>
            </TableCell>
            <TableCell>
              {model.reasoningSupported ? (
                <Badge variant="outline">{model.reasoningLevels.join(", ") || "Supported"}</Badge>
              ) : (
                <span className="text-sm text-muted-foreground">None</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-sm">
                <RouteIcon className="size-4 text-muted-foreground" />
                {model.routeCount}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      aria-label={`Delete ${model.name}`}
                      disabled={props.deleteInFlight}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2Icon />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete platform model</AlertDialogTitle>
                      <AlertDialogDescription>
                        Delete {model.name} from the platform catalog. Existing routes for this model will also be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancelAction asChild>
                        <AlertDialogCancelButton type="button" variant="outline">
                          Cancel
                        </AlertDialogCancelButton>
                      </AlertDialogCancelAction>
                      <AlertDialogPrimaryAction asChild>
                        <AlertDialogActionButton
                          disabled={props.deleteInFlight}
                          onClick={() => {
                            void props.onDeleteModel(model.id);
                          }}
                          type="button"
                          variant="destructive"
                        >
                          Delete
                        </AlertDialogActionButton>
                      </AlertDialogPrimaryAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              <Button
                onClick={() => {
                  props.onOpenModel(model.id);
                }}
                size="sm"
                variant="outline"
              >
                  Routing
                  <ArrowRightIcon className="size-4" />
              </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ImportPlatformModelDialog(props: {
  credentialModels: readonly PlatformCredentialModel[];
  credentials: readonly PlatformCredential[];
  inFlight: boolean;
  onImport(input: {
    modelProvider: string;
    platformModelProviderCredentialModelId: string;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
  open: boolean;
}) {
  const activeCredentials = props.credentials.filter((credential) => credential.status === "active");
  const [credentialId, setCredentialId] = useState(activeCredentials[0]?.id ?? "");
  const [credentialModelId, setCredentialModelId] = useState("");
  const [modelProvider, setModelProvider] = useState("companyhelm");
  const availableCredentialModels = useMemo(() => {
    return props.credentialModels
      .filter((model) => model.platformModelProviderCredentialId === credentialId && model.isAvailable)
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [credentialId, props.credentialModels]);
  const selectedCredentialModelId = credentialModelId || availableCredentialModels[0]?.id || "";

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import platform model</DialogTitle>
          <DialogDescription>
            Select a discovered platform credential model and publish it as a CompanyHelm catalog model.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="import-provider">
              Product provider
            </label>
            <Input
              id="import-provider"
              onChange={(event) => {
                setModelProvider(event.target.value);
              }}
              value={modelProvider}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="import-credential">
              Credential
            </label>
            <Select
              items={activeCredentials.map((credential) => ({
                label: credential.name,
                value: credential.id,
              }))}
              onValueChange={(value) => {
                setCredentialId(value ?? "");
                setCredentialModelId("");
              }}
              value={credentialId}
            >
              <SelectTrigger id="import-credential">
                <SelectValue placeholder="Select credential" />
              </SelectTrigger>
              <SelectContent>
                {activeCredentials.map((credential) => (
                  <SelectItem key={credential.id} value={credential.id}>
                    {credential.name} - {formatProviderLabel(credential.modelProvider)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="import-model">
              Discovered model
            </label>
            <Select
              items={availableCredentialModels.map((model) => ({
                label: model.name,
                value: model.id,
              }))}
              onValueChange={(value) => {
                setCredentialModelId(value ?? "");
              }}
              value={selectedCredentialModelId}
            >
              <SelectTrigger id="import-model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {availableCredentialModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name} - {model.modelId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={props.inFlight || !selectedCredentialModelId}
            onClick={() => {
              void props.onImport({
                modelProvider,
                platformModelProviderCredentialModelId: selectedCredentialModelId,
              });
            }}
          >
            <UploadIcon />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualPlatformModelDialog(props: {
  inFlight: boolean;
  onCreate(input: {
    description: string;
    modelId: string;
    modelProvider: string;
    name: string;
    reasoningLevels: string[];
    reasoningSupported: boolean;
  }): Promise<void>;
  onOpenChange(open: boolean): void;
  open: boolean;
}) {
  const [modelProvider, setModelProvider] = useState("companyhelm");
  const [modelId, setModelId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reasoningSupported, setReasoningSupported] = useState(true);
  const [reasoningLevelsText, setReasoningLevelsText] = useState("low, medium, high");

  return (
    <Dialog onOpenChange={props.onOpenChange} open={props.open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New platform model</DialogTitle>
          <DialogDescription>
            Create an inactive catalog model. Add a route on the detail page before activation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="manual-provider">
              Provider
            </label>
            <Input
              id="manual-provider"
              onChange={(event) => {
                setModelProvider(event.target.value);
              }}
              value={modelProvider}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="manual-model-id">
              Model id
            </label>
            <Input
              id="manual-model-id"
              onChange={(event) => {
                setModelId(event.target.value);
              }}
              value={modelId}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="manual-name">
              Name
            </label>
            <Input
              id="manual-name"
              onChange={(event) => {
                setName(event.target.value);
              }}
              value={name}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-foreground" htmlFor="manual-reasoning">
              Reasoning levels
            </label>
            <Input
              disabled={!reasoningSupported}
              id="manual-reasoning"
              onChange={(event) => {
                setReasoningLevelsText(event.target.value);
              }}
              value={reasoningLevelsText}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <label className="text-sm font-medium text-foreground" htmlFor="manual-description">
              Description
            </label>
            <Input
              id="manual-description"
              onChange={(event) => {
                setDescription(event.target.value);
              }}
              value={description}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              checked={reasoningSupported}
              className="size-4 rounded border-border accent-primary"
              onChange={(event) => {
                setReasoningSupported(event.target.checked);
              }}
              type="checkbox"
            />
            Reasoning supported
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={props.inFlight || !modelProvider.trim() || !modelId.trim()}
            onClick={() => {
              void props.onCreate({
                description,
                modelId,
                modelProvider,
                name,
                reasoningLevels: reasoningLevelsText.split(",").map((level) => level.trim()).filter(Boolean),
                reasoningSupported,
              });
            }}
          >
            <PlusIcon />
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
