import { useEffect, useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { companiesPageQuery } from "./__generated__/companiesPageQuery.graphql";

const COMPANIES_PAGE_SIZE = 25;

const companiesPageQueryNode = graphql`
  query companiesPageQuery($page: Int!, $pageSize: Int!, $search: String) {
    PlatformAdminCompanies(page: $page, pageSize: $pageSize, search: $search) {
      page
      pageSize
      totalCount
      totalPages
      nodes {
        id
        name
        slug
        plan
        deletionStatus
        clerkOrganizationId
        memberCount
        deletionRequestedAt
      }
    }
  }
`;

function formatOptionalValue(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "—";
}

function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

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
  return plan === "pro" ? "Pro" : "Free";
}

function formatDeletionStatusLabel(status: string): string {
  return status === "deletion_requested" ? "Deletion requested" : "Active";
}

/**
 * Renders the global CompanyHelm company directory for platform admins with server-side search so
 * the pagination controls always reflect the filtered company set rather than the current page.
 */
export function AdminCompaniesPage() {
  return (
    <PlatformAdminGuard>
      <AdminCompaniesPageContent />
    </PlatformAdminGuard>
  );
}

function AdminCompaniesPageContent() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const data = useLazyLoadQuery<companiesPageQuery>(
    companiesPageQueryNode,
    {
      page,
      pageSize: COMPANIES_PAGE_SIZE,
      search: search.length > 0 ? search : null,
    },
    {
      fetchPolicy: "store-and-network",
    },
  );
  const companyPage = data.PlatformAdminCompanies;
  const canGoBack = companyPage.page > 1;
  const canGoForward = companyPage.page < companyPage.totalPages;
  const hasSearch = search.length > 0;

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform companies</h1>
        <p className="text-sm text-muted-foreground">
          {hasSearch
            ? `${companyPage.totalCount} companies matching “${search}”.`
            : `${companyPage.totalCount} companies total across CompanyHelm.`} Page {companyPage.page} of {companyPage.totalPages}.
        </p>
      </header>

      <Card className="border border-border/70 bg-card/90 shadow-sm">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Company directory</CardTitle>
            <CardDescription>
              Search by company name, slug, company ID, or Clerk organization ID.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <Input
              className="h-9 sm:w-80"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search companies"
              type="search"
              value={searchInput}
            />
            {searchInput.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                }}
              >
                Clear
              </Button>
            ) : null}
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
          {companyPage.nodes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
              {hasSearch ? `No companies matched “${search}”.` : "No companies found for this page."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clerk org</TableHead>
                  <TableHead>Deletion requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyPage.nodes.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{company.name}</div>
                      <div className="text-xs text-muted-foreground">{company.id}</div>
                      <div className="text-xs text-muted-foreground">Slug: {formatOptionalValue(company.slug)}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatPlanLabel(company.plan)}</Badge>
                    </TableCell>
                    <TableCell>{company.memberCount}</TableCell>
                    <TableCell>
                      {company.deletionStatus === "active"
                        ? <Badge variant="outline">{formatDeletionStatusLabel(company.deletionStatus)}</Badge>
                        : <Badge>{formatDeletionStatusLabel(company.deletionStatus)}</Badge>}
                    </TableCell>
                    <TableCell>{formatOptionalValue(company.clerkOrganizationId)}</TableCell>
                    <TableCell>{formatTimestamp(company.deletionRequestedAt)}</TableCell>
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
