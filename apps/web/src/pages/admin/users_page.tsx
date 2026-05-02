import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/toast_provider";
import type { usersPageGrantPlatformAdminMutation } from "./__generated__/usersPageGrantPlatformAdminMutation.graphql";
import type { usersPageQuery } from "./__generated__/usersPageQuery.graphql";

const USERS_PAGE_SIZE = 25;

const usersPageQueryNode = graphql`
  query usersPageQuery($page: Int!, $pageSize: Int!, $search: String) {
    PlatformAdminUsers(page: $page, pageSize: $pageSize, search: $search) {
      page
      pageSize
      totalCount
      totalPages
      nodes {
        id
        clerkUserId
        email
        firstName
        lastName
        isPlatformAdmin
        companyCount
        createdAt
        updatedAt
      }
    }
  }
`;

const usersPageGrantPlatformAdminMutationNode = graphql`
  mutation usersPageGrantPlatformAdminMutation($input: GrantPlatformAdminInput!) {
    GrantPlatformAdmin(input: $input) {
      id
      clerkUserId
      email
      firstName
      lastName
      isPlatformAdmin
      companyCount
      createdAt
      updatedAt
    }
  }
`;

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

function formatDisplayName(user: usersPageQuery["response"]["PlatformAdminUsers"]["nodes"][number]): string {
  return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
}

function formatOptionalValue(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "—";
}

function formatUserCount(count: number): string {
  return count === 1 ? "1 user" : `${count} users`;
}

/**
 * Renders the global CompanyHelm user directory for platform admins and keeps navigation explicit
 * with simple page-by-page controls instead of an unbounded table.
 */
export function AdminUsersPage() {
  return (
    <PlatformAdminGuard>
      <AdminUsersPageContent />
    </PlatformAdminGuard>
  );
}

function AdminUsersPageContent() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingGrantUserId, setPendingGrantUserId] = useState<string | null>(null);
  const toast = useToast();
  const [commitGrantPlatformAdmin, isGrantPlatformAdminInFlight] =
    useMutation<usersPageGrantPlatformAdminMutation>(usersPageGrantPlatformAdminMutationNode);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const data = useLazyLoadQuery<usersPageQuery>(
    usersPageQueryNode,
    {
      page,
      pageSize: USERS_PAGE_SIZE,
      search: search.length > 0 ? search : null,
    },
    {
      fetchPolicy: "store-and-network",
      fetchKey: refreshKey,
    },
  );
  const userPage = data.PlatformAdminUsers;
  const canGoBack = userPage.page > 1;
  const canGoForward = userPage.page < userPage.totalPages;
  const hasSearch = search.length > 0;

  const grantPlatformAdmin = (userId: string) => {
    setPendingGrantUserId(userId);
    commitGrantPlatformAdmin({
      variables: {
        input: {
          userId,
        },
      },
      onCompleted() {
        setPendingGrantUserId(null);
        setRefreshKey((currentRefreshKey) => currentRefreshKey + 1);
        toast.showSavedToast("Platform admin granted");
      },
      onError() {
        setPendingGrantUserId(null);
      },
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform users</h1>
        <p className="text-sm text-muted-foreground">
          {hasSearch ? `${formatUserCount(userPage.totalCount)} matching “${search}”.` : `${formatUserCount(userPage.totalCount)} total across CompanyHelm.`} Page {userPage.page} of {userPage.totalPages}.
        </p>
      </header>

      <Card className="border border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>User directory</CardTitle>
            <CardDescription>
              Search by CompanyHelm user ID, Clerk user ID, email, or name. Company counts show how many organizations each user belongs to.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                className="h-9 sm:w-80"
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search users"
                type="search"
                value={searchInput}
              />
              {searchInput.length > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchInput("")}
                >
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoBack}
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoForward}
                onClick={() => setPage((currentPage) => currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {userPage.nodes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              {hasSearch ? "No users matched the current search." : "No users found for this page."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company memberships</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userPage.nodes.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{formatDisplayName(user)}</div>
                      <div className="text-xs text-muted-foreground">CompanyHelm: {user.id}</div>
                      <div className="text-xs text-muted-foreground">Clerk: {formatOptionalValue(user.clerkUserId)}</div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.companyCount}</TableCell>
                    <TableCell>
                      {user.isPlatformAdmin ? <Badge>Platform admin</Badge> : <Badge variant="outline">User</Badge>}
                    </TableCell>
                    <TableCell>{formatTimestamp(user.createdAt)}</TableCell>
                    <TableCell>{formatTimestamp(user.updatedAt)}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={user.isPlatformAdmin || isGrantPlatformAdminInFlight}
                        onClick={() => grantPlatformAdmin(user.id)}
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        {pendingGrantUserId === user.id ? "Granting" : "Grant admin"}
                      </Button>
                    </TableCell>
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
