import { OrganizationSwitcher, UserButton, useUser } from "@clerk/react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  KeyRoundIcon,
  LayoutDashboardIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme_provider";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export function ApplicationSidebar() {
  const userState = useUser();
  const themeState = useTheme();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const emailAddress = String(userState.user?.primaryEmailAddress?.emailAddress || "").trim()
    || "workspace@companyhelm.dev";
  const isDarkTheme = themeState.theme !== "light";
  const ThemeIcon = isDarkTheme ? SunIcon : MoonIcon;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <Link
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
            to="/"
          >
            <img className="size-7 rounded-md" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
            <span className="truncate font-semibold tracking-tight">CompanyHelm</span>
          </Link>
          <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:mx-auto" size="icon-lg" />
        </div>
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <div>
            <OrganizationSwitcher />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/"}
                  render={<Link to="/" />}
                  tooltip="Dashboard"
                >
                  <LayoutDashboardIcon />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/model-provider-credentials"}
                  render={<Link to="/model-provider-credentials" />}
                  tooltip="Credentials"
                >
                  <KeyRoundIcon />
                  <span>Credentials</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex flex-col gap-4">
          <Button
            className="mb-2 h-5 justify-start px-1.5 text-[11px] font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            size="xs"
            variant="ghost"
            onClick={() => {
              themeState.setTheme(isDarkTheme ? "light" : "dark");
            }}
          >
            <ThemeIcon />
            <span className="group-data-[collapsible=icon]:hidden">
              {isDarkTheme ? "Light theme" : "Dark theme"}
            </span>
          </Button>

          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <UserButton />
            <span className="truncate text-[11px] text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              {emailAddress}
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
