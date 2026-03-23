import { ApplicationRouter } from "@/components/router/application_router";
import { ThemeProvider } from "@/components/theme_provider";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Application() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="companyhelm-ui-theme">
      <TooltipProvider>
        <ApplicationRouter />
      </TooltipProvider>
    </ThemeProvider>
  );
}
