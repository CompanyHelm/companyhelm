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
import { EnvironmentTerminalPage } from "./pages/environments/environment_terminal_page";
import { EnvironmentsPage } from "./pages/environments/environments_page";
import { FlagsPage } from "./pages/flags/flags_page";
import { InboxPage } from "./pages/inbox/inbox_page";
import { KnowledgeBaseDetailPage } from "./pages/knowledge-base/knowledge_base_detail_page";
import { KnowledgeBasePage } from "./pages/knowledge-base/knowledge_base_page";
import { McpOauthCallbackPage } from "./pages/mcp-servers/mcp_oauth_callback_page";
import { ModelProviderCredentialDetailPage } from "./pages/model-provider-credentials/credential_detail_page";
import { McpServersPage } from "./pages/mcp-servers/mcp_servers_page";
import { ModelProviderCredentialsPage } from "./pages/model-provider-credentials/model_provider_credentials_page";
import { GithubInstallCallbackPage } from "./pages/repositories/github_install_callback_page";
import { RepositoriesPage } from "./pages/repositories/repositories_page";
import { RoutinesPage } from "./pages/routines/routines_page";
import { SecretsPage } from "./pages/secrets/secrets_page";
import { SecretGroupsPage } from "./pages/secret-groups/secret_groups_page";
import { SkillGroupsPage } from "./pages/skill-groups/skill_groups_page";
import { SkillDetailPage } from "./pages/skills/skill_detail_page";
import { SkillsPage } from "./pages/skills/skills_page";
import { SettingsPage } from "./pages/settings/settings_page";
import { ArtifactDetailPage } from "./pages/tasks/artifact_detail_page";
import { TaskDetailPage } from "./pages/tasks/task_detail_page";
import { TasksPage } from "./pages/tasks/tasks_page";
import { WorkflowRunPage } from "./pages/workflows/workflow_run_page";
import { WorkflowsPage } from "./pages/workflows/workflows_page";
import { OrganizationPath } from "./lib/organization_path";
import { AuthenticatedRoute } from "./pages/root/authenticated_route";
import { OrganizationHomeRoute } from "./pages/root/organization_home_route";
import { OrganizationRoute } from "./pages/root/organization_route";
import { PageContainerRoute } from "./pages/root/page_container_route";
import { RootErrorComponent } from "./pages/root/root_error_component";

type ChatsRouteSearch = {
  agentId?: string;
  sessionId?: string;
};

type TasksRouteSearch = {
  stage?: string;
  viewType?: "board" | "list";
};

type TaskDetailRouteSearch = {
  tab?: "artifacts" | "runs";
  viewType?: "board" | "list";
};

type TaskArtifactDetailRouteSearch = {
  viewType?: "board" | "list";
};

type AgentDetailRouteSearch = {
  tab?: "archived" | "overview";
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
    stage: typeof search.stage === "string" && search.stage.trim().length > 0
      ? search.stage.trim()
      : undefined,
    viewType: search.viewType === "board" || search.viewType === "list"
      ? search.viewType
      : undefined,
  };
}

function validateTaskDetailRouteSearch(search: Record<string, unknown>): TaskDetailRouteSearch {
  return {
    tab: search.tab === "runs" || search.tab === "artifacts"
      ? search.tab
      : undefined,
    viewType: search.viewType === "board" || search.viewType === "list"
      ? search.viewType
      : undefined,
  };
}

function validateTaskArtifactDetailRouteSearch(search: Record<string, unknown>): TaskArtifactDetailRouteSearch {
  return {
    viewType: search.viewType === "board" || search.viewType === "list"
      ? search.viewType
      : undefined,
  };
}

function validateAgentDetailRouteSearch(search: Record<string, unknown>): AgentDetailRouteSearch {
  return {
    tab: search.tab === "archived" || search.tab === "overview"
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

const terminalOrganizationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  id: "terminal-org",
  component: OrganizationRoute,
});

const rootIndexRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/",
  component: OrganizationHomeRoute,
});

const organizationRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  id: "org",
  component: OrganizationRoute,
});

const organizationDashboardRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/"),
  component: DashboardPage,
});

const flagsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/flags",
  component: FlagsPage,
});

const modelProviderCredentialsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/model-provider-credentials"),
  component: ModelProviderCredentialsPage,
});

const agentsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/agents"),
  component: AgentsPage,
});

const environmentsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/environments"),
  component: EnvironmentsPage,
});

const environmentTerminalRoute = createRoute({
  getParentRoute: () => terminalOrganizationRoute,
  path: OrganizationPath.route("/environments/$environmentId/terminal"),
  component: EnvironmentTerminalPage,
});

const computeProvidersRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/compute-providers"),
  component: ComputeProviderDefinitionsPage,
});

const chatsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/chats"),
  validateSearch: validateChatsRouteSearch,
  component: ChatsPage,
});

const inboxRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/inbox"),
  component: InboxPage,
});

const conversationsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/conversations"),
  validateSearch: validateConversationsRouteSearch,
  component: ConversationsPage,
});

const routinesRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/routines"),
  component: RoutinesPage,
});

const workflowsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/workflows"),
  component: WorkflowsPage,
});

const workflowRunRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/workflows/$workflowId/runs/$runId"),
  component: WorkflowRunPage,
});

const secretsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/secrets"),
  component: SecretsPage,
});

const secretGroupsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/secret-groups"),
  component: SecretGroupsPage,
});

const mcpServersRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/mcp-servers"),
  component: McpServersPage,
});

const skillsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/skills"),
  component: SkillsPage,
});

const skillGroupsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/skill-groups"),
  component: SkillGroupsPage,
});

const githubInstallRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/github/install",
  component: GithubInstallCallbackPage,
});

const mcpOauthCallbackRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/mcp/oauth/callback",
  component: McpOauthCallbackPage,
});

const repositoriesRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/repositories"),
  component: RepositoriesPage,
});

const knowledgeBaseRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/knowledge-base"),
  component: KnowledgeBasePage,
});

const knowledgeBaseDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/knowledge-base/$artifactId"),
  component: KnowledgeBaseDetailPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/tasks"),
  validateSearch: validateTasksRouteSearch,
  component: TasksPage,
});

const taskDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/tasks/$taskId"),
  validateSearch: validateTaskDetailRouteSearch,
  component: TaskDetailPage,
});

const taskArtifactDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/tasks/$taskId/artifacts/$artifactId"),
  validateSearch: validateTaskArtifactDetailRouteSearch,
  component: ArtifactDetailPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/settings"),
  validateSearch: validateSettingsRouteSearch,
  component: SettingsPage,
});

const agentDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/agents/$agentId"),
  validateSearch: validateAgentDetailRouteSearch,
  component: AgentDetailPage,
});

const modelProviderCredentialDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/model-provider-credentials/$credentialId"),
  component: ModelProviderCredentialDetailPage,
});

const skillDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/skills/$skillId"),
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
      organizationRoute.addChildren([
        organizationDashboardRoute,
        flagsRoute,
        agentsRoute,
        environmentsRoute,
        computeProvidersRoute,
        chatsRoute,
        inboxRoute,
        conversationsRoute,
        routinesRoute,
        workflowsRoute,
        workflowRunRoute,
        secretsRoute,
        secretGroupsRoute,
        mcpServersRoute,
        skillsRoute,
        skillGroupsRoute,
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
      githubInstallRoute,
      mcpOauthCallbackRoute,
    ]),
    terminalOrganizationRoute.addChildren([
      environmentTerminalRoute,
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
