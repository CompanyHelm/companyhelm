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
import { ConversationsPage } from "./pages/conversations/conversations_page";
import { DashboardPage } from "./pages/dashboard/dashboard_page";
import { EnvironmentsPage } from "./pages/environments/environments_page";
import { FlagsPage } from "./pages/flags/flags_page";
import { InboxPage } from "./pages/inbox/inbox_page";
import { KnowledgeBaseDetailPage } from "./pages/knowledge-base/knowledge_base_detail_page";
import { KnowledgeBasePage } from "./pages/knowledge-base/knowledge_base_page";
import { ModelProviderCredentialDetailPage } from "./pages/model-provider-credentials/credential_detail_page";
import { ModelProviderCredentialsPage } from "./pages/model-provider-credentials/model_provider_credentials_page";
import { GithubInstallCallbackPage } from "./pages/repositories/github_install_callback_page";
import { RepositoriesPage } from "./pages/repositories/repositories_page";
import { SecretsPage } from "./pages/secrets/secrets_page";
import { SkillDetailPage } from "./pages/skills/skill_detail_page";
import { SkillsPage } from "./pages/skills/skills_page";
import { SettingsPage } from "./pages/settings/settings_page";
import { ArtifactDetailPage } from "./pages/tasks/artifact_detail_page";
import { TaskDetailPage } from "./pages/tasks/task_detail_page";
import { TasksPage } from "./pages/tasks/tasks_page";
import { AuthenticatedRoute } from "./pages/root/authenticated_route";
import { PageContainerRoute } from "./pages/root/page_container_route";
import { RootErrorComponent } from "./pages/root/root_error_component";

type ChatsRouteSearch = {
  agentId?: string;
  sessionId?: string;
};

type TasksRouteSearch = {
  category?: string;
};

type TaskDetailRouteSearch = {
  tab?: "artifacts" | "runs";
};

type ConversationsRouteSearch = {
  conversationId?: string;
};

type SettingsRouteSearch = {
  tab?: "tasks" | "AI";
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

function validateTaskDetailRouteSearch(search: Record<string, unknown>): TaskDetailRouteSearch {
  return {
    tab: search.tab === "runs" || search.tab === "artifacts"
      ? search.tab
      : undefined,
  };
}

function validateConversationsRouteSearch(search: Record<string, unknown>): ConversationsRouteSearch {
  return {
    conversationId: typeof search.conversationId === "string" && search.conversationId.trim().length > 0
      ? search.conversationId.trim()
      : undefined,
  };
}

function validateSettingsRouteSearch(search: Record<string, unknown>): SettingsRouteSearch {
  if (search.tab === "AI") {
    return {
      tab: "AI",
    };
  }

  return {
    tab: search.tab === "tasks" ? "tasks" : undefined,
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
  errorComponent: RootErrorComponent,
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

const inboxRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/inbox",
  component: InboxPage,
});

const conversationsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/conversations",
  validateSearch: validateConversationsRouteSearch,
  component: ConversationsPage,
});

const secretsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/secrets",
  component: SecretsPage,
});

const skillsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/skills",
  component: SkillsPage,
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

const knowledgeBaseRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/knowledge-base",
  component: KnowledgeBasePage,
});

const knowledgeBaseDetailRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/knowledge-base/$artifactId",
  component: KnowledgeBaseDetailPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/tasks",
  validateSearch: validateTasksRouteSearch,
  component: TasksPage,
});

const taskDetailRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/tasks/$taskId",
  validateSearch: validateTaskDetailRouteSearch,
  component: TaskDetailPage,
});

const taskArtifactDetailRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/tasks/$taskId/artifacts/$artifactId",
  component: ArtifactDetailPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/settings",
  validateSearch: validateSettingsRouteSearch,
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

const skillDetailRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/skills/$skillId",
  component: SkillDetailPage,
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
      inboxRoute,
      conversationsRoute,
      secretsRoute,
      skillsRoute,
      githubInstallRoute,
      repositoriesRoute,
      knowledgeBaseRoute,
      knowledgeBaseDetailRoute,
      tasksRoute,
      taskDetailRoute,
      taskArtifactDetailRoute,
      settingsRoute,
      agentDetailRoute,
      modelProviderCredentialsRoute,
      modelProviderCredentialDetailRoute,
      skillDetailRoute,
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
