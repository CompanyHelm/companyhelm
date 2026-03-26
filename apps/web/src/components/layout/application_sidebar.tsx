import { OrganizationSwitcher, UserButton, useUser } from "@clerk/react";
import { Suspense } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import {
  BotIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  MoonIcon,
  Settings2Icon,
  SunIcon,
  WorkflowIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

interface NavigationItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

const applicationSidebarVersionQueryNode = graphql`
  query applicationSidebarVersionQuery {
    Me {
      serverVersion
    }
  }
`;

function isNavigationItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === "/") {
    return pathname === itemPath;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

function ApplicationSidebarVersion() {
  const data = useLazyLoadQuery(
    applicationSidebarVersionQueryNode,
    {},
    {
      fetchPolicy: "store-or-network",
    },
  );

  return (
    <div className="flex justify-center group-data-[collapsible=icon]:hidden">
      <span className="text-[12px] text-sidebar-foreground/50">v{data.Me.serverVersion}</span>
    </div>
  );
}

export function ApplicationSidebar() {
  const userState = useUser();
  const themeState = useTheme();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const emailAddress = userState.user?.primaryEmailAddress?.emailAddress || "workspace@companyhelm.dev";
  const isDarkTheme = themeState.theme !== "light";
  const ThemeIcon = isDarkTheme ? SunIcon : MoonIcon;
  const navigationItems: NavigationItem[] = [
    {
      icon: LayoutDashboardIcon,
      label: "Dashboard",
      to: "/",
    },
    {
      icon: KeyRoundIcon,
      label: "LLM Credentials",
      to: "/model-provider-credentials",
    },
    {
      icon: BotIcon,
      label: "Agents",
      to: "/agents",
    },
    {
      icon: MessageSquareIcon,
      label: "Chats",
      to: "/chats",
    },
    {
      icon: WorkflowIcon,
      label: "Tasks",
      to: "/tasks",
    },
  ];

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
              {navigationItems.map((item) => {
                const ItemIcon = item.icon;

                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={isNavigationItemActive(pathname, item.to)}
                      render={<Link to={item.to} />}
                      tooltip={item.label}
                    >
                      <ItemIcon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex flex-col gap-4">
          <Button
            className="mb-2 h-6 justify-start gap-2 px-2 text-[11px] font-medium text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&_svg]:size-3.5"
            size="sm"
            variant="ghost"
            onClick={() => {
              themeState.setTheme(isDarkTheme ? "light" : "dark");
            }}
          >
            <ThemeIcon />
            <span className="leading-none group-data-[collapsible=icon]:hidden">
              {isDarkTheme ? "Dark theme" : "Light theme"}
            </span>
          </Button>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={isNavigationItemActive(pathname, "/settings")}
                render={<Link to="/settings" />}
                tooltip="Settings"
              >
                <Settings2Icon />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <UserButton />
            <span className="truncate text-[11px] text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              {emailAddress}
            </span>
          </div>
          <Suspense fallback={null}>
            <ApplicationSidebarVersion />
          </Suspense>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
