import { UserButton, useOrganization, useUser } from "@clerk/react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ActivityIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  MoonIcon,
  ShieldCheckIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "@/components/theme_provider";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/sidebar";

export function ApplicationSidebar() {
  const organizationState = useOrganization();
  const userState = useUser();
  const themeState = useTheme();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const firstName = String(userState.user?.firstName || "").trim() || "Operator";
  const emailAddress = String(userState.user?.primaryEmailAddress?.emailAddress || "").trim()
    || "workspace@companyhelm.dev";
  const organizationName = String(organizationState.organization?.name || "").trim()
    || "Personal Workspace";
  const organizationImageUrl = String(organizationState.organization?.imageUrl || "").trim();
  const isDarkTheme = themeState.theme !== "light";
  const ThemeIcon = isDarkTheme ? SunIcon : MoonIcon;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-12"
              render={<Link to="/" />}
              size="lg"
              tooltip="CompanyHelm"
            >
              <img className="size-7 rounded-md" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
              <span className="flex flex-1 items-center justify-between gap-2">
                <span className="truncate font-semibold tracking-tight">CompanyHelm</span>
                <Badge variant="outline">Ops</Badge>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Active Boards</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2 px-2 pb-2">
            <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-sidebar-foreground">
                <FolderKanbanIcon className="size-4" />
                <span className="text-xs font-medium">Document Queue</span>
              </div>
              <p className="text-xs leading-5 text-sidebar-foreground/70">
                12 sections are actively under review across outline and past performance.
              </p>
            </div>

            <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-3">
              <div className="mb-2 flex items-center gap-2 text-sidebar-foreground">
                <ShieldCheckIcon className="size-4" />
                <span className="text-xs font-medium">Compliance Watch</span>
              </div>
              <p className="text-xs leading-5 text-sidebar-foreground/70">
                Risk posture is stable. Two policy checks are pending sign-off today.
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Signals</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Activity feed">
                  <ActivityIcon />
                  <span>Agent Activity</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/30 p-2">
            {organizationImageUrl ? (
              <img
                alt=""
                aria-hidden="true"
                className="size-9 rounded-lg border border-sidebar-border/70 object-cover"
                src={organizationImageUrl}
              />
            ) : (
              <div className="flex size-9 items-center justify-center rounded-lg border border-sidebar-border/70 bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
                {organizationName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-medium text-sidebar-foreground">Organization</p>
              <p className="truncate text-[11px] text-sidebar-foreground/70">{organizationName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-2">
            <div className="shrink-0">
              <UserButton />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{firstName}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/70">{emailAddress}</p>
            </div>
          </div>

          <Button
            className="justify-start group-data-[collapsible=icon]:justify-center"
            size="sm"
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
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
