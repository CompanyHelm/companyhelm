import { Trash2Icon } from "lucide-react";
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

export type SecretsTableRecord = {
  createdAt: string;
  description: string | null;
  envVarName: string;
  id: string;
  name: string;
  updatedAt: string;
};

interface SecretsTableProps {
  deletingSecretId: string | null;
  isLoading: boolean;
  onDelete(secretId: string): Promise<void>;
  secrets: SecretsTableRecord[];
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
 * Shows company-level encrypted secrets without ever displaying plaintext values in the browser.
 */
export function SecretsTable(props: SecretsTableProps) {
  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading secrets…
      </div>
    );
  }

  if (!props.secrets.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No secrets yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create a company secret to make sensitive tokens available to session command execution.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Environment Variable</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-16 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.secrets.map((secret) => (
          <TableRow key={secret.id}>
            <TableCell className="font-medium text-foreground">{secret.name}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{secret.envVarName}</TableCell>
            <TableCell className="max-w-sm text-sm text-muted-foreground">
              {secret.description?.trim() || "—"}
            </TableCell>
            <TableCell>{formatTimestamp(secret.createdAt)}</TableCell>
            <TableCell>{formatTimestamp(secret.updatedAt)}</TableCell>
            <TableCell className="text-right">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    disabled={props.deletingSecretId === secret.id}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete secret</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the secret and remove any session attachments that reference it.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancelAction asChild>
                      <AlertDialogCancelButton variant="outline">Cancel</AlertDialogCancelButton>
                    </AlertDialogCancelAction>
                    <AlertDialogPrimaryAction asChild>
                      <AlertDialogActionButton
                        disabled={props.deletingSecretId === secret.id}
                        onClick={async () => {
                          await props.onDelete(secret.id);
                        }}
                        variant="destructive"
                      >
                        Delete
                      </AlertDialogActionButton>
                    </AlertDialogPrimaryAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
