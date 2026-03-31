import { Link, useRouterState } from "@tanstack/react-router";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function ApplicationHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { detailLabel, headerActions, headerContent } = useApplicationBreadcrumb();
  const isCredentialDetailPage = /^\/model-provider-credentials\/[^/]+$/.test(pathname);
  const isAgentDetailPage = /^\/agents\/[^/]+$/.test(pathname);
  const pageTitle = pathname.startsWith("/model-provider-credentials")
    ? "LLM Credentials"
    : pathname.startsWith("/compute-providers")
      ? "Compute Providers"
      : pathname.startsWith("/environments")
        ? "Environments"
        : pathname.startsWith("/secrets")
          ? "Secrets"
    : pathname.startsWith("/chats")
      ? "Chats"
      : pathname.startsWith("/repositories")
        ? "Repositories"
        : pathname.startsWith("/knowledge-base")
          ? "Knowledge Base"
        : pathname.startsWith("/tasks")
          ? "Tasks"
          : pathname.startsWith("/flags")
            ? "Feature Flags"
          : pathname.startsWith("/settings")
            ? "Settings"
            : pathname.startsWith("/agents")
              ? "Agents"
              : "Dashboard";
  const detailPageTitle = detailLabel || (isAgentDetailPage ? "Agent" : "Credential");
  const detailPageHref = isCredentialDetailPage
    ? "/model-provider-credentials"
    : isAgentDetailPage
      ? "/agents"
      : null;
  const isDetailPage = isCredentialDetailPage || isAgentDetailPage;

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1 shrink-0 md:hidden" size="icon-lg" />
        <div className="min-w-0">
          {headerContent ?? (
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {isDetailPage && detailPageHref ? (
                    <Link
                      className="font-medium text-muted-foreground transition hover:text-foreground"
                      to={detailPageHref}
                    >
                      {pageTitle}
                    </Link>
                  ) : (
                    <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {isDetailPage ? <BreadcrumbSeparator /> : null}
                {isDetailPage ? (
                  <BreadcrumbItem>
                    <BreadcrumbPage>{detailPageTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>
      </div>
      {headerActions ? (
        <div className="flex shrink-0 items-center justify-end gap-2">
          {headerActions}
        </div>
      ) : null}
    </header>
  );
}
