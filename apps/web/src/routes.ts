import { createElement } from "react";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AgentDetailPage } from "./pages/agents/agent_detail_page";
import { AgentsPage } from "./pages/agents/agents_page";
import { AdminCompaniesPage } from "./pages/admin/companies_page";
import { AdminCompanyDetailPage } from "./pages/admin/company_detail_page";
import { AdminCompanyWalletDetailPage } from "./pages/admin/company_wallet_detail_page";
import { AdminCompanyWalletsPage } from "./pages/admin/company_wallets_page";
import { AdminDashboardPage } from "./pages/admin/dashboard_page";
import { AdminLlmCredentialDetailPage } from "./pages/admin/llm_credential_detail_page";
import { AdminLlmCredentialsPage } from "./pages/admin/llm_credentials_page";
import { AdminModelDetailPage } from "./pages/admin/model_detail_page";
import { AdminModelsPage } from "./pages/admin/models_page";
import { AdminUsersPage } from "./pages/admin/users_page";
import { CompaniesRoute } from "./pages/auth/companies_route";
import { CompanyCreationPage } from "./pages/company_creation_page";
import { AuthenticationRoute } from "./pages/auth/route";
import { ChatsPage } from "./pages/chats/chats_page";
import { ComputeProviderDefinitionsPage } from "./pages/compute-providers/compute_provider_definitions_page";
import { ConversationsPage } from "./pages/conversations/conversations_page";
import { DashboardPage } from "./pages/dashboard/dashboard_page";
import { EnvironmentDetailPage } from "./pages/environments/environment_detail_page";
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
import { CreateAgentsPage } from "./pages/onboarding/create_agents_page";
import { GithubPage } from "./pages/onboarding/github_page";
import { MissionPage } from "./pages/onboarding/mission_page";
import { ModelProviderPage } from "./pages/onboarding/model_provider_page";
import { OnboardingPage } from "./pages/onboarding/onboarding_page";
import { GithubInstallCallbackPage } from "./pages/repositories/github_install_callback_page";
import { RepositoriesPage } from "./pages/repositories/repositories_page";
import { SecretsPage } from "./pages/secrets/secrets_page";
import { SecretGroupsPage } from "./pages/secret-groups/secret_groups_page";
import { SkillGroupsPage } from "./pages/skill-groups/skill_groups_page";
import { SkillDetailPage } from "./pages/skills/skill_detail_page";
import { SkillsPage } from "./pages/skills/skills_page";
import { SettingsPage } from "./pages/settings/settings_page";
import { ArtifactDetailPage } from "./pages/tasks/artifact_detail_page";
import { TaskDetailPage } from "./pages/tasks/task_detail_page";
import { TasksPage } from "./pages/tasks/tasks_page";
import { UsagePage } from "./pages/usage/usage_page";
import { WorkflowDetailPage } from "./pages/workflows/workflow_detail_page";
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
  tab?: "archived" | "instructions" | "overview" | "skills" | "usage";
};

type ModelProviderCredentialDetailRouteSearch = {
  tab?: "limit" | "models" | "usage";
};

type AdminLlmCredentialDetailRouteSearch = {
  tab?: "limit" | "models";
};

type WorkflowDetailRouteSearch = {
  tab?: "overview" | "runs";
};

type SkillDetailRouteSearch = {
  tab?: "overview" | "source";
};

type EnvironmentDetailRouteSearch = {
  tab?: "metrics" | "overview";
};

type ConversationsRouteSearch = {
  conversationId?: string;
};

type SettingsRouteSearch = {
  tab?: "tasks" | "AI" | "company" | "billing" | "members";
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
    tab: search.tab === "archived"
      || search.tab === "instructions"
      || search.tab === "overview"
      || search.tab === "skills"
      || search.tab === "usage"
      ? search.tab
      : undefined,
  };
}

function validateModelProviderCredentialDetailRouteSearch(
  search: Record<string, unknown>,
): ModelProviderCredentialDetailRouteSearch {
  return {
    tab: search.tab === "limit" || search.tab === "usage" || search.tab === "models"
      ? search.tab
      : undefined,
  };
}

function validateAdminLlmCredentialDetailRouteSearch(
  search: Record<string, unknown>,
): AdminLlmCredentialDetailRouteSearch {
  return {
    tab: search.tab === "limit" || search.tab === "models"
      ? search.tab
      : undefined,
  };
}

function validateWorkflowDetailRouteSearch(search: Record<string, unknown>): WorkflowDetailRouteSearch {
  return {
    tab: search.tab === "overview" || search.tab === "runs"
      ? search.tab
      : undefined,
  };
}

function validateSkillDetailRouteSearch(search: Record<string, unknown>): SkillDetailRouteSearch {
  return {
    tab: search.tab === "overview" || search.tab === "source"
      ? search.tab
      : undefined,
  };
}

function validateEnvironmentDetailRouteSearch(search: Record<string, unknown>): EnvironmentDetailRouteSearch {
  return {
    tab: search.tab === "metrics" || search.tab === "overview"
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

  if (search.tab === "company") {
    return {
      tab: "company",
    };
  }

  if (search.tab === "billing") {
    return {
      tab: "billing",
    };
  }

  if (search.tab === "members") {
    return {
      tab: "members",
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

function CompaniesAuthRoute() {
  return createElement(CompaniesRoute);
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

const adminDashboardRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/admin",
  component: AdminDashboardPage,
});

const adminUsersRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/admin/users",
  component: AdminUsersPage,
});

const adminCompaniesRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/admin/companies",
  component: Outlet,
});

const adminCompaniesIndexRoute = createRoute({
  getParentRoute: () => adminCompaniesRoute,
  path: "/",
  component: AdminCompaniesPage,
});

const adminCompanyDetailRoute = createRoute({
  getParentRoute: () => adminCompaniesRoute,
  path: "$companyId" as string,
  component: AdminCompanyDetailPage,
});

const adminCompanyWalletsRoute = createRoute({
  getParentRoute: () => adminCompaniesRoute,
  path: "$companyId/wallets" as string,
  component: AdminCompanyWalletsPage,
});

const adminCompanyWalletDetailRoute = createRoute({
  getParentRoute: () => adminCompaniesRoute,
  path: "$companyId/wallets/$walletId" as string,
  component: AdminCompanyWalletDetailPage,
});

const adminModelsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/admin/models",
  component: Outlet,
});

const adminModelsIndexRoute = createRoute({
  getParentRoute: () => adminModelsRoute,
  path: "/",
  component: AdminModelsPage,
});

const adminModelDetailRoute = createRoute({
  getParentRoute: () => adminModelsRoute,
  path: "$platformModelId" as string,
  component: AdminModelDetailPage,
});

const adminLlmCredentialsRoute = createRoute({
  getParentRoute: () => pageContainerRoute,
  path: "/admin/llm-credentials",
  component: Outlet,
});

const adminLlmCredentialsIndexRoute = createRoute({
  getParentRoute: () => adminLlmCredentialsRoute,
  path: "/",
  component: AdminLlmCredentialsPage,
});

const adminLlmCredentialModelsRoute = createRoute({
  getParentRoute: () => adminLlmCredentialsRoute,
  path: "$platformCredentialId" as string,
  validateSearch: validateAdminLlmCredentialDetailRouteSearch,
  component: AdminLlmCredentialDetailPage,
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

const environmentDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/environments/$environmentId"),
  validateSearch: validateEnvironmentDetailRouteSearch,
  component: EnvironmentDetailPage,
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

const onboardingRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/onboarding"),
  component: OnboardingPage,
});

const onboardingMissionRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/onboarding/mission"),
  component: MissionPage,
});

const onboardingGithubRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/onboarding/github"),
  component: GithubPage,
});

const onboardingModelProviderRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/onboarding/model-provider"),
  component: ModelProviderPage,
});

const onboardingCreateAgentsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/onboarding/create-agents"),
  component: CreateAgentsPage,
});

const inboxRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/inbox"),
  component: InboxPage,
});

const usageRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/usage"),
  component: UsagePage,
});

const conversationsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/conversations"),
  validateSearch: validateConversationsRouteSearch,
  component: ConversationsPage,
});

const workflowsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/workflows"),
  component: WorkflowsPage,
});

const workflowDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/workflows/$workflowId"),
  validateSearch: validateWorkflowDetailRouteSearch,
  component: WorkflowDetailPage,
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
  validateSearch: validateModelProviderCredentialDetailRouteSearch,
  component: ModelProviderCredentialDetailPage,
});

const skillDetailRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: OrganizationPath.route("/skills/$skillId"),
  validateSearch: validateSkillDetailRouteSearch,
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

const companiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/companies",
  component: CompaniesAuthRoute,
});

const companyCreationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: "/companies/new",
  component: CompanyCreationPage,
});

const routeTree = rootRoute.addChildren([
  authenticatedRoute.addChildren([
    pageContainerRoute.addChildren([
      rootIndexRoute,
      adminDashboardRoute,
      adminUsersRoute,
      adminCompaniesRoute.addChildren([
        adminCompaniesIndexRoute,
        adminCompanyDetailRoute,
        adminCompanyWalletsRoute,
        adminCompanyWalletDetailRoute,
      ]),
      adminModelsRoute.addChildren([
        adminModelsIndexRoute,
        adminModelDetailRoute,
      ]),
      adminLlmCredentialsRoute.addChildren([
        adminLlmCredentialsIndexRoute,
        adminLlmCredentialModelsRoute,
      ]),
      organizationRoute.addChildren([
        organizationDashboardRoute,
        flagsRoute,
        agentsRoute,
        environmentsRoute,
        environmentDetailRoute,
        computeProvidersRoute,
        chatsRoute,
        onboardingRoute,
        onboardingMissionRoute,
        onboardingGithubRoute,
        onboardingModelProviderRoute,
        onboardingCreateAgentsRoute,
        inboxRoute,
        usageRoute,
        conversationsRoute,
        workflowsRoute,
        workflowDetailRoute,
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
    companyCreationRoute,
  ]),
  signInRoute,
  signUpRoute,
  companiesRoute,
]);

export const applicationRouter = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof applicationRouter;
  }
}
