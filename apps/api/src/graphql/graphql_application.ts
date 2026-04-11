import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import GraphQLJSON from "graphql-type-json";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { RedisService } from "../services/redis/service.ts";
import { RedisCompanyScopedService } from "../services/redis/company_scoped_service.ts";
import { AgentEnvironmentTemplateService } from "../services/environments/template_service.ts";
import { AddAgentMutation } from "./mutations/add_agent.ts";
import { AddComputeProviderDefinitionMutation } from "./mutations/add_compute_provider_definition.ts";
import { AddGithubInstallationMutation } from "./mutations/add_github_installation.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { ArchiveArtifactMutation } from "./mutations/archive_artifact.ts";
import { AttachSecretToAgentMutation } from "./mutations/attach_secret_to_agent.ts";
import { AttachSkillGroupToAgentMutation } from "./mutations/attach_skill_group_to_agent.ts";
import { AttachSkillToAgentMutation } from "./mutations/attach_skill_to_agent.ts";
import { AttachSecretToSessionMutation } from "./mutations/attach_secret_to_session.ts";
import { ArchiveSessionMutation } from "./mutations/archive_session.ts";
import { CreateExternalLinkArtifactMutation } from "./mutations/create_external_link_artifact.ts";
import { CreateGithubInstallationUrlMutation } from "./mutations/create_github_installation_url.ts";
import { CreateMarkdownArtifactMutation } from "./mutations/create_markdown_artifact.ts";
import { CreatePullRequestArtifactMutation } from "./mutations/create_pull_request_artifact.ts";
import { CreateSecretMutation } from "./mutations/create_secret.ts";
import { CreateSessionMutation } from "./mutations/create_session.ts";
import { CreateSkillGroupMutation } from "./mutations/create_skill_group.ts";
import { CreateSkillMutation } from "./mutations/create_skill.ts";
import { CreateTaskCategoryMutation } from "./mutations/create_task_category.ts";
import { CreateTaskMutation } from "./mutations/create_task.ts";
import { DeleteAgentConversationMutation } from "./mutations/delete_agent_conversation.ts";
import { DeleteAgentMutation } from "./mutations/delete_agent.ts";
import { DeleteArtifactMutation } from "./mutations/delete_artifact.ts";
import { DeleteComputeProviderDefinitionMutation } from "./mutations/delete_compute_provider_definition.ts";
import { DeleteEnvironmentMutation } from "./mutations/delete_environment.ts";
import { DeleteGithubInstallationMutation } from "./mutations/delete_github_installation.ts";
import { DeleteModelProviderCredentialMutation } from "./mutations/delete_model_provider_credential.ts";
import { DeleteSecretMutation } from "./mutations/delete_secret.ts";
import { DeleteSessionQueuedMessageMutation } from "./mutations/delete_session_queued_message.ts";
import { DeleteSkillGroupMutation } from "./mutations/delete_skill_group.ts";
import { DeleteSkillMutation } from "./mutations/delete_skill.ts";
import { DeleteTaskCategoryMutation } from "./mutations/delete_task_category.ts";
import { DeleteTaskMutation } from "./mutations/delete_task.ts";
import { DismissInboxHumanQuestionMutation } from "./mutations/dismiss_inbox_human_question.ts";
import { DetachSecretFromAgentMutation } from "./mutations/detach_secret_from_agent.ts";
import { DetachSecretFromSessionMutation } from "./mutations/detach_secret_from_session.ts";
import { DetachSkillFromAgentMutation } from "./mutations/detach_skill_from_agent.ts";
import { DetachSkillGroupFromAgentMutation } from "./mutations/detach_skill_group_from_agent.ts";
import { ExecuteTaskMutation } from "./mutations/execute_task.ts";
import { ForkSessionMutation } from "./mutations/fork_session.ts";
import { GetEnvironmentVncUrlMutation } from "./mutations/get_environment_vnc_url.ts";
import { ImportGithubSkillsMutation } from "./mutations/import_github_skills.ts";
import { InterruptSessionMutation } from "./mutations/interrupt_session.ts";
import { MarkSessionReadMutation } from "./mutations/mark_session_read.ts";
import { PromptSessionMutation } from "./mutations/prompt_session.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "./mutations/refresh_github_installation_repositories.ts";
import { RefreshModelProviderCredentialModelsMutation } from "./mutations/refresh_model_provider_credential_models.ts";
import { RefreshModelProviderCredentialTokenMutation } from "./mutations/refresh_model_provider_credential_token.ts";
import { ResolveInboxHumanQuestionMutation } from "./mutations/resolve_inbox_human_question.ts";
import { SetDefaultComputeProviderDefinitionMutation } from "./mutations/set_default_compute_provider_definition.ts";
import { SetDefaultModelProviderCredentialMutation } from "./mutations/set_default_model_provider_credential.ts";
import { SetDefaultModelProviderCredentialModelMutation } from "./mutations/set_default_model_provider_credential_model.ts";
import { SetTaskCategoryMutation } from "./mutations/set_task_category.ts";
import { StartEnvironmentMutation } from "./mutations/start_environment.ts";
import { SteerSessionQueuedMessageMutation } from "./mutations/steer_session_queued_message.ts";
import { StopEnvironmentMutation } from "./mutations/stop_environment.ts";
import { UpdateAgentMutation } from "./mutations/update_agent.ts";
import { UpdateArtifactMutation } from "./mutations/update_artifact.ts";
import { UpdateCompanySettingsMutation } from "./mutations/update_company_settings.ts";
import { UpdateComputeProviderDefinitionMutation } from "./mutations/update_compute_provider_definition.ts";
import { UpdateExternalLinkArtifactMutation } from "./mutations/update_external_link_artifact.ts";
import { UpdateMarkdownArtifactMutation } from "./mutations/update_markdown_artifact.ts";
import { UpdateSecretMutation } from "./mutations/update_secret.ts";
import { UpdateSessionTitleMutation } from "./mutations/update_session_title.ts";
import { UpdateSkillMutation } from "./mutations/update_skill.ts";
import { UpdateSkillGroupMutation } from "./mutations/update_skill_group.ts";
import { UpdateTaskMutation } from "./mutations/update_task.ts";
import { AgentQueryResolver } from "./resolvers/agent.ts";
import { AgentConversationMessagesQueryResolver } from "./resolvers/agent_conversation_messages.ts";
import { AgentConversationsQueryResolver } from "./resolvers/agent_conversations.ts";
import { AgentCreateOptionsQueryResolver } from "./resolvers/agent_create_options.ts";
import { AgentEnvironmentTemplateResolver } from "./resolvers/agent_environment_template.ts";
import { AgentSecretsQueryResolver } from "./resolvers/agent_secrets.ts";
import { AgentSkillGroupsQueryResolver } from "./resolvers/agent_skill_groups.ts";
import { AgentSkillsQueryResolver } from "./resolvers/agent_skills.ts";
import { AgentsQueryResolver } from "./resolvers/agents.ts";
import { ArtifactQueryResolver } from "./resolvers/artifact.ts";
import { ArtifactsQueryResolver } from "./resolvers/artifacts.ts";
import { CompanySettingsQueryResolver } from "./resolvers/company_settings.ts";
import { ComputeProviderDefinitionTemplatesResolver } from "./resolvers/compute_provider_definition_templates.ts";
import { ComputeProviderDefinitionsQueryResolver } from "./resolvers/compute_provider_definitions.ts";
import { EnvironmentsQueryResolver } from "./resolvers/environments.ts";
import { GithubAppConfigQueryResolver } from "./resolvers/github_app_config.ts";
import { GithubDiscoveredSkillsQueryResolver } from "./resolvers/github_discovered_skills.ts";
import { GithubInstallationsQueryResolver } from "./resolvers/github_installations.ts";
import { GithubRepositoriesQueryResolver } from "./resolvers/github_repositories.ts";
import { GithubSkillBranchesQueryResolver } from "./resolvers/github_skill_branches.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { InboxHumanQuestionsQueryResolver } from "./resolvers/inbox_human_questions.ts";
import { InboxHumanQuestionsUpdatedSubscriptionResolver } from "./resolvers/inbox_human_questions_updated.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "./resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "./resolvers/model_providers.ts";
import { SecretsQueryResolver } from "./resolvers/secrets.ts";
import { SessionEnvironmentQueryResolver } from "./resolvers/session_environment.ts";
import { SessionInboxHumanQuestionsUpdatedSubscriptionResolver } from "./resolvers/session_inbox_human_questions_updated.ts";
import { SessionMessageUpdatedSubscriptionResolver } from "./resolvers/session_message_updated.ts";
import { SessionMessagesQueryResolver } from "./resolvers/session_messages.ts";
import { SessionQueuedMessagesQueryResolver } from "./resolvers/session_queued_messages.ts";
import { SessionQueuedMessagesUpdatedSubscriptionResolver } from "./resolvers/session_queued_messages_updated.ts";
import { SessionSecretsQueryResolver } from "./resolvers/session_secrets.ts";
import { SessionsQueryResolver } from "./resolvers/sessions.ts";
import { SessionTranscriptMessagesQueryResolver } from "./resolvers/session_transcript_messages.ts";
import { SessionUpdatedSubscriptionResolver } from "./resolvers/session_updated.ts";
import { SkillGroupsQueryResolver } from "./resolvers/skill_groups.ts";
import { SkillQueryResolver } from "./resolvers/skill.ts";
import { SkillsQueryResolver } from "./resolvers/skills.ts";
import { TaskAssignableUsersQueryResolver } from "./resolvers/task_assignable_users.ts";
import { TaskCategoriesQueryResolver } from "./resolvers/task_categories.ts";
import { TaskQueryResolver } from "./resolvers/task.ts";
import { TaskRunsQueryResolver } from "./resolvers/task_runs.ts";
import { TasksQueryResolver } from "./resolvers/tasks.ts";
import {
  GraphqlErrorLogger,
  type GraphqlExecutionContext,
  type GraphqlExecutionResult,
} from "./error_logger.ts";
import type { GraphqlRequestContext } from "./graphql_request_context.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlResolverRegistry } from "./registries/graphql_resolver_registry.ts";
import { AgentGraphqlRegistry } from "./registries/agent_graphql_registry.ts";
import { ArtifactGraphqlRegistry } from "./registries/artifact_graphql_registry.ts";
import { ConversationGraphqlRegistry } from "./registries/conversation_graphql_registry.ts";
import { EnvironmentGraphqlRegistry } from "./registries/environment_graphql_registry.ts";
import { ManagementGraphqlRegistry } from "./registries/management_graphql_registry.ts";
import { TaskGraphqlRegistry } from "./registries/task_graphql_registry.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";

type ResolverExecutorLike = {
  execute: (...arguments_: unknown[]) => unknown;
};

/**
 * Registers the Fastify GraphQL transport and delegates resolver ownership to grouped domain
 * registries instead of wiring the entire schema in one class.
 */
@injectable()
export class GraphqlApplication {
  private static readonly SUBSCRIPTION_KEEP_ALIVE_MILLISECONDS = 30_000;

  constructor(
    @inject(Config) private readonly configDocument: Config,
    @inject(GraphqlRequestContextResolver)
    private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver,
    @inject(GraphqlResolverRegistry)
    private readonly graphqlResolverRegistry: GraphqlResolverRegistry,
    @inject(RedisService)
    private readonly redisService: RedisService = new RedisService(configDocument, new ApiLogger(configDocument)),
    @inject(GraphqlErrorLogger)
    private readonly graphqlErrorLogger: GraphqlErrorLogger = new GraphqlErrorLogger(),
  ) {}

  /**
   * Preserves the long-standing positional test factory API while routing those dependencies
   * through the new domain registries.
   */
  static fromResolvers(
    config: Config,
    addModelProviderCredentialMutation: AddModelProviderCredentialMutation,
    deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation,
    refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation,
    graphqlRequestContextResolver: GraphqlRequestContextResolver,
    healthQueryResolver: HealthQueryResolver,
    meQueryResolver: MeQueryResolver,
    modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver,
    modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver,
    addAgentMutation?: AddAgentMutation,
    createSessionMutation?: CreateSessionMutation,
    agentConversationsQueryResolver?: AgentConversationsQueryResolver,
    agentConversationMessagesQueryResolver?: AgentConversationMessagesQueryResolver,
    agentQueryResolver?: AgentQueryResolver,
    agentCreateOptionsQueryResolver?: AgentCreateOptionsQueryResolver,
    agentsQueryResolver?: AgentsQueryResolver,
    deleteAgentMutation?: DeleteAgentMutation,
    deleteEnvironmentMutation?: DeleteEnvironmentMutation,
    startEnvironmentMutation?: StartEnvironmentMutation,
    stopEnvironmentMutation?: StopEnvironmentMutation,
    modelProvidersQueryResolver?: ModelProvidersQueryResolver,
    updateAgentMutation?: UpdateAgentMutation,
    sessionMessagesQueryResolver?: SessionMessagesQueryResolver,
    sessionTranscriptMessagesQueryResolver?: SessionTranscriptMessagesQueryResolver,
    sessionsQueryResolver?: SessionsQueryResolver,
    archiveSessionMutation?: ArchiveSessionMutation,
    sessionMessageUpdatedSubscriptionResolver?: SessionMessageUpdatedSubscriptionResolver,
    sessionUpdatedSubscriptionResolver?: SessionUpdatedSubscriptionResolver,
    promptSessionMutation?: PromptSessionMutation,
    redisService?: RedisService,
    createTaskMutation?: CreateTaskMutation,
    createTaskCategoryMutation?: CreateTaskCategoryMutation,
    setTaskCategoryMutation?: SetTaskCategoryMutation,
    taskAssignableUsersQueryResolver?: TaskAssignableUsersQueryResolver,
    taskCategoriesQueryResolver?: TaskCategoriesQueryResolver,
    tasksQueryResolver?: TasksQueryResolver,
    companySettingsQueryResolver?: CompanySettingsQueryResolver,
    githubAppConfigQueryResolver?: GithubAppConfigQueryResolver,
    githubInstallationsQueryResolver?: GithubInstallationsQueryResolver,
    githubRepositoriesQueryResolver?: GithubRepositoriesQueryResolver,
    createGithubInstallationUrlMutation?: CreateGithubInstallationUrlMutation,
    addGithubInstallationMutation?: AddGithubInstallationMutation,
    deleteGithubInstallationMutation?: DeleteGithubInstallationMutation,
    deleteSessionQueuedMessageMutation?: DeleteSessionQueuedMessageMutation,
    deleteTaskMutation?: DeleteTaskMutation,
    dismissInboxHumanQuestionMutation?: DismissInboxHumanQuestionMutation,
    refreshGithubInstallationRepositoriesMutation?: RefreshGithubInstallationRepositoriesMutation,
    environmentsQueryResolver?: EnvironmentsQueryResolver,
    attachSecretToAgentMutation?: AttachSecretToAgentMutation,
    attachSkillGroupToAgentMutation?: AttachSkillGroupToAgentMutation,
    attachSkillToAgentMutation?: AttachSkillToAgentMutation,
    attachSecretToSessionMutation?: AttachSecretToSessionMutation,
    createSecretMutation?: CreateSecretMutation,
    deleteSecretMutation?: DeleteSecretMutation,
    detachSecretFromAgentMutation?: DetachSecretFromAgentMutation,
    detachSkillGroupFromAgentMutation?: DetachSkillGroupFromAgentMutation,
    detachSkillFromAgentMutation?: DetachSkillFromAgentMutation,
    updateSecretMutation?: UpdateSecretMutation,
    detachSecretFromSessionMutation?: DetachSecretFromSessionMutation,
    agentSecretsQueryResolver?: AgentSecretsQueryResolver,
    agentSkillGroupsQueryResolver?: AgentSkillGroupsQueryResolver,
    agentSkillsQueryResolver?: AgentSkillsQueryResolver,
    secretsQueryResolver?: SecretsQueryResolver,
    sessionSecretsQueryResolver?: SessionSecretsQueryResolver,
    agentEnvironmentTemplateService?: AgentEnvironmentTemplateService,
    addComputeProviderDefinitionMutation?: AddComputeProviderDefinitionMutation,
    deleteComputeProviderDefinitionMutation?: DeleteComputeProviderDefinitionMutation,
    updateComputeProviderDefinitionMutation?: UpdateComputeProviderDefinitionMutation,
    computeProviderDefinitionsQueryResolver?: ComputeProviderDefinitionsQueryResolver,
    sessionEnvironmentQueryResolver?: SessionEnvironmentQueryResolver,
    steerSessionQueuedMessageMutation?: SteerSessionQueuedMessageMutation,
    inboxHumanQuestionsQueryResolver?: InboxHumanQuestionsQueryResolver,
    resolveInboxHumanQuestionMutation?: ResolveInboxHumanQuestionMutation,
    sessionQueuedMessagesQueryResolver?: SessionQueuedMessagesQueryResolver,
    sessionQueuedMessagesUpdatedSubscriptionResolver?: SessionQueuedMessagesUpdatedSubscriptionResolver,
    artifactQueryResolver?: ArtifactQueryResolver,
    artifactsQueryResolver?: ArtifactsQueryResolver,
    createMarkdownArtifactMutation?: CreateMarkdownArtifactMutation,
    createExternalLinkArtifactMutation?: CreateExternalLinkArtifactMutation,
    createPullRequestArtifactMutation?: CreatePullRequestArtifactMutation,
    deleteArtifactMutation?: DeleteArtifactMutation,
    updateArtifactMutation?: UpdateArtifactMutation,
    updateMarkdownArtifactMutation?: UpdateMarkdownArtifactMutation,
    updateExternalLinkArtifactMutation?: UpdateExternalLinkArtifactMutation,
    archiveArtifactMutation?: ArchiveArtifactMutation,
    updateCompanySettingsMutation?: UpdateCompanySettingsMutation,
    markSessionReadMutation?: MarkSessionReadMutation,
    taskQueryResolver?: TaskQueryResolver,
    updateTaskMutation?: UpdateTaskMutation,
    taskRunsQueryResolver?: TaskRunsQueryResolver,
    executeTaskMutation?: ExecuteTaskMutation,
    updateSessionTitleMutation?: UpdateSessionTitleMutation,
    interruptSessionMutation?: InterruptSessionMutation,
    deleteTaskCategoryMutation?: DeleteTaskCategoryMutation,
    graphqlErrorLogger?: GraphqlErrorLogger,
    setDefaultComputeProviderDefinitionMutation?: SetDefaultComputeProviderDefinitionMutation,
    setDefaultModelProviderCredentialMutation?: SetDefaultModelProviderCredentialMutation,
    refreshModelProviderCredentialTokenMutation?: RefreshModelProviderCredentialTokenMutation,
    setDefaultModelProviderCredentialModelMutation?: SetDefaultModelProviderCredentialModelMutation,
    agentEnvironmentTemplateResolver?: AgentEnvironmentTemplateResolver,
    computeProviderDefinitionTemplatesResolver?: ComputeProviderDefinitionTemplatesResolver,
    getEnvironmentVncUrlMutation?: GetEnvironmentVncUrlMutation,
    forkSessionMutation?: ForkSessionMutation,
    createSkillMutation?: CreateSkillMutation,
    updateSkillMutation?: UpdateSkillMutation,
    skillGroupsQueryResolver?: SkillGroupsQueryResolver,
    skillQueryResolver?: SkillQueryResolver,
    skillsQueryResolver?: SkillsQueryResolver,
    createSkillGroupMutation?: CreateSkillGroupMutation,
    deleteSkillMutation?: DeleteSkillMutation,
    deleteSkillGroupMutation?: DeleteSkillGroupMutation,
    sessionInboxHumanQuestionsUpdatedSubscriptionResolver?: SessionInboxHumanQuestionsUpdatedSubscriptionResolver,
    inboxHumanQuestionsUpdatedSubscriptionResolver?: InboxHumanQuestionsUpdatedSubscriptionResolver,
    deleteAgentConversationMutation?: DeleteAgentConversationMutation,
    githubSkillBranchesQueryResolver?: GithubSkillBranchesQueryResolver,
    githubDiscoveredSkillsQueryResolver?: GithubDiscoveredSkillsQueryResolver,
    importGithubSkillsMutation?: ImportGithubSkillsMutation,
    updateSkillGroupMutation?: UpdateSkillGroupMutation,
  ): GraphqlApplication {
    const resolvedRedisService = redisService ?? GraphqlApplication.createFallbackRedisService(config);
    const resolvedGraphqlErrorLogger = graphqlErrorLogger ?? new GraphqlErrorLogger();
    const agentGraphqlRegistry = new AgentGraphqlRegistry(
      config,
      addAgentMutation,
      agentQueryResolver,
      agentCreateOptionsQueryResolver,
      agentsQueryResolver,
      deleteAgentMutation,
      updateAgentMutation,
      attachSecretToAgentMutation,
      attachSkillGroupToAgentMutation,
      attachSkillToAgentMutation,
      detachSecretFromAgentMutation,
      detachSkillGroupFromAgentMutation,
      detachSkillFromAgentMutation,
      agentSecretsQueryResolver,
      agentSkillGroupsQueryResolver,
      agentSkillsQueryResolver,
      agentEnvironmentTemplateService,
      agentEnvironmentTemplateResolver,
    );
    const artifactGraphqlRegistry = new ArtifactGraphqlRegistry(
      artifactQueryResolver,
      artifactsQueryResolver,
      createMarkdownArtifactMutation,
      createExternalLinkArtifactMutation,
      createPullRequestArtifactMutation,
      deleteArtifactMutation,
      updateArtifactMutation,
      updateMarkdownArtifactMutation,
      updateExternalLinkArtifactMutation,
      archiveArtifactMutation,
    );
    const conversationGraphqlRegistry = new ConversationGraphqlRegistry(
      config,
      agentConversationsQueryResolver,
      agentConversationMessagesQueryResolver,
      createSessionMutation,
      archiveSessionMutation,
      deleteAgentConversationMutation,
      deleteSessionQueuedMessageMutation,
      dismissInboxHumanQuestionMutation,
      forkSessionMutation,
      inboxHumanQuestionsQueryResolver,
      inboxHumanQuestionsUpdatedSubscriptionResolver,
      interruptSessionMutation,
      markSessionReadMutation,
      promptSessionMutation,
      resolveInboxHumanQuestionMutation,
      sessionMessagesQueryResolver,
      sessionInboxHumanQuestionsUpdatedSubscriptionResolver,
      sessionQueuedMessagesQueryResolver,
      sessionMessageUpdatedSubscriptionResolver,
      sessionQueuedMessagesUpdatedSubscriptionResolver,
      sessionSecretsQueryResolver,
      sessionTranscriptMessagesQueryResolver,
      sessionsQueryResolver,
      sessionUpdatedSubscriptionResolver,
      steerSessionQueuedMessageMutation,
      updateSessionTitleMutation,
      attachSecretToSessionMutation,
      detachSecretFromSessionMutation,
    );
    const environmentGraphqlRegistry = new EnvironmentGraphqlRegistry(
      addModelProviderCredentialMutation,
      deleteModelProviderCredentialMutation,
      refreshModelProviderCredentialModelsMutation,
      modelProviderCredentialModelsQueryResolver,
      modelProviderCredentialsQueryResolver,
      deleteEnvironmentMutation,
      startEnvironmentMutation,
      stopEnvironmentMutation,
      modelProvidersQueryResolver,
      addComputeProviderDefinitionMutation,
      deleteComputeProviderDefinitionMutation,
      updateComputeProviderDefinitionMutation,
      computeProviderDefinitionsQueryResolver,
      sessionEnvironmentQueryResolver,
      environmentsQueryResolver,
      agentEnvironmentTemplateService,
      computeProviderDefinitionTemplatesResolver,
      getEnvironmentVncUrlMutation,
      setDefaultComputeProviderDefinitionMutation,
      setDefaultModelProviderCredentialMutation,
      refreshModelProviderCredentialTokenMutation,
      setDefaultModelProviderCredentialModelMutation,
    );
    const managementGraphqlRegistry = new ManagementGraphqlRegistry(
      config,
      healthQueryResolver,
      meQueryResolver,
      companySettingsQueryResolver,
      githubAppConfigQueryResolver,
      githubInstallationsQueryResolver,
      githubRepositoriesQueryResolver,
      createGithubInstallationUrlMutation,
      addGithubInstallationMutation,
      deleteGithubInstallationMutation,
      refreshGithubInstallationRepositoriesMutation,
      createSecretMutation,
      deleteSecretMutation,
      updateSecretMutation,
      secretsQueryResolver,
      updateCompanySettingsMutation,
      createSkillMutation,
      updateSkillMutation,
      skillGroupsQueryResolver,
      skillQueryResolver,
      skillsQueryResolver,
      createSkillGroupMutation,
      deleteSkillMutation,
      deleteSkillGroupMutation,
      githubSkillBranchesQueryResolver,
      githubDiscoveredSkillsQueryResolver,
      importGithubSkillsMutation,
      updateSkillGroupMutation,
    );
    const taskGraphqlRegistry = new TaskGraphqlRegistry(
      createTaskMutation,
      createTaskCategoryMutation,
      setTaskCategoryMutation,
      taskAssignableUsersQueryResolver,
      taskCategoriesQueryResolver,
      tasksQueryResolver,
      deleteTaskMutation,
      deleteTaskCategoryMutation,
      taskQueryResolver,
      updateTaskMutation,
      taskRunsQueryResolver,
      executeTaskMutation,
    );

    return new GraphqlApplication(
      config,
      graphqlRequestContextResolver,
      new GraphqlResolverRegistry(
        agentGraphqlRegistry,
        artifactGraphqlRegistry,
        conversationGraphqlRegistry,
        environmentGraphqlRegistry,
        managementGraphqlRegistry,
        taskGraphqlRegistry,
      ),
      resolvedRedisService,
      resolvedGraphqlErrorLogger,
    );
  }

  async register(app: FastifyInstance): Promise<void> {
    const graphqlPluginOptions = {
      errorFormatter: (execution: GraphqlExecutionResult, context: GraphqlExecutionContext) =>
        this.graphqlErrorLogger.logAndFormat(execution, context),
      schema: GraphqlSchema.getDocument(),
      context: (
        request: Parameters<GraphqlRequestContextResolver["resolve"]>[0],
      ) => this.graphqlRequestContextResolver.resolve(request),
      subscription: {
        keepAlive: GraphqlApplication.SUBSCRIPTION_KEEP_ALIVE_MILLISECONDS,
        context: async (
          _socket: unknown,
          request: Parameters<GraphqlRequestContextResolver["resolve"]>[0],
        ): Promise<GraphqlRequestContext> => {
          let resolvedContextPromise: Promise<GraphqlRequestContext> | null = null;

          return {
            authSession: null,
            app_runtime_transaction_provider: null,
            redisCompanyScopedService: null,
            resolveSubscriptionContext: async () => {
              if (resolvedContextPromise) {
                return resolvedContextPromise;
              }

              resolvedContextPromise = this.graphqlRequestContextResolver.resolve(request).then((baseContext) => {
                if (!baseContext.authSession?.company) {
                  return baseContext;
                }

                return {
                  ...baseContext,
                  redisCompanyScopedService: new RedisCompanyScopedService(
                    baseContext.authSession.company.id,
                    this.redisService,
                  ),
                };
              });

              return resolvedContextPromise;
            },
          };
        },
        onConnect: () => true,
        onDisconnect: async (context: GraphqlRequestContext) => {
          const resolvedContext = await context.resolveSubscriptionContext?.();
          await resolvedContext?.redisCompanyScopedService?.disconnect();
        },
      },
      resolvers: {
        JSON: GraphQLJSON,
        ...this.graphqlResolverRegistry.createResolvers(),
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    };

    await app.register(mercurius as never, graphqlPluginOptions as never);
  }

  private get agentEnvironmentTemplateResolver(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getAgentGraphqlRegistry().getAgentEnvironmentTemplateResolver();
  }

  private set agentEnvironmentTemplateResolver(agentEnvironmentTemplateResolver: ResolverExecutorLike) {
    this.graphqlResolverRegistry
      .getAgentGraphqlRegistry()
      .setAgentEnvironmentTemplateResolver(agentEnvironmentTemplateResolver);
  }

  private get archiveSessionMutation(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getConversationGraphqlRegistry().getArchiveSessionMutation();
  }

  private set archiveSessionMutation(archiveSessionMutation: ResolverExecutorLike) {
    this.graphqlResolverRegistry.getConversationGraphqlRegistry().setArchiveSessionMutation(archiveSessionMutation);
  }

  private get deleteEnvironmentMutation(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getEnvironmentGraphqlRegistry().getDeleteEnvironmentMutation();
  }

  private set deleteEnvironmentMutation(deleteEnvironmentMutation: ResolverExecutorLike) {
    this.graphqlResolverRegistry
      .getEnvironmentGraphqlRegistry()
      .setDeleteEnvironmentMutation(deleteEnvironmentMutation);
  }

  private get environmentsQueryResolver(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getEnvironmentGraphqlRegistry().getEnvironmentsQueryResolver();
  }

  private set environmentsQueryResolver(environmentsQueryResolver: ResolverExecutorLike) {
    this.graphqlResolverRegistry
      .getEnvironmentGraphqlRegistry()
      .setEnvironmentsQueryResolver(environmentsQueryResolver);
  }

  private get getEnvironmentVncUrlMutation(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getEnvironmentGraphqlRegistry().getGetEnvironmentVncUrlMutation();
  }

  private set getEnvironmentVncUrlMutation(getEnvironmentVncUrlMutation: ResolverExecutorLike) {
    this.graphqlResolverRegistry
      .getEnvironmentGraphqlRegistry()
      .setGetEnvironmentVncUrlMutation(getEnvironmentVncUrlMutation);
  }

  private get startEnvironmentMutation(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getEnvironmentGraphqlRegistry().getStartEnvironmentMutation();
  }

  private set startEnvironmentMutation(startEnvironmentMutation: ResolverExecutorLike) {
    this.graphqlResolverRegistry
      .getEnvironmentGraphqlRegistry()
      .setStartEnvironmentMutation(startEnvironmentMutation);
  }

  private get stopEnvironmentMutation(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getEnvironmentGraphqlRegistry().getStopEnvironmentMutation();
  }

  private set stopEnvironmentMutation(stopEnvironmentMutation: ResolverExecutorLike) {
    this.graphqlResolverRegistry
      .getEnvironmentGraphqlRegistry()
      .setStopEnvironmentMutation(stopEnvironmentMutation);
  }

  private get updateSessionTitleMutation(): ResolverExecutorLike {
    return this.graphqlResolverRegistry.getConversationGraphqlRegistry().getUpdateSessionTitleMutation();
  }

  private set updateSessionTitleMutation(updateSessionTitleMutation: ResolverExecutorLike) {
    this.graphqlResolverRegistry
      .getConversationGraphqlRegistry()
      .setUpdateSessionTitleMutation(updateSessionTitleMutation);
  }

  private static createFallbackRedisService(config: Config): RedisService {
    if (config.log && config.redis) {
      return new RedisService(config, new ApiLogger(config));
    }

    return {
      async getClient() {
        throw new Error("Redis service is not configured.");
      },
      async getSubscriberClient() {
        throw new Error("Redis service is not configured.");
      },
    } as never;
  }
}
