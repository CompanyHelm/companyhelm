import { Link, useNavigate } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatProviderLabel } from "../model-provider-credentials/provider_label";

export type DashboardCredentialRecord = {
  id: string;
  modelProvider: string;
  name: string;
  type: string;
  updatedAt: string;
};

function formatTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

/**
 * Shows the available model credentials on the dashboard so operators can confirm which providers
 * are currently configured before drilling into the credential management screens.
 */
export function CredentialsSection(props: {
  credentials: DashboardCredentialRecord[];
  totalCount: number;
}) {
  const navigate = useNavigate();
  const organizationSlug = useCurrentOrganizationSlug();

  return (
    <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
      <CardHeader>
        <CardAction>
          <Link
            className="text-xs font-medium text-primary hover:underline"
            params={{ organizationSlug }}
            to={OrganizationPath.route("/model-provider-credentials")}
          >
            Show all
          </Link>
        </CardAction>
        <CardTitle>Credentials</CardTitle>
        <CardDescription>
          Showing {props.credentials.length} of {props.totalCount} provider credentials currently
          available to company agents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {props.credentials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No credentials yet</p>
            <p className="mt-2 text-xs/relaxed text-muted-foreground">
              Add a provider credential to let agents access external models.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {props.credentials.map((credential) => (
                <TableRow
                  key={credential.id}
                  className="cursor-pointer"
                  onClick={() => {
                    void navigate({
                      params: { credentialId: credential.id, organizationSlug },
                      to: OrganizationPath.route("/model-provider-credentials/$credentialId"),
                    });
                  }}
                >
                  <TableCell>
                    <p className="font-medium text-foreground">{credential.name}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatProviderLabel(credential.modelProvider)}</Badge>
                  </TableCell>
                  <TableCell>{credential.type}</TableCell>
                  <TableCell>{formatTimestamp(credential.updatedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
