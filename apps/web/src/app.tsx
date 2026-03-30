import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "./components/theme_provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { FeatureFlagProvider } from "./contextes/feature_flag_context";
import { applicationRouter } from "./routes";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="companyhelm-ui-theme">
      <TooltipProvider>
        <FeatureFlagProvider>
          <RouterProvider router={applicationRouter} />
        </FeatureFlagProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
