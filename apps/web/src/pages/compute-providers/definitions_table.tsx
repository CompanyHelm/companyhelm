import { PencilIcon, Trash2Icon } from "lucide-react";
import { CompanyHelmComputeProvider } from "@/companyhelm_compute_provider";
import { ComputeProviderLimitsCatalog } from "@/compute_provider_limits_catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ComputeProviderDefinitionTableRecord = {
  description: string | null;
  daytonaApiUrl: string | null;
  hasApiKey: boolean;
  id: string;
  name: string;
  provider: "daytona" | "e2b";
  updatedAt: string;
};

interface ComputeProviderDefinitionsTableProps {
  definitions: ComputeProviderDefinitionTableRecord[];
  deletingDefinitionId: string | null;
  isLoading: boolean;
  onDelete: (definitionId: string) => Promise<void>;
  onEdit: (definition: ComputeProviderDefinitionTableRecord) => void;
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

/**
 * Shows company compute provider definitions in one table so operators can inspect provider type,
 * connection summary, published resource ranges, and last update time before assigning them to
 * agents.
 */
export function ComputeProviderDefinitionsTable(props: ComputeProviderDefinitionsTableProps) {
  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading compute providers…
      </div>
    );
  }

  if (props.definitions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No compute providers yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Add a Daytona or E2B definition before assigning an environment backend to an agent.
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
          <TableHead>Published Range</TableHead>
          <TableHead>Connection</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.definitions.map((definition) => (
          <TableRow key={definition.id}>
            <TableCell>
              <p className="font-medium text-foreground">{definition.name}</p>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{CompanyHelmComputeProvider.formatProviderLabel(definition)}</Badge>
            </TableCell>
            <TableCell className="min-w-56">
              <div className="grid gap-1 text-xs text-muted-foreground">
                <p>CPU: {ComputeProviderLimitsCatalog.formatCpuRange(definition.provider)}</p>
                <p>Memory: {ComputeProviderLimitsCatalog.formatMemoryRange(definition.provider)}</p>
                <p>Disk: {ComputeProviderLimitsCatalog.formatDiskRange(definition.provider)}</p>
              </div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {CompanyHelmComputeProvider.isManagedDefinition(definition)
                ? "Managed"
                : definition.provider === "daytona"
                ? (definition.daytonaApiUrl ?? "Missing API URL")
                : definition.hasApiKey
                  ? "API key configured"
                  : "Missing API key"}
            </TableCell>
            <TableCell className="max-w-72">
              <p className="truncate text-sm text-muted-foreground">
                {definition.description?.length ? definition.description : "—"}
              </p>
            </TableCell>
            <TableCell>{formatTimestamp(definition.updatedAt)}</TableCell>
            <TableCell>
              {CompanyHelmComputeProvider.isManagedDefinition(definition) ? (
                <div className="flex items-center justify-end">
                  <span className="text-xs text-muted-foreground">Managed</span>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    onClick={() => {
                      props.onEdit(definition);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <PencilIcon className="size-4" />
                  </Button>
                  <Button
                    disabled={props.deletingDefinitionId === definition.id}
                    onClick={async () => {
                      await props.onDelete(definition.id);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2Icon className="size-4" />
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
