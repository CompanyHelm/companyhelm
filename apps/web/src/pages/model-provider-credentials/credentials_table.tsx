import { useNavigate } from "@tanstack/react-router";
import { StarIcon, Trash2Icon } from "lucide-react";
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
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { formatProviderCredentialType, formatProviderLabel } from "./provider_label";

export type CredentialsTableRecord = {
  createdAt: string;
  defaultModelId: string | null;
  id: string;
  isDefault: boolean;
  modelProvider: string;
  name: string;
  updatedAt: string;
};

interface CredentialsTableProps {
  credentials: CredentialsTableRecord[];
  defaultingCredentialId: string | null;
  isLoading: boolean;
  onDelete: (credentialId: string) => Promise<void>;
  onSetDefault: (credentialId: string) => Promise<void>;
  deletingCredentialId: string | null;
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

export function CredentialsTable(props: CredentialsTableProps) {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

  if (props.isLoading) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        Loading credentials…
      </div>
    );
  }

  if (!props.credentials.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
        <p className="text-sm font-medium text-foreground">No credentials yet</p>
        <p className="mt-2 text-xs/relaxed text-muted-foreground">
          Create your first provider credential to let agents call external models.
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
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-28 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.credentials.map((credential) => (
          <TableRow
            key={credential.id}
            className="cursor-pointer transition hover:bg-muted/40"
            onClick={() => {
              void navigate({
                to: OrganizationPath.route("/model-provider-credentials/$credentialId"),
                params: {
                  credentialId: credential.id,
                  organizationSlug,
                },
              });
            }}
          >
            <TableCell>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{credential.name}</span>
                {credential.isDefault ? (
                  <Badge variant="secondary">Default</Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{formatProviderLabel(credential.modelProvider)}</Badge>
            </TableCell>
            <TableCell>{formatProviderCredentialType(credential.modelProvider)}</TableCell>
            <TableCell>{formatTimestamp(credential.createdAt)}</TableCell>
            <TableCell>{formatTimestamp(credential.updatedAt)}</TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={credential.isDefault || props.defaultingCredentialId === credential.id}
                  onClick={async (event) => {
                    event.stopPropagation();
                    await props.onSetDefault(credential.id);
                  }}
                >
                  <StarIcon className={`h-4 w-4 ${credential.isDefault ? "fill-current" : ""}`} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={props.deletingCredentialId === credential.id}
                      onClick={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete credential</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the credential and its stored models. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancelAction asChild>
                        <AlertDialogCancelButton variant="outline">Cancel</AlertDialogCancelButton>
                      </AlertDialogCancelAction>
                      <AlertDialogPrimaryAction asChild>
                        <AlertDialogActionButton
                          variant="destructive"
                          disabled={props.deletingCredentialId === credential.id}
                          onClick={async (event) => {
                            event.stopPropagation();
                            await props.onDelete(credential.id);
                          }}
                        >
                          Delete
                        </AlertDialogActionButton>
                      </AlertDialogPrimaryAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
