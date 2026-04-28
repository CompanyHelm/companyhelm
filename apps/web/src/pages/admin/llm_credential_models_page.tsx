import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon, RefreshCcwIcon, StarIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
import type { llmCredentialModelsPageQuery } from "./__generated__/llmCredentialModelsPageQuery.graphql";
import type { llmCredentialModelsPageRefreshMutation } from "./__generated__/llmCredentialModelsPageRefreshMutation.graphql";
import type { llmCredentialModelsPageSetDefaultMutation } from "./__generated__/llmCredentialModelsPageSetDefaultMutation.graphql";

const llmCredentialModelsPageQueryNode = graphql`
  query llmCredentialModelsPageQuery($credentialId: ID!) {
    PlatformModelProviderCredentials {
      id
      baseUrl
      name
      modelProvider
      defaultModelId
    }
    PlatformModelProviderCredentialModels(platformModelProviderCredentialId: $credentialId) {
      id
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

const llmCredentialModelsPageRefreshMutationNode = graphql`
  mutation llmCredentialModelsPageRefreshMutation($input: RefreshPlatformModelProviderCredentialModelsInput!) {
    RefreshPlatformModelProviderCredentialModels(input: $input) {
      id
      isDefault
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
      updatedAt
    }
  }
`;

const llmCredentialModelsPageSetDefaultMutationNode = graphql`
  mutation llmCredentialModelsPageSetDefaultMutation($input: SetDefaultPlatformModelProviderCredentialModelInput!) {
    SetDefaultPlatformModelProviderCredentialModel(input: $input) {
      id
      isDefault
    }
  }
`;

type PlatformModel = llmCredentialModelsPageQuery["response"]["PlatformModelProviderCredentialModels"][number];

/**
 * Shows the model catalog discovered for one platform credential and lets platform admins refresh
 * provider models or select the credential-local default model.
 */
export function AdminLlmCredentialModelsPage() {
  return (
    <PlatformAdminGuard>
      <AdminLlmCredentialModelsPageContent />
    </PlatformAdminGuard>
  );
}

function AdminLlmCredentialModelsPageContent() {
  const params = useParams({ strict: false }) as { platformCredentialId?: string };
  const credentialId = params.platformCredentialId ?? "";
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const data = useLazyLoadQuery<llmCredentialModelsPageQuery>(
    llmCredentialModelsPageQueryNode,
    {
      credentialId,
    },
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const [commitRefreshModels, isRefreshModelsInFlight] =
    useMutation<llmCredentialModelsPageRefreshMutation>(llmCredentialModelsPageRefreshMutationNode);
  const [commitSetDefault, isSetDefaultInFlight] =
    useMutation<llmCredentialModelsPageSetDefaultMutation>(llmCredentialModelsPageSetDefaultMutationNode);
  const credential = data.PlatformModelProviderCredentials.find((item) => item.id === credentialId) ?? null;
  const refreshPage = () => {
    setFetchKey((current) => current + 1);
  };

  const runMutation = async (operation: (resolve: () => void, reject: (error: Error) => void) => void) => {
    await new Promise<void>((resolve, reject) => {
      operation(resolve, reject);
    });
    refreshPage();
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <Button asChild className="mb-4" size="sm" variant="ghost">
              <Link to="/admin/llm-credentials">
                <ArrowLeftIcon />
                Back
              </Link>
            </Button>
            <CardTitle>{credential?.name ?? "Platform credential models"}</CardTitle>
            <CardDescription>
              {credential
                ? `${formatProviderLabel(credential.modelProvider, {
                  baseUrl: credential.baseUrl ?? null,
                })} model catalog`
                : "Model catalog for this platform credential."}
            </CardDescription>
          </div>
          <CardAction>
            <Button
              disabled={isRefreshModelsInFlight}
              onClick={async () => {
                setErrorMessage(null);
                await runMutation((resolve, reject) => {
                  commitRefreshModels({
                    variables: {
                      input: {
                        platformModelProviderCredentialId: credentialId,
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
                }).catch((error: unknown) => {
                  setErrorMessage(error instanceof Error ? error.message : "Failed to refresh models.");
                });
              }}
              size="sm"
            >
              <RefreshCcwIcon className={isRefreshModelsInFlight ? "animate-spin" : ""} />
              Refresh models
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
            isSetDefaultInFlight={isSetDefaultInFlight}
            models={data.PlatformModelProviderCredentialModels}
            onSetDefault={async (modelId) => {
              setErrorMessage(null);
              await runMutation((resolve, reject) => {
                commitSetDefault({
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
              }).catch((error: unknown) => {
                setErrorMessage(error instanceof Error ? error.message : "Failed to update default model.");
              });
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function PlatformModelsTable(props: {
  isSetDefaultInFlight: boolean;
  models: readonly PlatformModel[];
  onSetDefault(modelId: string): Promise<void>;
}) {
  if (props.models.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No models stored</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Refresh the provider catalog to store available models for this credential.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Reasoning</TableHead>
          <TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.models.map((model) => (
          <TableRow key={model.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{model.name}</span>
                {model.isDefault ? <Badge variant="secondary">Default</Badge> : null}
              </div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{model.modelId}</div>
            </TableCell>
            <TableCell className="max-w-xl text-sm text-muted-foreground">{model.description}</TableCell>
            <TableCell>
              {model.reasoningSupported ? (
                <Badge variant="outline">{model.reasoningLevels.join(", ") || "Supported"}</Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                aria-label="Set default model"
                disabled={model.isDefault || props.isSetDefaultInFlight}
                onClick={async () => {
                  await props.onSetDefault(model.id);
                }}
                size="icon"
                variant="ghost"
              >
                <StarIcon className={model.isDefault ? "fill-current" : ""} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
