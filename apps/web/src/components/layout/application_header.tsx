import { Link, useRouterState } from "@tanstack/react-router";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
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
  const { detailLabel } = useApplicationBreadcrumb();
  const isCredentialDetailPage = /^\/model-provider-credentials\/[^/]+$/.test(pathname);
  const isAgentDetailPage = /^\/agents\/[^/]+$/.test(pathname);
  const pageTitle = pathname.startsWith("/model-provider-credentials")
    ? "LLM Credentials"
    : pathname.startsWith("/chats")
      ? "Chats"
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
        <div className="min-w-0">
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
        </div>
      </div>
    </header>
  );
}
