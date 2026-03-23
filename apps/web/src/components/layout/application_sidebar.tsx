import { UserButton, useUser } from "@clerk/react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ActivityIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  const userState = useUser();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const firstName = String(userState.user?.firstName || "").trim() || "Operator";
  const emailAddress = String(userState.user?.primaryEmailAddress?.emailAddress || "").trim()
    || "workspace@companyhelm.dev";

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
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-2">
          <div className="shrink-0">
            <UserButton />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{firstName}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/70">{emailAddress}</p>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
