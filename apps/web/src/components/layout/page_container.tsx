import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ApplicationBreadcrumbProvider } from "@/components/layout/application_breadcrumb_context";
import { ApplicationHeader } from "@/components/layout/application_header";
import { ApplicationSidebar } from "@/components/layout/application_sidebar";
import { ErrorBoundary } from "@/components/error_boundary";
import { ErrorState } from "@/components/error_state";
import { OrganizationPath } from "@/lib/organization_path";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer(props: PageContainerProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const locationKey = useRouterState({
    select: (state) => state.location.href,
  });
  const normalizedPathname = OrganizationPath.stripPrefix(pathname);
  const isChatsPage = normalizedPathname.startsWith("/chats");
  const isTasksBoardPage = normalizedPathname === "/tasks";
  const isFullHeightBoardPage = isChatsPage || isTasksBoardPage;

  return (
    <ApplicationBreadcrumbProvider>
      <SidebarProvider defaultOpen>
        <ApplicationSidebar />
        <SidebarInset
          className={cn(
            "min-h-svh",
            isFullHeightBoardPage && "h-svh min-h-0 max-h-svh overflow-hidden md:peer-data-[variant=inset]:my-0",
          )}
        >
          <ApplicationHeader />
          <div
            className={cn(
              "flex flex-1 flex-col",
              isChatsPage
                ? "min-h-0 overflow-hidden px-0 pb-0 pt-0"
                : isTasksBoardPage
                  ? "min-h-0 overflow-hidden px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4 lg:px-5"
                : "px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5 lg:px-8",
            )}
          >
            <ErrorBoundary
              boundaryKey={locationKey}
              fallback={({ error, reset }) => (
                <div className="flex flex-1 items-center justify-center">
                  <ErrorState
                    actionLabel="Try again"
                    className="w-full max-w-2xl rounded-2xl border border-border/70 bg-card/80 px-6 py-6 shadow-sm"
                    message={error.message || "An unexpected error interrupted this page."}
                    onAction={reset}
                    title="Unable to load this page"
                  />
                </div>
              )}
            >
              {props.children}
            </ErrorBoundary>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ApplicationBreadcrumbProvider>
  );
}
