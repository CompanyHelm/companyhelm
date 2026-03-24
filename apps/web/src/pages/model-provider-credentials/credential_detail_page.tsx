import { Suspense } from "react";
import { useParams } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { credentialDetailPageQuery } from "./__generated__/credentialDetailPageQuery.graphql";

const modelProviderCredentialDetailPageQueryNode = graphql`
  query credentialDetailPageQuery($credentialId: ID!) {
    ModelProviderCredentialModels(modelProviderCredentialId: $credentialId) {
      id
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
  const { credentialId } = useParams({ strict: false });
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
    },
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <CardDescription>Models available for this credential.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
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
