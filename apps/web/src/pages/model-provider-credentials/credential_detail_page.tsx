import { Suspense, useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { RefreshCcwIcon, StarIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { credentialDetailPageQuery } from "./__generated__/credentialDetailPageQuery.graphql";
import type { credentialDetailPageRefreshCredentialTokenMutation } from "./__generated__/credentialDetailPageRefreshCredentialTokenMutation.graphql";
import type { credentialDetailPageRefreshModelsMutation } from "./__generated__/credentialDetailPageRefreshModelsMutation.graphql";
import type { credentialDetailPageSetDefaultModelMutation } from "./__generated__/credentialDetailPageSetDefaultModelMutation.graphql";
import {
  getCredentialRefreshFailureReason,
  getCredentialRefreshFailureRecoveryMessage,
  hasCredentialRefreshFailure,
} from "./credential_health";
import { formatProviderCredentialType, formatProviderLabel } from "./provider_label";

const modelProviderCredentialDetailPageQueryNode = graphql`
  query credentialDetailPageQuery($credentialId: ID!) {
    ModelProviderCredentials {
      id
      name
      modelProvider
      type
      status
      errorMessage
      refreshedAt
      updatedAt
    }
    ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {
      id
      isDefault
      name
      description
      reasoningSupported
      reasoningLevels
    }
  }
`;

const modelProviderCredentialDetailPageSetDefaultModelMutationNode = graphql`
  mutation credentialDetailPageSetDefaultModelMutation(
    $input: SetDefaultModelProviderCredentialModelInput!
  ) {
    SetDefaultModelProviderCredentialModel(input: $input) {
      id
      isDefault
    }
  }
`;

const modelProviderCredentialDetailPageRefreshCredentialTokenMutationNode = graphql`
  mutation credentialDetailPageRefreshCredentialTokenMutation(
    $input: RefreshModelProviderCredentialTokenInput!
  ) {
    RefreshModelProviderCredentialToken(input: $input) {
      id
      status
      errorMessage
      refreshToken
      refreshedAt
      updatedAt
    }
  }
`;

const modelProviderCredentialDetailPageRefreshModelsMutationNode = graphql`
  mutation credentialDetailPageRefreshModelsMutation(
    $input: RefreshModelProviderCredentialModelsInput!
  ) {
    RefreshModelProviderCredentialModels(input: $input) {
      id
      modelProviderCredentialId
      modelId
      name
      description
      reasoningSupported
      reasoningLevels
    }
  }
`;

function ModelProviderCredentialDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Models available for this credential.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            Loading models…
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function formatTimestamp(value: string | null | undefined): string {
  const timestamp = new Date(String(value || ""));
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function formatReasoning(model: {
  reasoningSupported: boolean;
  reasoningLevels: ReadonlyArray<string>;
}): string {
  if (model.reasoningLevels.length > 0) {
    return model.reasoningLevels.join(", ");
  }

  if (!model.reasoningSupported) {
    return "—";
  }

  return "Supported";
}

function ModelProviderCredentialDetailPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const { credentialId } = useParams({ strict: false }) as { credentialId?: string };
  const { setDetailLabel } = useApplicationBreadcrumb();
  const normalizedCredentialId = String(credentialId || "").trim();
  if (!normalizedCredentialId) {
    throw new Error("Credential ID is required.");
  }
  const data = useLazyLoadQuery<credentialDetailPageQuery>(
    modelProviderCredentialDetailPageQueryNode,
    {
      credentialId: normalizedCredentialId,
    },
    {
      fetchPolicy: "store-and-network",
      fetchKey,
    },
  );
  const [commitRefreshModels, isRefreshInFlight] =
    useMutation<credentialDetailPageRefreshModelsMutation>(
      modelProviderCredentialDetailPageRefreshModelsMutationNode,
    );
  const [commitRefreshCredentialToken, isRefreshTokenInFlight] =
    useMutation<credentialDetailPageRefreshCredentialTokenMutation>(
      modelProviderCredentialDetailPageRefreshCredentialTokenMutationNode,
    );
  const [commitSetDefaultModel, isSetDefaultModelInFlight] =
    useMutation<credentialDetailPageSetDefaultModelMutation>(
      modelProviderCredentialDetailPageSetDefaultModelMutationNode,
    );
  const currentCredential = data.ModelProviderCredentials.find((credential) => credential.id === normalizedCredentialId);
  const providerLabel = formatProviderLabel(String(currentCredential?.modelProvider || "").trim())
    || "Credential";
  const isOauthCredential = currentCredential?.type === "oauth_token";
  const showRefreshFailure = currentCredential ? hasCredentialRefreshFailure(currentCredential) : false;
  const credentialStatus = isOauthCredential
    ? (currentCredential?.refreshedAt
      ? `Token refreshed ${formatTimestamp(currentCredential.refreshedAt)}`
      : "Token has not been refreshed yet.")
    : `Credential updated ${formatTimestamp(currentCredential?.updatedAt)}`;

  useEffect(() => {
    setDetailLabel(providerLabel);

    return () => {
      setDetailLabel(null);
    };
  }, [providerLabel, setDetailLabel]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{providerLabel}</Badge>
            <Badge variant="secondary">
              {formatProviderCredentialType(String(currentCredential?.type || "api_key"))}
            </Badge>
            <span className="text-xs text-muted-foreground">{credentialStatus}</span>
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-2">
              {isOauthCredential ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRefreshTokenInFlight}
                  onClick={async () => {
                    if (isRefreshTokenInFlight) {
                      return;
                    }

                    setErrorMessage(null);
                    await new Promise<void>((resolve, reject) => {
                      commitRefreshCredentialToken({
                        variables: {
                          input: {
                            modelProviderCredentialId: normalizedCredentialId,
                          },
                        },
                        onCompleted: (_response, errors) => {
                          const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                          if (nextErrorMessage) {
                            reject(new Error(nextErrorMessage));
                            return;
                          }

                          setFetchKey((current) => current + 1);
                          resolve();
                        },
                        onError: reject,
                      });
                    }).catch((error: unknown) => {
                      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh credential token.");
                    });
                  }}
                >
                  <RefreshCcwIcon className={isRefreshTokenInFlight ? "animate-spin" : ""} />
                  Refresh token
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                disabled={isRefreshInFlight}
                onClick={async () => {
                  if (isRefreshInFlight) {
                    return;
                  }

                  setErrorMessage(null);
                  await new Promise<void>((resolve, reject) => {
                    commitRefreshModels({
                      variables: {
                        input: {
                          modelProviderCredentialId: normalizedCredentialId,
                        },
                      },
                      onCompleted: (_response, errors) => {
                        const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                        if (nextErrorMessage) {
                          reject(new Error(nextErrorMessage));
                          return;
                        }

                        setFetchKey((current) => current + 1);
                        resolve();
                      },
                      onError: reject,
                    });
                  }).catch((error: unknown) => {
                    setErrorMessage(error instanceof Error ? error.message : "Failed to refresh models.");
                  });
                }}
              >
                <RefreshCcwIcon className={isRefreshInFlight ? "animate-spin" : ""} />
                Refresh models
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-4">
          {showRefreshFailure ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-3 text-xs text-destructive">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">Reconnect required</Badge>
                <span className="font-medium">
                  Automatic refresh failed for {currentCredential?.name || providerLabel}.
                </span>
              </div>
              <p className="mt-2">{getCredentialRefreshFailureRecoveryMessage()}</p>
              <p className="mt-2 text-destructive/90">
                Last error: {getCredentialRefreshFailureReason(currentCredential?.errorMessage)}
              </p>
            </div>
          ) : null}
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {data.ModelProviderCredentialModels.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No models returned</p>
              <p className="mt-2 text-xs/relaxed text-muted-foreground">
                This credential did not return any models from the provider.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reasoning</TableHead>
                  <TableHead className="w-24 text-right">Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ModelProviderCredentialModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{model.name}</span>
                        {model.isDefault ? (
                          <Badge variant="secondary">Default</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{model.description}</TableCell>
                    <TableCell>{formatReasoning(model)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        disabled={model.isDefault || isSetDefaultModelInFlight}
                        onClick={async () => {
                          if (model.isDefault || isSetDefaultModelInFlight) {
                            return;
                          }

                          setErrorMessage(null);
                          await new Promise<void>((resolve, reject) => {
                            commitSetDefaultModel({
                              variables: {
                                input: {
                                  id: model.id,
                                },
                              },
                              updater: (store) => {
                                const updatedModel = store.getRootField("SetDefaultModelProviderCredentialModel");
                                if (!updatedModel) {
                                  return;
                                }

                                const updatedId = updatedModel.getDataID();
                                const rootRecord = store.getRoot();
                                const currentModels = (rootRecord.getLinkedRecords("ModelProviderCredentialModels") || [])
                                  .filter((record): record is { getDataID(): string; setValue(value: unknown, fieldName: string): void } => {
                                    return typeof record === "object"
                                      && record !== null
                                      && "getDataID" in record
                                      && typeof record.getDataID === "function"
                                      && "setValue" in record
                                      && typeof record.setValue === "function";
                                  });
                                currentModels.forEach((record) => {
                                  record.setValue(record.getDataID() === updatedId, "isDefault");
                                });
                              },
                              onCompleted: (_response, errors) => {
                                const nextErrorMessage = String(errors?.[0]?.message || "").trim();
                                if (nextErrorMessage) {
                                  reject(new Error(nextErrorMessage));
                                  return;
                                }

                                setFetchKey((current) => current + 1);
                                resolve();
                              },
                              onError: reject,
                            });
                          }).catch((error: unknown) => {
                            setErrorMessage(error instanceof Error ? error.message : "Failed to update default model.");
                          });
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <StarIcon className={`size-4 ${model.isDefault ? "fill-current" : ""}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export function ModelProviderCredentialDetailPage() {
  return (
    <Suspense fallback={<ModelProviderCredentialDetailPageFallback />}>
      <ModelProviderCredentialDetailPageContent />
    </Suspense>
  );
}
