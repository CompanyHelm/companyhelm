import { RouterProvider } from "@tanstack/react-router";
import { ThemeProvider } from "./components/theme_provider";
import { TooltipProvider } from "./components/ui/tooltip";
import { applicationRouter } from "./routes";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="companyhelm-ui-theme">
    <TooltipProvider>
    <RouterProvider router={applicationRouter} />
    </TooltipProvider>
  </ThemeProvider>
  )
}
