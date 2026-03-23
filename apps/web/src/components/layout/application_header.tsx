import { PanelTopIcon } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function ApplicationHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const pageTitle = pathname === "/model-provider-credentials" ? "Credentials" : "Dashboard";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="h-4" />
        <div className="min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            window.open(
              "https://ui.shadcn.com/blocks?category=dashboard",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          <PanelTopIcon />
          Browse Blocks
        </Button>
      </div>
    </header>
  );
}
