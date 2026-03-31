import { useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogActionButton,
  AlertDialogCancelButton,
  AlertDialogCancelAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPrimaryAction,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

interface DeleteDefinitionDialogProps {
  definition: ComputeProviderDefinitionTableRecord;
  deletingDefinitionId: string | null;
  onDelete: (definitionId: string) => Promise<void>;
}

function formatProviderLabel(provider: string): string {
  return provider === "e2b" ? "E2B" : "Daytona";
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
 * Wraps compute-provider-definition deletion so the table stays focused on scan-friendly metadata
 * instead of inlining destructive confirmation UI into every row.
 */
function DeleteDefinitionDialog(props: DeleteDefinitionDialogProps) {
  const [isOpen, setOpen] = useState(false);

  return (
    <AlertDialog open={isOpen} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          disabled={props.deletingDefinitionId === props.definition.id}
          size="icon"
          variant="ghost"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete compute provider</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the company-level compute provider definition. Definitions that are still
            referenced by agents or environments cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancelAction asChild>
            <AlertDialogCancelButton variant="outline">
              Cancel
            </AlertDialogCancelButton>
          </AlertDialogCancelAction>
          <AlertDialogPrimaryAction asChild>
            <AlertDialogActionButton
              disabled={props.deletingDefinitionId === props.definition.id}
              onClick={async () => {
                await props.onDelete(props.definition.id);
                setOpen(false);
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogActionButton>
          </AlertDialogPrimaryAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Shows company compute provider definitions in one table so operators can inspect provider type,
 * connection summary, and last update time before assigning them to agents.
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
              <Badge variant="outline">{formatProviderLabel(definition.provider)}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {definition.provider === "daytona"
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
                <DeleteDefinitionDialog
                  definition={definition}
                  deletingDefinitionId={props.deletingDefinitionId}
                  onDelete={props.onDelete}
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
