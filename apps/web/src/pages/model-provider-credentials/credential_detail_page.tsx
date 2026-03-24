import { Suspense, useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { RefreshCcwIcon } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { credentialDetailPageQuery } from "./__generated__/credentialDetailPageQuery.graphql";
import type { credentialDetailPageRefreshModelsMutation } from "./__generated__/credentialDetailPageRefreshModelsMutation.graphql";
import { formatProviderLabel } from "./provider_label";

const modelProviderCredentialDetailPageQueryNode = graphql`
  query credentialDetailPageQuery($credentialId: ID!) {
    ModelProviderCredentials {
      id
      modelProvider
    }
    ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {
      id
      name
      reasoningLevels
      createdAt
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
      name
      reasoningLevels
      createdAt
      updatedAt
    }
  }
`;

function ModelProviderCredentialDetailPageFallback() {
  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
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

function formatReasoningLevels(levels: string[]): string {
  if (!levels.length) {
    return "—";
  }

  return levels.join(", ");
}

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

function ModelProviderCredentialDetailPageContent() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const { credentialId } = useParams({ strict: false });
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
  const currentCredential = data.ModelProviderCredentials.find((credential) => credential.id === normalizedCredentialId);
  const providerLabel = formatProviderLabel(String(currentCredential?.modelProvider || "").trim())
    || "Credential";

  useEffect(() => {
    setDetailLabel(providerLabel);

    return () => {
      setDetailLabel(null);
    };
  }, [providerLabel, setDetailLabel]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Models available for this credential.</CardDescription>
          <CardAction>
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
                      const errorMessage = String(errors?.[0]?.message || "").trim();
                      if (errorMessage) {
                        reject(new Error(errorMessage));
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
              <RefreshCcwIcon />
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
                  <TableHead>Reasoning levels</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.ModelProviderCredentialModels.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium text-foreground">{model.name}</TableCell>
                    <TableCell>{formatReasoningLevels(model.reasoningLevels)}</TableCell>
                    <TableCell>{formatTimestamp(model.createdAt)}</TableCell>
                    <TableCell>{formatTimestamp(model.updatedAt)}</TableCell>
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
