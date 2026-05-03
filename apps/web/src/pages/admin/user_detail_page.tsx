import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { userDetailPageQuery } from "./__generated__/userDetailPageQuery.graphql";

const userDetailPageQueryNode = graphql`
  query userDetailPageQuery($userId: ID!) {
    PlatformAdminUser(id: $userId) {
      id
      clerkUserId
      email
      firstName
      lastName
      isPlatformAdmin
      createdAt
      updatedAt
      companyMemberships {
        companyId
        companyName
        companySlug
        companyPlan
        role
        status
        createdAt
        updatedAt
      }
    }
  }
`;

type PlatformAdminUser = userDetailPageQuery["response"]["PlatformAdminUser"];
type PlatformAdminUserCompanyMembership = PlatformAdminUser["companyMemberships"][number];

function formatDisplayName(user: Pick<PlatformAdminUser, "firstName" | "lastName">): string {
  return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
}

function formatOptionalValue(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "-";
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

function formatPlanLabel(plan: string): string {
  if (plan === "pro") {
    return "Pro";
  }
  if (plan === "plus") {
    return "Plus";
  }

  return "Free";
}

function formatRoleLabel(role: string): string {
  return role === "admin" ? "Admin" : "Member";
}

function formatStatusLabel(status: string): string {
  return status === "active" ? "Active" : "Invited";
}

function formatMembershipCount(count: number): string {
  return count === 1 ? "1 company membership" : `${count} company memberships`;
}

/**
 * Gives platform admins a focused user drill-down so organization access can be audited without
 * putting membership details into the global user directory table.
 */
export function AdminUserDetailPage() {
  return (
    <PlatformAdminGuard>
      <AdminUserDetailPageContent />
    </PlatformAdminGuard>
  );
}

function AdminUserDetailPageContent() {
  const params = useParams({ strict: false }) as { userId?: string };
  const userId = params.userId ?? "";
  const data = useLazyLoadQuery<userDetailPageQuery>(
    userDetailPageQueryNode,
    { userId },
    { fetchPolicy: "store-and-network" },
  );
  const user = data.PlatformAdminUser;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <Card variant="page" className="rounded-2xl border border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex min-w-0 flex-col gap-4">
            <Button asChild className="w-fit" size="sm" variant="ghost">
              <Link to="/admin/users">
                <ArrowLeftIcon />
                Back
              </Link>
            </Button>
            <div className="flex min-w-0 flex-col gap-1">
              <CardTitle>{formatDisplayName(user)}</CardTitle>
              <CardDescription>
                {user.email} - CompanyHelm {user.id}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            {user.isPlatformAdmin ? <Badge>Platform admin</Badge> : <Badge variant="outline">User</Badge>}
            <Badge variant="outline">Clerk: {formatOptionalValue(user.clerkUserId)}</Badge>
            <Badge variant="secondary">{formatMembershipCount(user.companyMemberships.length)}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground">Created</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatTimestamp(user.createdAt)}</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-4">
              <p className="text-xs font-medium text-muted-foreground">Updated</p>
              <p className="mt-2 text-sm font-medium text-foreground">{formatTimestamp(user.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/90 shadow-sm">
        <CardHeader>
          <CardTitle>Company memberships</CardTitle>
          <CardDescription>Companies where this user has active access or a pending invitation.</CardDescription>
        </CardHeader>
        <CardContent>
          {user.companyMemberships.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              This user does not belong to any companies.
            </div>
          ) : (
            <CompanyMembershipTable memberships={user.companyMemberships} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function CompanyMembershipTable(props: {
  memberships: readonly PlatformAdminUserCompanyMembership[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Plan</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead>Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.memberships.map((membership) => (
          <TableRow key={membership.companyId}>
            <TableCell>
              <div className="font-medium text-foreground">{membership.companyName}</div>
              <div className="text-xs text-muted-foreground">{membership.companyId}</div>
              <div className="text-xs text-muted-foreground">Slug: {formatOptionalValue(membership.companySlug)}</div>
            </TableCell>
            <TableCell>{formatPlanLabel(membership.companyPlan)}</TableCell>
            <TableCell>{formatRoleLabel(membership.role)}</TableCell>
            <TableCell>
              <Badge variant={membership.status === "active" ? "secondary" : "outline"}>
                {formatStatusLabel(membership.status)}
              </Badge>
            </TableCell>
            <TableCell>{formatTimestamp(membership.createdAt)}</TableCell>
            <TableCell>{formatTimestamp(membership.updatedAt)}</TableCell>
            <TableCell className="text-right">
              <Button asChild size="sm" variant="outline">
                <a href={`/admin/companies/${membership.companyId}`}>Open</a>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
