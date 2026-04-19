import { OrganizationSwitcher, UserButton, useUser } from "@clerk/react";
import { Suspense } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { graphql, useLazyLoadQuery } from "react-relay";
import {
  MoonIcon,
  Settings2Icon,
  SunIcon,
} from "lucide-react";
import { config } from "@/config";
import { ApplicationNavigationCatalog } from "@/components/layout/application_navigation_catalog";
import { ErrorBoundary } from "@/components/error_boundary";
import { useTheme } from "@/components/theme_provider";
import { Button } from "@/components/ui/button";
import { useFeatureFlags } from "@/contextes/feature_flag_context";
import { OrganizationPath } from "@/lib/organization_path";
import { useCurrentOrganizationSlug } from "@/lib/use_current_organization_slug";
import type { applicationSidebarInboxCountQuery } from "./__generated__/applicationSidebarInboxCountQuery.graphql";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const applicationSidebarInboxCountQueryNode = graphql`
  query applicationSidebarInboxCountQuery {
    InboxHumanQuestions {
      id
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
  return (
    <div className="flex h-8 items-center justify-center group-data-[collapsible=icon]:hidden">
      <span className="app-shell-sidebar__meta text-sidebar-foreground/50">v{config.appVersion}</span>
    </div>
  );
}

function ApplicationSidebarInboxBadge() {
  const data = useLazyLoadQuery<applicationSidebarInboxCountQuery>(
    applicationSidebarInboxCountQueryNode,
    {},
    {
      fetchPolicy: "store-or-network",
    },
  );
  const openInboxCount = data.InboxHumanQuestions.length;
  if (openInboxCount === 0) {
    return null;
  }

  return (
    <SidebarMenuBadge className="right-2 rounded-full bg-sidebar-primary/15 px-1.5 text-[11px] font-semibold text-sidebar-primary peer-data-active/menu-button:bg-sidebar-primary peer-data-active/menu-button:text-sidebar-primary-foreground">
      {openInboxCount}
    </SidebarMenuBadge>
  );
}

export function ApplicationSidebar() {
  const userState = useUser();
  const featureFlags = useFeatureFlags();
  const sidebarState = useSidebar();
  const themeState = useTheme();
  const organizationSlug = useCurrentOrganizationSlug();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const emailAddress = userState.user?.primaryEmailAddress?.emailAddress || "workspace@companyhelm.dev";
  const isDarkTheme = themeState.theme !== "light";
  const ThemeIcon = isDarkTheme ? SunIcon : MoonIcon;
  const navigationGroups = ApplicationNavigationCatalog.buildMainGroups({
    isComputeProvidersEnabled: featureFlags.isEnabled("computer_providers"),
  });

  function handleNavigationClick() {
    if (!sidebarState.isMobile) {
      return;
    }

    sidebarState.setOpenMobile(false);
  }

  return (
    <Sidebar className="app-shell-sidebar" collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2">
          <Link
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden"
            onClick={handleNavigationClick}
            params={{ organizationSlug }}
            to={OrganizationPath.route("/")}
          >
            <img className="size-7 rounded-md" src="/logos/logo-only.svg" alt="" aria-hidden="true" />
            <span className="truncate font-semibold tracking-tight">CompanyHelm</span>
          </Link>
          <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:mx-auto" size="icon-lg" />
        </div>
        <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
          <div>
            <OrganizationSwitcher
              afterCreateOrganizationUrl="/orgs/:slug"
              afterSelectOrganizationUrl="/orgs/:slug"
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const ItemIcon = item.icon;

                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        isActive={isNavigationItemActive(pathname, item.to)}
                        onClick={handleNavigationClick}
                        render={<Link params={{ organizationSlug }} to={OrganizationPath.route(item.to)} />}
                        tooltip={item.label}
                      >
                        <ItemIcon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                      {item.to === "/inbox" ? (
                        <ErrorBoundary boundaryKey={pathname} fallback={null}>
                          <Suspense fallback={null}>
                            <ApplicationSidebarInboxBadge />
                          </Suspense>
                        </ErrorBoundary>
                      ) : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex flex-col gap-2">
          <Button
            className="app-shell-sidebar__meta h-8 justify-start gap-2 px-2 text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 [&_svg]:size-3.5"
            size="default"
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
                onClick={handleNavigationClick}
                render={<Link params={{ organizationSlug }} to={OrganizationPath.route("/settings")} />}
                tooltip="Settings"
              >
                <Settings2Icon />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          <div className="flex h-8 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <UserButton />
            <span className="app-shell-sidebar__meta truncate text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
              {emailAddress}
            </span>
          </div>
          <ErrorBoundary boundaryKey={pathname} fallback={null}>
            <Suspense fallback={null}>
              <ApplicationSidebarVersion />
            </Suspense>
          </ErrorBoundary>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
