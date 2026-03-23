import { PanelTopIcon } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function ApplicationHeader() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const eyebrow = pathname === "/model-provider-credentials" ? "Workspace / Credentials" : "Workspace / Dashboard";
  const title = pathname === "/model-provider-credentials" ? "Model Provider Credentials" : "Documents";

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="shrink-0" />
        <Separator orientation="vertical" className="h-4" />
        <div className="min-w-0">
          <p className="truncate text-[0.65rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </p>
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            {title}
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
