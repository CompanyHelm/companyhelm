import { useNavigate } from "@tanstack/react-router";
import { ArrowRightIcon, BoxesIcon, RouteIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { ModelProviderIcon } from "@/components/model_provider_icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatProviderLabel } from "@/pages/model-provider-credentials/provider_label";
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
  }
`;

type PlatformModel = modelsPageQuery["response"]["PlatformModels"][number];

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
  const data = useLazyLoadQuery<modelsPageQuery>(
    modelsPageQueryNode,
    {},
    {
      fetchPolicy: "store-and-network",
    },
  );

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
        </CardHeader>
        <CardContent>
          <PlatformModelsTable
            models={data.PlatformModels}
            onOpenModel={(modelId) => {
              void navigate({
                to: `/admin/models/${modelId}`,
              });
            }}
          />
        </CardContent>
      </Card>
    </main>
  );
}

function PlatformModelsTable(props: {
  models: readonly PlatformModel[];
  onOpenModel(modelId: string): void;
}) {
  if (props.models.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No platform models stored</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Refresh a platform credential model catalog to publish stable platform models.
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
