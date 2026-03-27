import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ApplicationBreadcrumbProvider } from "@/components/layout/application_breadcrumb_context";
import { ApplicationHeader } from "@/components/layout/application_header";
import { ApplicationSidebar } from "@/components/layout/application_sidebar";
import { cn } from "@/lib/utils";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface PageContainerProps {
  children: ReactNode;
}

export function PageContainer(props: PageContainerProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const isChatsPage = pathname.startsWith("/chats");
  const isTasksPage = pathname.startsWith("/tasks");
  const isFullHeightBoardPage = isChatsPage || isTasksPage;

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
                : isTasksPage
                  ? "min-h-0 overflow-hidden px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4 lg:px-5"
                : "px-4 pb-6 pt-4 md:px-6 md:pb-8 md:pt-5 lg:px-8",
            )}
          >
            {props.children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ApplicationBreadcrumbProvider>
  );
}
