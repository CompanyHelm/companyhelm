import { createElement } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AgentDetailPage } from "./pages/agents/agent_detail_page";
import { AgentsPage } from "./pages/agents/agents_page";
import { AuthenticationRoute } from "./pages/auth/route";
import { ChatsPage } from "./pages/chats/chats_page";
import { ComputeProviderDefinitionsPage } from "./pages/compute-providers/compute_provider_definitions_page";
import { DashboardPage } from "./pages/dashboard/dashboard_page";
import { EnvironmentsPage } from "./pages/environments/environments_page";
import { FlagsPage } from "./pages/flags/flags_page";
import { ModelProviderCredentialDetailPage } from "./pages/model-provider-credentials/credential_detail_page";
import { ModelProviderCredentialsPage } from "./pages/model-provider-credentials/model_provider_credentials_page";
import { GithubInstallCallbackPage } from "./pages/repositories/github_install_callback_page";
import { RepositoriesPage } from "./pages/repositories/repositories_page";
import { SecretsPage } from "./pages/secrets/secrets_page";
import { SettingsPage } from "./pages/settings/settings_page";
import { TasksPage } from "./pages/tasks/tasks_page";
import { AuthenticatedRoute } from "./pages/root/authenticated_route";
import { PageContainerRoute } from "./pages/root/page_container_route";

type ChatsRouteSearch = {
  agentId?: string;
  sessionId?: string;
};

type TasksRouteSearch = {
  category?: string;
};

function validateChatsRouteSearch(search: Record<string, unknown>): ChatsRouteSearch {
  return {
    agentId: typeof search.agentId === "string" && search.agentId.trim().length > 0
      ? search.agentId.trim()
      : undefined,
    sessionId: typeof search.sessionId === "string" && search.sessionId.trim().length > 0
      ? search.sessionId.trim()
      : undefined,
  };
}

function validateTasksRouteSearch(search: Record<string, unknown>): TasksRouteSearch {
  return {
    category: typeof search.category === "string" && search.category.trim().length > 0
      ? search.category.trim()
      : undefined,
  };
}

function SignInRoute() {
  return createElement(AuthenticationRoute, { mode: "signIn" });
}

function SignUpRoute() {
  return createElement(AuthenticationRoute, { mode: "signUp" });
}

const rootRoute = createRootRoute({
  component: Outlet,
});

const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authenticated",
  component: AuthenticatedRoute,
});

const pageContainerRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: "page-container",
  component: PageContainerRoute,
});

const rootIndexRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/",
  component: DashboardPage,
});

const flagsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/flags",
  component: FlagsPage,
});

const modelProviderCredentialsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/model-provider-credentials",
  component: ModelProviderCredentialsPage,
});

const agentsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/agents",
  component: AgentsPage,
});

const environmentsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/environments",
  component: EnvironmentsPage,
});

const computeProvidersRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/compute-providers",
  component: ComputeProviderDefinitionsPage,
});

const chatsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/chats",
  validateSearch: validateChatsRouteSearch,
  component: ChatsPage,
});

const secretsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/secrets",
  component: SecretsPage,
});

const githubInstallRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/github/install",
  component: GithubInstallCallbackPage,
});

const repositoriesRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/repositories",
  component: RepositoriesPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/tasks",
  validateSearch: validateTasksRouteSearch,
  component: TasksPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/settings",
  component: SettingsPage,
});

const agentDetailRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/agents/$agentId",
  component: AgentDetailPage,
});

const modelProviderCredentialDetailRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/model-provider-credentials/$credentialId",
  component: ModelProviderCredentialDetailPage,
});

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-in",
  component: SignInRoute,
});

const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/sign-up",
  component: SignUpRoute,
});

const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([
    pageContainerRoute.addChildren([
      rootIndexRoute,
      flagsRoute,
      agentsRoute,
      environmentsRoute,
      computeProvidersRoute,
      chatsRoute,
      secretsRoute,
      githubInstallRoute,
      repositoriesRoute,
      tasksRoute,
      settingsRoute,
      agentDetailRoute,
      modelProviderCredentialsRoute,
      modelProviderCredentialDetailRoute,
    ]),
  ]),
  signInRoute,
  signUpRoute,
]);

export const applicationRouter = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof applicationRouter;
  }
}
