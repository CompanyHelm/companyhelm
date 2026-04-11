import { useNavigate } from "@tanstack/react-router";
import { RefreshCcwIcon, StarIcon } from "lucide-react";
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
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  DeleteCredentialDialog,
  type DeleteCredentialDialogAgentRecord,
  type DeleteCredentialDialogReplacementRecord,
} from "./delete_credential_dialog";
import {
  getCredentialRefreshFailureReason,
  getCredentialRefreshFailureRecoveryMessage,
  hasCredentialRefreshFailure,
} from "./credential_health";
import { formatProviderCredentialType, formatProviderLabel } from "./provider_label";

export type CredentialsTableRecord = {
  createdAt: string;
  defaultModelId: string | null;
  errorMessage: string | null;
  id: string;
  isDefault: boolean;
  modelProvider: string;
  name: string;
  refreshedAt: string | null;
  sessionCount: number;
  status: "active" | "error";
  type: "api_key" | "oauth_token";
  updatedAt: string;
  usingAgents: DeleteCredentialDialogAgentRecord[];
};

interface CredentialsTableProps {
  credentials: CredentialsTableRecord[];
  defaultingCredentialId: string | null;
  deletingCredentialId: string | null;
  isLoading: boolean;
  onDelete: (input: {
    credentialId: string;
    replacementCredentialId?: string | null;
  }) => Promise<void>;
  onRefreshToken: (credentialId: string) => Promise<void>;
  onSetDefault: (credentialId: string) => Promise<void>;
  refreshingCredentialId: string | null;
  replacementOptions: DeleteCredentialDialogReplacementRecord[];
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
          <TableHead>Token refreshed</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="w-36 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.credentials.map((credential) => {
          const showRefreshFailure = hasCredentialRefreshFailure(credential);

          return (
            <TableRow
              key={credential.id}
              className="cursor-pointer transition hover:bg-muted/40"
              onClick={(event) => {
                if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) {
                  return;
                }

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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{credential.name}</span>
                    {credential.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    {showRefreshFailure ? (
                      <Badge variant="destructive">Reconnect required</Badge>
                    ) : null}
                  </div>
                  {showRefreshFailure ? (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                      <p>{getCredentialRefreshFailureRecoveryMessage()}</p>
                      <p className="mt-1 text-destructive/90">
                        Last error: {getCredentialRefreshFailureReason(credential.errorMessage)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{formatProviderLabel(credential.modelProvider)}</Badge>
              </TableCell>
              <TableCell>{formatProviderCredentialType(credential.type)}</TableCell>
              <TableCell>
                {credential.type === "oauth_token"
                  ? (credential.refreshedAt ? formatTimestamp(credential.refreshedAt) : "Never")
                  : "—"}
              </TableCell>
              <TableCell>{formatTimestamp(credential.createdAt)}</TableCell>
              <TableCell>{formatTimestamp(credential.updatedAt)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {credential.type === "oauth_token" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={props.refreshingCredentialId === credential.id}
                      onClick={async (event) => {
                        event.stopPropagation();
                        await props.onRefreshToken(credential.id);
                      }}
                    >
                      <RefreshCcwIcon
                        className={`h-4 w-4 ${props.refreshingCredentialId === credential.id ? "animate-spin" : ""}`}
                      />
                    </Button>
                  ) : null}
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
                  <DeleteCredentialDialog
                    credential={credential}
                    deletingCredentialId={props.deletingCredentialId}
                    onDelete={props.onDelete}
                    replacementOptions={props.replacementOptions}
                  />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
