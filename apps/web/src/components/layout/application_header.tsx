import { Link, useRouterState } from "@tanstack/react-router";
import { useApplicationBreadcrumb } from "@/components/layout/application_breadcrumb_context";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import { cn } from "@/lib/utils";
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
  const locationHref = useRouterState({
    select: (state) => state.location.href,
  });
  const organizationSlug = useCurrentOrganizationSlug();
  const normalizedPathname = OrganizationPath.stripPrefix(pathname);
  const currentLocation = new URL(locationHref, "https://companyhelm.local");
  const { detailLabel, headerActions, headerClassName, headerContent } = useApplicationBreadcrumb();
  const isCredentialDetailPage = /^\/model-provider-credentials\/[^/]+$/.test(normalizedPathname);
  const isAgentDetailPage = /^\/agents\/[^/]+$/.test(normalizedPathname);
  const isKnowledgeBaseDetailPage = /^\/knowledge-base\/[^/]+$/.test(normalizedPathname);
  const isSkillDetailPage = /^\/skills\/[^/]+$/.test(normalizedPathname);
  const isTaskDetailPage = /^\/tasks\/[^/]+$/.test(normalizedPathname);
  const pageTitle = normalizedPathname.startsWith("/model-provider-credentials")
    ? "LLM Credentials"
    : normalizedPathname.startsWith("/compute-providers")
      ? "Compute Providers"
        : normalizedPathname.startsWith("/environments")
          ? "Environments"
        : normalizedPathname.startsWith("/secrets")
          ? "Secrets"
          : normalizedPathname.startsWith("/skill-groups")
            ? "Skill Groups"
          : normalizedPathname.startsWith("/skills")
    ? "Skills"
    : normalizedPathname.startsWith("/chats")
      ? "Chats"
      : normalizedPathname.startsWith("/conversations")
        ? "Agent Conversations"
      : normalizedPathname.startsWith("/repositories")
        ? "Repositories"
        : normalizedPathname.startsWith("/knowledge-base")
          ? "Knowledge Base"
          : normalizedPathname.startsWith("/inbox")
            ? "Inbox"
          : normalizedPathname.startsWith("/tasks")
            ? "Tasks"
            : normalizedPathname.startsWith("/flags")
              ? "Feature Flags"
              : normalizedPathname.startsWith("/settings")
                ? "Settings"
                : normalizedPathname.startsWith("/agents")
                  ? "Agents"
                  : "Dashboard";
  const detailPageTitle = detailLabel
    || (isAgentDetailPage
      ? "Agent"
      : isKnowledgeBaseDetailPage
        ? "Artifact"
        : isSkillDetailPage
          ? "Skill"
        : isTaskDetailPage
          ? "Task"
          : "Credential");
  const detailPageHref = isCredentialDetailPage
    ? OrganizationPath.route("/model-provider-credentials")
    : isAgentDetailPage
      ? OrganizationPath.route("/agents")
      : isKnowledgeBaseDetailPage
        ? OrganizationPath.route("/knowledge-base")
        : isSkillDetailPage
          ? OrganizationPath.route("/skills")
        : isTaskDetailPage
          ? OrganizationPath.route("/tasks")
      : null;
  const isDetailPage = isCredentialDetailPage
    || isAgentDetailPage
    || isKnowledgeBaseDetailPage
    || isSkillDetailPage
    || isTaskDetailPage;
  const taskViewType = currentLocation.searchParams.get("viewType");
  const detailPageSearch = isTaskDetailPage && (taskViewType === "board" || taskViewType === "list")
    ? { viewType: taskViewType as "board" | "list" }
    : undefined;

  return (
    <header className={cn(
      "sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:px-6 lg:px-8",
      headerClassName,
    )}>
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
                      params={{ organizationSlug }}
                      search={detailPageSearch}
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
