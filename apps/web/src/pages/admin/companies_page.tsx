import { useEffect, useState } from "react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { PlatformAdminGuard } from "./platform_admin_guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { companiesPageQuery } from "./__generated__/companiesPageQuery.graphql";
import type { companiesPageUpdateEnhancedLoggingMutation } from "./__generated__/companiesPageUpdateEnhancedLoggingMutation.graphql";

const COMPANIES_PAGE_SIZE = 25;
const ENHANCED_LOGGING_TTL_OPTIONS = [{ label: "15 minutes", seconds: 15 * 60 }, {
  label: "1 hour",
  seconds: 60 * 60,
}, {
  label: "4 hours",
  seconds: 4 * 60 * 60,
}, {
  label: "24 hours",
  seconds: 24 * 60 * 60,
}];

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
        clerkOrganizationId
        memberCount
        enhancedLogging {
          enabled
          expiresAt
          ttlSeconds
          components
          sessionIds
        }
      }
    }
  }
`;

const companiesPageUpdateEnhancedLoggingMutationNode = graphql`
  mutation companiesPageUpdateEnhancedLoggingMutation($input: UpdatePlatformAdminCompanyEnhancedLoggingInput!) {
    UpdatePlatformAdminCompanyEnhancedLogging(input: $input) {
      enabled
      expiresAt
      ttlSeconds
      components
      sessionIds
    }
  }
`;

type PlatformAdminCompany = companiesPageQuery["response"]["PlatformAdminCompanies"]["nodes"][number];

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

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) {
    return "TTL unknown";
  }
  if (seconds < 60 * 60) {
    return `${Math.ceil(seconds / 60)}m remaining`;
  }

  return `${Math.ceil(seconds / (60 * 60))}h remaining`;
}

function formatCompanyCount(count: number): string {
  return count === 1 ? "1 company" : `${count} companies`;
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
  const [selectedEnhancedLoggingCompany, setSelectedEnhancedLoggingCompany] = useState<PlatformAdminCompany | null>(null);
  const [selectedTtlSeconds, setSelectedTtlSeconds] = useState(String(ENHANCED_LOGGING_TTL_OPTIONS[1]!.seconds));
  const [enhancedLoggingErrorMessage, setEnhancedLoggingErrorMessage] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [commitUpdateEnhancedLogging, isUpdateEnhancedLoggingInFlight] =
    useMutation<companiesPageUpdateEnhancedLoggingMutation>(companiesPageUpdateEnhancedLoggingMutationNode);

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
      fetchKey: refreshKey,
    },
  );
  const companyPage = data.PlatformAdminCompanies;
  const canGoBack = companyPage.page > 1;
  const canGoForward = companyPage.page < companyPage.totalPages;
  const hasSearch = search.length > 0;

  const refreshCompanies = () => {
    setRefreshKey((currentRefreshKey) => currentRefreshKey + 1);
  };

  const closeEnhancedLoggingDialog = () => {
    setSelectedEnhancedLoggingCompany(null);
    setEnhancedLoggingErrorMessage(null);
    setSelectedTtlSeconds(String(ENHANCED_LOGGING_TTL_OPTIONS[1]!.seconds));
  };

  const enableEnhancedLogging = () => {
    if (!selectedEnhancedLoggingCompany) {
      return;
    }

    setEnhancedLoggingErrorMessage(null);
    commitUpdateEnhancedLogging({
      variables: {
        input: {
          companyId: selectedEnhancedLoggingCompany.id,
          components: [],
          enabled: true,
          sessionIds: [],
          ttlSeconds: Number(selectedTtlSeconds),
        },
      },
      onCompleted: () => {
        closeEnhancedLoggingDialog();
        refreshCompanies();
      },
      onError: (error) => {
        setEnhancedLoggingErrorMessage(error.message);
      },
    });
  };

  const disableEnhancedLogging = (company: PlatformAdminCompany) => {
    setEnhancedLoggingErrorMessage(null);
    commitUpdateEnhancedLogging({
      variables: {
        input: {
          companyId: company.id,
          enabled: false,
        },
      },
      onCompleted: refreshCompanies,
      onError: (error) => {
        setEnhancedLoggingErrorMessage(error.message);
      },
    });
  };

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Platform companies</h1>
        <p className="text-sm text-muted-foreground">
          {hasSearch
            ? `${formatCompanyCount(companyPage.totalCount)} matching “${search}”.`
            : `${formatCompanyCount(companyPage.totalCount)} total across CompanyHelm.`} Page {companyPage.page} of {companyPage.totalPages}.
        </p>
      </header>
      {enhancedLoggingErrorMessage && !selectedEnhancedLoggingCompany ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {enhancedLoggingErrorMessage}
        </div>
      ) : null}

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
                  <TableHead>Enhanced logging</TableHead>
                  <TableHead>Clerk org</TableHead>
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
                      <div className="flex flex-col gap-2">
                        {company.enhancedLogging.enabled ? (
                          <div className="space-y-1">
                            <Badge>On</Badge>
                            <div className="text-xs text-muted-foreground">
                              {formatDuration(company.enhancedLogging.ttlSeconds)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Until {formatTimestamp(company.enhancedLogging.expiresAt)}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">Off</Badge>
                        )}
                        {company.enhancedLogging.enabled ? (
                          <Button
                            disabled={isUpdateEnhancedLoggingInFlight}
                            size="sm"
                            variant="outline"
                            onClick={() => disableEnhancedLogging(company)}
                          >
                            Disable
                          </Button>
                        ) : (
                          <Button
                            disabled={isUpdateEnhancedLoggingInFlight}
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEnhancedLoggingErrorMessage(null);
                              setSelectedEnhancedLoggingCompany(company);
                            }}
                          >
                            Enable
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatOptionalValue(company.clerkOrganizationId)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={selectedEnhancedLoggingCompany !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeEnhancedLoggingDialog();
          }
        }}
      >
        <DialogContent className="w-[min(92vw,30rem)]">
          <DialogHeader>
            <DialogTitle>Enable enhanced logging</DialogTitle>
            <DialogDescription>
              Turn on extra diagnostic logs for {selectedEnhancedLoggingCompany?.name ?? "this company"}. The Redis
              key expires automatically after the selected TTL.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <label className="text-xs font-medium text-foreground" htmlFor="enhanced-logging-ttl">
              Logging TTL
            </label>
            <Select
              value={selectedTtlSeconds}
              onValueChange={(value) => {
                if (value) {
                  setSelectedTtlSeconds(value);
                }
              }}
            >
              <SelectTrigger id="enhanced-logging-ttl">
                <SelectValue placeholder="Select TTL" />
              </SelectTrigger>
              <SelectContent>
                {ENHANCED_LOGGING_TTL_OPTIONS.map((option) => (
                  <SelectItem key={option.seconds} value={String(option.seconds)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This first version logs all enhanced components and sessions for the selected company.
            </p>
            {enhancedLoggingErrorMessage ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {enhancedLoggingErrorMessage}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={closeEnhancedLoggingDialog}>
              Cancel
            </Button>
            <Button size="sm" disabled={isUpdateEnhancedLoggingInFlight} onClick={enableEnhancedLogging}>
              Enable logging
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
