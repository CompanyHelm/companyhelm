import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { KeyRoundIcon, PlusIcon, RefreshCcwIcon, Trash2Icon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateCredentialDialog } from "@/pages/model-provider-credentials/create_credential_dialog";
import { hasCredentialRefreshFailure } from "@/pages/model-provider-credentials/credential_health";
import { ModelProviderCredentialCatalog } from "@/pages/model-provider-credentials/provider_catalog";
import { formatProviderCredentialType, formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
import type { llmCredentialsPageAddMutation } from "./__generated__/llmCredentialsPageAddMutation.graphql";
import type { llmCredentialsPageDeleteMutation } from "./__generated__/llmCredentialsPageDeleteMutation.graphql";
import type { llmCredentialsPageQuery } from "./__generated__/llmCredentialsPageQuery.graphql";
import type { llmCredentialsPageRefreshTokenMutation } from "./__generated__/llmCredentialsPageRefreshTokenMutation.graphql";

const llmCredentialsPageQueryNode = graphql`
  query llmCredentialsPageQuery {
    ModelProviders {
      id
      name
      type
      authorizationInstructionsMarkdown
    }
    PlatformModelProviderCredentials {
      id
      baseUrl
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

const llmCredentialsPageAddMutationNode = graphql`
  mutation llmCredentialsPageAddMutation($input: AddPlatformModelProviderCredentialInput!) {
    AddPlatformModelProviderCredential(input: $input) {
      id
    }
  }
`;

const llmCredentialsPageDeleteMutationNode = graphql`
  mutation llmCredentialsPageDeleteMutation($input: DeletePlatformModelProviderCredentialInput!) {
    DeletePlatformModelProviderCredential(input: $input) {
      id
    }
  }
`;

const llmCredentialsPageRefreshTokenMutationNode = graphql`
  mutation llmCredentialsPageRefreshTokenMutation($input: RefreshPlatformModelProviderCredentialTokenInput!) {
    RefreshPlatformModelProviderCredentialToken(input: $input) {
      id
      status
      errorMessage
      refreshedAt
      updatedAt
    }
  }
`;

type PlatformCredential = llmCredentialsPageQuery["response"]["PlatformModelProviderCredentials"][number];

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
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

/**
 * Provides the platform-admin control plane for operator-owned LLM credentials without exposing
 * these records through company credential management or agent runtime selection.
 */
export function AdminLlmCredentialsPage() {
  return (
    <PlatformAdminGuard>
      <AdminLlmCredentialsPageContent />
    </PlatformAdminGuard>
  );
}

function AdminLlmCredentialsPageContent() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);
  const [refreshingCredentialId, setRefreshingCredentialId] = useState<string | null>(null);
  const [deletingCredentialId, setDeletingCredentialId] = useState<string | null>(null);
  const data = useLazyLoadQuery<llmCredentialsPageQuery>(
    llmCredentialsPageQueryNode,
    {},
    {
      fetchKey,
      fetchPolicy: "store-and-network",
    },
  );
  const [commitAddCredential, isAddCredentialInFlight] =
    useMutation<llmCredentialsPageAddMutation>(llmCredentialsPageAddMutationNode);
  const [commitDeleteCredential, isDeleteCredentialInFlight] =
    useMutation<llmCredentialsPageDeleteMutation>(llmCredentialsPageDeleteMutationNode);
  const [commitRefreshToken, isRefreshTokenInFlight] =
    useMutation<llmCredentialsPageRefreshTokenMutation>(llmCredentialsPageRefreshTokenMutationNode);
  const providers = useMemo(() => {
    return ModelProviderCredentialCatalog.toDialogProviders(
      data.ModelProviders.filter((provider) => provider.id !== "companyhelm").map((provider) => ({
        authorizationInstructionsMarkdown: provider.authorizationInstructionsMarkdown ?? null,
        id: provider.id,
        name: formatProviderLabel(provider.id),
        type: provider.type as "api_key" | "oauth",
      })),
    );
  }, [data.ModelProviders]);

  const refreshPage = () => {
    setFetchKey((current) => current + 1);
  };

  const runMutation = async (operation: (resolve: () => void, reject: (error: Error) => void) => void) => {
    await new Promise<void>((resolve, reject) => {
      operation(resolve, reject);
    });
    refreshPage();
  };

  const credentials = data.PlatformModelProviderCredentials;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <KeyRoundIcon className="size-5 text-muted-foreground" />
              Platform LLM credentials
            </CardTitle>
            <CardDescription>
              Manage operator-owned model provider credentials for self-hosted installations.
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

          <PlatformCredentialTable
            credentials={credentials}
            deletingCredentialId={deletingCredentialId}
            refreshingCredentialId={refreshingCredentialId}
            onDelete={async (credentialId) => {
              if (isDeleteCredentialInFlight) {
                return;
              }
              setErrorMessage(null);
              setDeletingCredentialId(credentialId);
              await runMutation((resolve, reject) => {
                commitDeleteCredential({
                  variables: {
                    input: {
                      id: credentialId,
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
                setErrorMessage(error instanceof Error ? error.message : "Failed to delete credential.");
              }).finally(() => {
                setDeletingCredentialId(null);
              });
            }}
            onOpenModels={(credentialId) => {
              void navigate({
                to: `/admin/llm-credentials/${credentialId}`,
              });
            }}
            onRefreshToken={async (credentialId) => {
              if (isRefreshTokenInFlight) {
                return;
              }
              setErrorMessage(null);
              setRefreshingCredentialId(credentialId);
              await runMutation((resolve, reject) => {
                commitRefreshToken({
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
                setErrorMessage(error instanceof Error ? error.message : "Failed to refresh credential token.");
              }).finally(() => {
                setRefreshingCredentialId(null);
              });
            }}
          />
        </CardContent>
      </Card>

      <CreateCredentialDialog
        description="Add an operator-owned provider credential. These credentials are visible only to platform admins."
        errorMessage={isCreateDialogOpen ? errorMessage : null}
        isOpen={isCreateDialogOpen}
        isSaving={isAddCredentialInFlight}
        providers={providers}
        supportsDefaultSelection={false}
        suggestDefault={credentials.length === 0}
        onCreate={async (input) => {
          setErrorMessage(null);
          await runMutation((resolve, reject) => {
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
          }).catch((error: unknown) => {
            setErrorMessage(error instanceof Error ? error.message : "Failed to create credential.");
          });
        }}
        onOpenChange={setCreateDialogOpen}
      />
    </main>
  );
}

function PlatformCredentialTable(props: {
  credentials: readonly PlatformCredential[];
  deletingCredentialId: string | null;
  refreshingCredentialId: string | null;
  onDelete(credentialId: string): Promise<void>;
  onOpenModels(credentialId: string): void;
  onRefreshToken(credentialId: string): Promise<void>;
}) {
  if (props.credentials.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No platform credentials yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create the first operator-owned provider credential to manage platform model access.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Default model</TableHead>
          <TableHead>Token refreshed</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-44 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.credentials.map((credential) => {
          const providerLabel = formatProviderLabel(credential.modelProvider, {
            baseUrl: credential.baseUrl ?? null,
          });
          const showRefreshFailure = hasCredentialRefreshFailure({
            errorMessage: credential.errorMessage ?? null,
            status: credential.status,
            type: credential.type,
          });

          return (
            <TableRow
              className="cursor-pointer transition hover:bg-muted/40"
              key={credential.id}
              onClick={() => {
                props.onOpenModels(credential.id);
              }}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{credential.name}</span>
                  {showRefreshFailure ? <Badge variant="destructive">Reconnect required</Badge> : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge className="gap-1.5" variant="outline">
                  <ModelProviderIcon
                    className="-ml-1 size-4 rounded-sm bg-transparent"
                    imageClassName="size-3"
                    label={providerLabel}
                    providerId={credential.modelProvider}
                  />
                  <span>{providerLabel}</span>
                </Badge>
              </TableCell>
              <TableCell>{formatProviderCredentialType(credential.type)}</TableCell>
              <TableCell>{credential.defaultModelId ?? "—"}</TableCell>
              <TableCell>
                {credential.type === "oauth_token"
                  ? (credential.refreshedAt ? formatTimestamp(credential.refreshedAt) : "Never")
                  : "—"}
              </TableCell>
              <TableCell>{formatTimestamp(credential.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {credential.type === "oauth_token" ? (
                    <Button
                      aria-label="Refresh OAuth token"
                      disabled={props.refreshingCredentialId === credential.id}
                      onClick={async (event) => {
                        event.stopPropagation();
                        await props.onRefreshToken(credential.id);
                      }}
                      size="icon"
                      variant="ghost"
                    >
                      <RefreshCcwIcon
                        className={props.refreshingCredentialId === credential.id ? "animate-spin" : ""}
                      />
                    </Button>
                  ) : null}
                  <Button
                    aria-label="Delete credential"
                    disabled={props.deletingCredentialId === credential.id}
                    onClick={async (event) => {
                      event.stopPropagation();
                      await props.onDelete(credential.id);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
