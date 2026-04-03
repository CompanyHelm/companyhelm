import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import GraphQLJSON from "graphql-type-json";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { GithubClient } from "../github/client.ts";
import { SecretEncryptionService } from "../services/secrets/encryption.ts";
import { SecretService } from "../services/secrets/service.ts";
import { RedisService } from "../services/redis/service.ts";
import { RedisCompanyScopedService } from "../services/redis/company_scoped_service.ts";
import { AddAgentMutation } from "./mutations/add_agent.ts";
import { AddComputeProviderDefinitionMutation } from "./mutations/add_compute_provider_definition.ts";
import { AddGithubInstallationMutation } from "./mutations/add_github_installation.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { ArchiveArtifactMutation } from "./mutations/archive_artifact.ts";
import { AttachSecretToAgentMutation } from "./mutations/attach_secret_to_agent.ts";
import { AttachSecretToSessionMutation } from "./mutations/attach_secret_to_session.ts";
import { ArchiveSessionMutation } from "./mutations/archive_session.ts";
import { CreateExternalLinkArtifactMutation } from "./mutations/create_external_link_artifact.ts";
import { CreateMarkdownArtifactMutation } from "./mutations/create_markdown_artifact.ts";
import { CreatePullRequestArtifactMutation } from "./mutations/create_pull_request_artifact.ts";
import { CreateTaskCategoryMutation } from "./mutations/create_task_category.ts";
import { CreateTaskMutation } from "./mutations/create_task.ts";
import { CreateSecretMutation } from "./mutations/create_secret.ts";
import { CreateSessionMutation } from "./mutations/create_session.ts";
import { DeleteArtifactMutation } from "./mutations/delete_artifact.ts";
import { DeleteAgentMutation } from "./mutations/delete_agent.ts";
import { DeleteComputeProviderDefinitionMutation } from "./mutations/delete_compute_provider_definition.ts";
import { DeleteEnvironmentMutation } from "./mutations/delete_environment.ts";
import { DeleteGithubInstallationMutation } from "./mutations/delete_github_installation.ts";
import { DeleteModelProviderCredentialMutation } from "./mutations/delete_model_provider_credential.ts";
import { DeleteSessionQueuedMessageMutation } from "./mutations/delete_session_queued_message.ts";
import { DeleteSecretMutation } from "./mutations/delete_secret.ts";
import { DetachSecretFromAgentMutation } from "./mutations/detach_secret_from_agent.ts";
import { DetachSecretFromSessionMutation } from "./mutations/detach_secret_from_session.ts";
import { MarkSessionReadMutation } from "./mutations/mark_session_read.ts";
import { PromptSessionMutation } from "./mutations/prompt_session.ts";
import { ResolveInboxHumanQuestionMutation } from "./mutations/resolve_inbox_human_question.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "./mutations/refresh_github_installation_repositories.ts";
import { RefreshModelProviderCredentialModelsMutation } from "./mutations/refresh_model_provider_credential_models.ts";
import { SetTaskCategoryMutation } from "./mutations/set_task_category.ts";
import { SteerSessionQueuedMessageMutation } from "./mutations/steer_session_queued_message.ts";
import { StartEnvironmentMutation } from "./mutations/start_environment.ts";
import { StopEnvironmentMutation } from "./mutations/stop_environment.ts";
import { UpdateAgentEnvironmentRequirementsMutation } from "./mutations/update_agent_environment_requirements.ts";
import { UpdateAgentMutation } from "./mutations/update_agent.ts";
import { UpdateArtifactMutation } from "./mutations/update_artifact.ts";
import { UpdateCompanySettingsMutation } from "./mutations/update_company_settings.ts";
import { UpdateComputeProviderDefinitionMutation } from "./mutations/update_compute_provider_definition.ts";
import { UpdateExternalLinkArtifactMutation } from "./mutations/update_external_link_artifact.ts";
import { UpdateMarkdownArtifactMutation } from "./mutations/update_markdown_artifact.ts";
import { UpdateSecretMutation } from "./mutations/update_secret.ts";
import { UpdateTaskMutation } from "./mutations/update_task.ts";
import type { GraphqlRequestContext } from "./graphql_request_context.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { AgentConversationMessagesQueryResolver } from "./resolvers/agent_conversation_messages.ts";
import { AgentConversationsQueryResolver } from "./resolvers/agent_conversations.ts";
import { AgentQueryResolver } from "./resolvers/agent.ts";
import { AgentCreateOptionsQueryResolver } from "./resolvers/agent_create_options.ts";
import { AgentSecretsQueryResolver } from "./resolvers/agent_secrets.ts";
import { AgentsQueryResolver } from "./resolvers/agents.ts";
import { ArtifactQueryResolver } from "./resolvers/artifact.ts";
import { ArtifactsQueryResolver } from "./resolvers/artifacts.ts";
import { CompanySettingsQueryResolver } from "./resolvers/company_settings.ts";
import { ComputeProviderDefinitionsQueryResolver } from "./resolvers/compute_provider_definitions.ts";
import { EnvironmentsQueryResolver } from "./resolvers/environments.ts";
import { GithubAppConfigQueryResolver } from "./resolvers/github_app_config.ts";
import { GithubInstallationsQueryResolver } from "./resolvers/github_installations.ts";
import { GithubRepositoriesQueryResolver } from "./resolvers/github_repositories.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { InboxHumanQuestionsQueryResolver } from "./resolvers/inbox_human_questions.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "./resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "./resolvers/model_providers.ts";
import { SecretsQueryResolver } from "./resolvers/secrets.ts";
import { SessionSecretsQueryResolver } from "./resolvers/session_secrets.ts";
import { TaskQueryResolver } from "./resolvers/task.ts";
import { TaskAssignableUsersQueryResolver } from "./resolvers/task_assignable_users.ts";
import { TaskCategoriesQueryResolver } from "./resolvers/task_categories.ts";
import { TasksQueryResolver } from "./resolvers/tasks.ts";
import { SessionMessagesQueryResolver } from "./resolvers/session_messages.ts";
import { SessionQueuedMessagesQueryResolver } from "./resolvers/session_queued_messages.ts";
import { SessionQueuedMessagesUpdatedSubscriptionResolver } from "./resolvers/session_queued_messages_updated.ts";
import { SessionMessageUpdatedSubscriptionResolver } from "./resolvers/session_message_updated.ts";
import { SessionEnvironmentQueryResolver } from "./resolvers/session_environment.ts";
import { SessionTranscriptMessagesQueryResolver } from "./resolvers/session_transcript_messages.ts";
import { SessionsQueryResolver } from "./resolvers/sessions.ts";
import { SessionUpdatedSubscriptionResolver } from "./resolvers/session_updated.ts";
import { AgentEnvironmentRequirementsService } from "../services/agent/environment/requirements_service.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable()
export class GraphqlApplication {
  private readonly configDocument: Config;
  private readonly addAgentMutation: AddAgentMutation;
  private readonly addComputeProviderDefinitionMutation: AddComputeProviderDefinitionMutation;
  private readonly addGithubInstallationMutation: AddGithubInstallationMutation;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly archiveArtifactMutation: ArchiveArtifactMutation;
  private readonly attachSecretToAgentMutation: AttachSecretToAgentMutation;
  private readonly attachSecretToSessionMutation: AttachSecretToSessionMutation;
  private readonly agentConversationMessagesQueryResolver: AgentConversationMessagesQueryResolver;
  private readonly agentConversationsQueryResolver: AgentConversationsQueryResolver;
  private readonly agentQueryResolver: AgentQueryResolver;
  private readonly agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver;
  private readonly agentSecretsQueryResolver: AgentSecretsQueryResolver;
  private readonly agentsQueryResolver: AgentsQueryResolver;
  private readonly artifactQueryResolver: ArtifactQueryResolver;
  private readonly artifactsQueryResolver: ArtifactsQueryResolver;
  private readonly environmentsQueryResolver: EnvironmentsQueryResolver;
  private readonly archiveSessionMutation: ArchiveSessionMutation;
  private readonly createExternalLinkArtifactMutation: CreateExternalLinkArtifactMutation;
  private readonly createMarkdownArtifactMutation: CreateMarkdownArtifactMutation;
  private readonly createPullRequestArtifactMutation: CreatePullRequestArtifactMutation;
  private readonly createTaskCategoryMutation: CreateTaskCategoryMutation;
  private readonly createTaskMutation: CreateTaskMutation;
  private readonly createSecretMutation: CreateSecretMutation;
  private readonly createSessionMutation: CreateSessionMutation;
  private readonly computeProviderDefinitionsQueryResolver: ComputeProviderDefinitionsQueryResolver;
  private readonly companySettingsQueryResolver: CompanySettingsQueryResolver;
  private readonly deleteArtifactMutation: DeleteArtifactMutation;
  private readonly deleteAgentMutation: DeleteAgentMutation;
  private readonly deleteComputeProviderDefinitionMutation: DeleteComputeProviderDefinitionMutation;
  private readonly deleteEnvironmentMutation: DeleteEnvironmentMutation;
  private readonly deleteGithubInstallationMutation: DeleteGithubInstallationMutation;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
  private readonly deleteSessionQueuedMessageMutation: DeleteSessionQueuedMessageMutation;
  private readonly deleteSecretMutation: DeleteSecretMutation;
  private readonly detachSecretFromAgentMutation: DetachSecretFromAgentMutation;
  private readonly detachSecretFromSessionMutation: DetachSecretFromSessionMutation;
  private readonly inboxHumanQuestionsQueryResolver: InboxHumanQuestionsQueryResolver;
  private readonly promptSessionMutation: PromptSessionMutation;
  private readonly resolveInboxHumanQuestionMutation: ResolveInboxHumanQuestionMutation;
  private readonly refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation;
  private readonly refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly githubAppConfigQueryResolver: GithubAppConfigQueryResolver;
  private readonly githubInstallationsQueryResolver: GithubInstallationsQueryResolver;
  private readonly githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly markSessionReadMutation: MarkSessionReadMutation;
  private readonly modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;
  private readonly modelProvidersQueryResolver: ModelProvidersQueryResolver;
  private readonly secretsQueryResolver: SecretsQueryResolver;
  private readonly sessionMessagesQueryResolver: SessionMessagesQueryResolver;
  private readonly sessionEnvironmentQueryResolver: SessionEnvironmentQueryResolver;
  private readonly sessionQueuedMessagesQueryResolver: SessionQueuedMessagesQueryResolver;
  private readonly sessionMessageUpdatedSubscriptionResolver: SessionMessageUpdatedSubscriptionResolver;
  private readonly sessionQueuedMessagesUpdatedSubscriptionResolver: SessionQueuedMessagesUpdatedSubscriptionResolver;
  private readonly sessionSecretsQueryResolver: SessionSecretsQueryResolver;
  private readonly sessionTranscriptMessagesQueryResolver: SessionTranscriptMessagesQueryResolver;
  private readonly sessionsQueryResolver: SessionsQueryResolver;
  private readonly sessionUpdatedSubscriptionResolver: SessionUpdatedSubscriptionResolver;
  private readonly setTaskCategoryMutation: SetTaskCategoryMutation;
  private readonly startEnvironmentMutation: StartEnvironmentMutation;
  private readonly steerSessionQueuedMessageMutation: SteerSessionQueuedMessageMutation;
  private readonly stopEnvironmentMutation: StopEnvironmentMutation;
  private readonly taskQueryResolver: TaskQueryResolver;
  private readonly taskAssignableUsersQueryResolver: TaskAssignableUsersQueryResolver;
  private readonly taskCategoriesQueryResolver: TaskCategoriesQueryResolver;
  private readonly tasksQueryResolver: TasksQueryResolver;
  private readonly updateAgentMutation: UpdateAgentMutation;
  private readonly updateArtifactMutation: UpdateArtifactMutation;
  private readonly updateAgentEnvironmentRequirementsMutation: UpdateAgentEnvironmentRequirementsMutation;
  private readonly updateCompanySettingsMutation: UpdateCompanySettingsMutation;
  private readonly updateComputeProviderDefinitionMutation: UpdateComputeProviderDefinitionMutation;
  private readonly updateExternalLinkArtifactMutation: UpdateExternalLinkArtifactMutation;
  private readonly updateMarkdownArtifactMutation: UpdateMarkdownArtifactMutation;
  private readonly updateSecretMutation: UpdateSecretMutation;
  private readonly updateTaskMutation: UpdateTaskMutation;
  private readonly redisService: RedisService;

  constructor(
    @inject(Config) config: Config,
    @inject(AddModelProviderCredentialMutation) addModelProviderCredentialMutation: AddModelProviderCredentialMutation,
    @inject(DeleteModelProviderCredentialMutation)
    deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation,
    @inject(RefreshModelProviderCredentialModelsMutation)
    refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation,
    @inject(GraphqlRequestContextResolver) graphqlRequestContextResolver: GraphqlRequestContextResolver,
    @inject(HealthQueryResolver) healthQueryResolver: HealthQueryResolver,
    @inject(MeQueryResolver) meQueryResolver: MeQueryResolver,
    @inject(ModelProviderCredentialModelsQueryResolver)
    modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver,
    @inject(ModelProviderCredentialsQueryResolver) modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver,
    @inject(AddAgentMutation) addAgentMutation?: AddAgentMutation,
    @inject(CreateSessionMutation)
    createSessionMutation: CreateSessionMutation = new CreateSessionMutation({
      async createSession() {
        throw new Error("CreateSession mutation is not configured.");
      },
    } as never),
    @inject(AgentConversationsQueryResolver)
    agentConversationsQueryResolver: AgentConversationsQueryResolver = new AgentConversationsQueryResolver({
      async listConversations() {
        throw new Error("AgentConversations query is not configured.");
      },
      async listMessages() {
        throw new Error("AgentConversationMessages query is not configured.");
      },
      async sendMessage() {
        throw new Error("AgentConversation service is not configured.");
      },
    } as never),
    @inject(AgentConversationMessagesQueryResolver)
    agentConversationMessagesQueryResolver: AgentConversationMessagesQueryResolver =
      new AgentConversationMessagesQueryResolver({
        async listConversations() {
          throw new Error("AgentConversations query is not configured.");
        },
        async listMessages() {
          throw new Error("AgentConversationMessages query is not configured.");
        },
        async sendMessage() {
          throw new Error("AgentConversation service is not configured.");
        },
      } as never),
    @inject(AgentQueryResolver) agentQueryResolver?: AgentQueryResolver,
    @inject(AgentCreateOptionsQueryResolver)
    agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver = new AgentCreateOptionsQueryResolver(),
    @inject(AgentsQueryResolver) agentsQueryResolver: AgentsQueryResolver = new AgentsQueryResolver(),
    @inject(DeleteAgentMutation) deleteAgentMutation: DeleteAgentMutation = new DeleteAgentMutation(),
    @inject(DeleteEnvironmentMutation) deleteEnvironmentMutation: DeleteEnvironmentMutation = new DeleteEnvironmentMutation(),
    @inject(StartEnvironmentMutation) startEnvironmentMutation: StartEnvironmentMutation = new StartEnvironmentMutation(),
    @inject(StopEnvironmentMutation) stopEnvironmentMutation: StopEnvironmentMutation = new StopEnvironmentMutation(),
    @inject(ModelProvidersQueryResolver) modelProvidersQueryResolver: ModelProvidersQueryResolver = new ModelProvidersQueryResolver(),
    @inject(UpdateAgentMutation) updateAgentMutation: UpdateAgentMutation = new UpdateAgentMutation(),
    @inject(SessionMessagesQueryResolver)
    sessionMessagesQueryResolver: SessionMessagesQueryResolver = new SessionMessagesQueryResolver(),
    @inject(SessionTranscriptMessagesQueryResolver)
    sessionTranscriptMessagesQueryResolver: SessionTranscriptMessagesQueryResolver =
      new SessionTranscriptMessagesQueryResolver(),
    @inject(SessionsQueryResolver) sessionsQueryResolver: SessionsQueryResolver = new SessionsQueryResolver(),
    @inject(ArchiveSessionMutation)
    archiveSessionMutation: ArchiveSessionMutation = new ArchiveSessionMutation({
      async archiveSession() {
        throw new Error("ArchiveSession mutation is not configured.");
      },
    } as never),
    @inject(SessionMessageUpdatedSubscriptionResolver)
    sessionMessageUpdatedSubscriptionResolver: SessionMessageUpdatedSubscriptionResolver =
      new SessionMessageUpdatedSubscriptionResolver(),
    @inject(SessionUpdatedSubscriptionResolver)
    sessionUpdatedSubscriptionResolver: SessionUpdatedSubscriptionResolver = new SessionUpdatedSubscriptionResolver(),
    @inject(PromptSessionMutation)
    promptSessionMutation: PromptSessionMutation = new PromptSessionMutation({
      async prompt() {
        throw new Error("PromptSession mutation is not configured.");
      },
    } as never),
    @inject(RedisService) redisService: RedisService = new RedisService(config),
    @inject(CreateTaskMutation) createTaskMutation: CreateTaskMutation = new CreateTaskMutation(),
    @inject(CreateTaskCategoryMutation)
    createTaskCategoryMutation: CreateTaskCategoryMutation = new CreateTaskCategoryMutation(),
    @inject(SetTaskCategoryMutation) setTaskCategoryMutation: SetTaskCategoryMutation = new SetTaskCategoryMutation(),
    @inject(TaskAssignableUsersQueryResolver)
    taskAssignableUsersQueryResolver: TaskAssignableUsersQueryResolver = new TaskAssignableUsersQueryResolver(),
    @inject(TaskCategoriesQueryResolver)
    taskCategoriesQueryResolver: TaskCategoriesQueryResolver = new TaskCategoriesQueryResolver(),
    @inject(TasksQueryResolver) tasksQueryResolver: TasksQueryResolver = new TasksQueryResolver(),
    @inject(CompanySettingsQueryResolver)
    companySettingsQueryResolver: CompanySettingsQueryResolver = new CompanySettingsQueryResolver(),
    @inject(GithubAppConfigQueryResolver)
    githubAppConfigQueryResolver: GithubAppConfigQueryResolver =
      new GithubAppConfigQueryResolver(new GithubClient(config)),
    @inject(GithubInstallationsQueryResolver)
    githubInstallationsQueryResolver: GithubInstallationsQueryResolver = new GithubInstallationsQueryResolver(),
    @inject(GithubRepositoriesQueryResolver)
    githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver = new GithubRepositoriesQueryResolver(),
    @inject(AddGithubInstallationMutation)
    addGithubInstallationMutation: AddGithubInstallationMutation =
      new AddGithubInstallationMutation(new GithubClient(config)),
    @inject(DeleteGithubInstallationMutation)
    deleteGithubInstallationMutation: DeleteGithubInstallationMutation = new DeleteGithubInstallationMutation(),
    @inject(DeleteSessionQueuedMessageMutation)
    deleteSessionQueuedMessageMutation: DeleteSessionQueuedMessageMutation = new DeleteSessionQueuedMessageMutation(),
    @inject(RefreshGithubInstallationRepositoriesMutation)
    refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation =
      new RefreshGithubInstallationRepositoriesMutation(new GithubClient(config)),
    @inject(EnvironmentsQueryResolver) environmentsQueryResolver: EnvironmentsQueryResolver = new EnvironmentsQueryResolver(),
    @inject(AttachSecretToAgentMutation)
    attachSecretToAgentMutation?: AttachSecretToAgentMutation,
    @inject(AttachSecretToSessionMutation)
    attachSecretToSessionMutation?: AttachSecretToSessionMutation,
    @inject(CreateSecretMutation)
    createSecretMutation?: CreateSecretMutation,
    @inject(DeleteSecretMutation)
    deleteSecretMutation?: DeleteSecretMutation,
    @inject(DetachSecretFromAgentMutation)
    detachSecretFromAgentMutation?: DetachSecretFromAgentMutation,
    @inject(UpdateSecretMutation)
    updateSecretMutation?: UpdateSecretMutation,
    @inject(DetachSecretFromSessionMutation)
    detachSecretFromSessionMutation?: DetachSecretFromSessionMutation,
    @inject(AgentSecretsQueryResolver)
    agentSecretsQueryResolver?: AgentSecretsQueryResolver,
    @inject(SecretsQueryResolver)
    secretsQueryResolver?: SecretsQueryResolver,
    @inject(SessionSecretsQueryResolver)
    sessionSecretsQueryResolver?: SessionSecretsQueryResolver,
    @inject(AgentEnvironmentRequirementsService)
    agentEnvironmentRequirementsService?: AgentEnvironmentRequirementsService,
    @inject(UpdateAgentEnvironmentRequirementsMutation)
    updateAgentEnvironmentRequirementsMutation?: UpdateAgentEnvironmentRequirementsMutation,
    @inject(AddComputeProviderDefinitionMutation)
    addComputeProviderDefinitionMutation: AddComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("AddComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(DeleteComputeProviderDefinitionMutation)
    deleteComputeProviderDefinitionMutation: DeleteComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("DeleteComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(UpdateComputeProviderDefinitionMutation)
    updateComputeProviderDefinitionMutation: UpdateComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("UpdateComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(ComputeProviderDefinitionsQueryResolver)
    computeProviderDefinitionsQueryResolver: ComputeProviderDefinitionsQueryResolver = {
      async execute() {
        throw new Error("ComputeProviderDefinitions query is not configured.");
      },
    } as never,
    @inject(SessionEnvironmentQueryResolver)
    sessionEnvironmentQueryResolver: SessionEnvironmentQueryResolver = {
      async execute() {
        throw new Error("SessionEnvironment query is not configured.");
      },
    } as never,
    @inject(SteerSessionQueuedMessageMutation)
    steerSessionQueuedMessageMutation: SteerSessionQueuedMessageMutation = new SteerSessionQueuedMessageMutation(),
    @inject(InboxHumanQuestionsQueryResolver)
    inboxHumanQuestionsQueryResolver: InboxHumanQuestionsQueryResolver = new InboxHumanQuestionsQueryResolver({
      async listOpenHumanQuestions() {
        throw new Error("InboxHumanQuestions query is not configured.");
      },
    } as never),
    @inject(ResolveInboxHumanQuestionMutation)
    resolveInboxHumanQuestionMutation: ResolveInboxHumanQuestionMutation = new ResolveInboxHumanQuestionMutation({
      async resolveHumanQuestion() {
        throw new Error("ResolveInboxHumanQuestion mutation is not configured.");
      },
    } as never),
    @inject(SessionQueuedMessagesQueryResolver)
    sessionQueuedMessagesQueryResolver: SessionQueuedMessagesQueryResolver = new SessionQueuedMessagesQueryResolver(),
    @inject(SessionQueuedMessagesUpdatedSubscriptionResolver)
    sessionQueuedMessagesUpdatedSubscriptionResolver: SessionQueuedMessagesUpdatedSubscriptionResolver =
      new SessionQueuedMessagesUpdatedSubscriptionResolver(),
    @inject(ArtifactQueryResolver)
    artifactQueryResolver: ArtifactQueryResolver = new ArtifactQueryResolver(),
    @inject(ArtifactsQueryResolver)
    artifactsQueryResolver: ArtifactsQueryResolver = new ArtifactsQueryResolver(),
    @inject(CreateMarkdownArtifactMutation)
    createMarkdownArtifactMutation: CreateMarkdownArtifactMutation = new CreateMarkdownArtifactMutation(),
    @inject(CreateExternalLinkArtifactMutation)
    createExternalLinkArtifactMutation: CreateExternalLinkArtifactMutation = new CreateExternalLinkArtifactMutation(),
    @inject(CreatePullRequestArtifactMutation)
    createPullRequestArtifactMutation: CreatePullRequestArtifactMutation = new CreatePullRequestArtifactMutation(),
    @inject(DeleteArtifactMutation)
    deleteArtifactMutation: DeleteArtifactMutation = new DeleteArtifactMutation(),
    @inject(UpdateArtifactMutation)
    updateArtifactMutation: UpdateArtifactMutation = new UpdateArtifactMutation(),
    @inject(UpdateMarkdownArtifactMutation)
    updateMarkdownArtifactMutation: UpdateMarkdownArtifactMutation = new UpdateMarkdownArtifactMutation(),
    @inject(UpdateExternalLinkArtifactMutation)
    updateExternalLinkArtifactMutation: UpdateExternalLinkArtifactMutation = new UpdateExternalLinkArtifactMutation(),
    @inject(ArchiveArtifactMutation)
    archiveArtifactMutation: ArchiveArtifactMutation = new ArchiveArtifactMutation(),
    @inject(UpdateCompanySettingsMutation)
    updateCompanySettingsMutation: UpdateCompanySettingsMutation = new UpdateCompanySettingsMutation(),
    @inject(MarkSessionReadMutation)
    markSessionReadMutation: MarkSessionReadMutation = {
      async execute() {
        throw new Error("MarkSessionRead mutation is not configured.");
      },
    } as never,
    @inject(TaskQueryResolver) taskQueryResolver: TaskQueryResolver = new TaskQueryResolver(),
    @inject(UpdateTaskMutation) updateTaskMutation: UpdateTaskMutation = new UpdateTaskMutation(),
  ) {
    const defaultSecretService = new SecretService(new SecretEncryptionService(config));
    const defaultAgentEnvironmentRequirementsService = agentEnvironmentRequirementsService
      ?? new AgentEnvironmentRequirementsService();

    this.configDocument = config;
    this.addAgentMutation = addAgentMutation
      ?? new AddAgentMutation(defaultSecretService, defaultAgentEnvironmentRequirementsService);
    this.addComputeProviderDefinitionMutation = addComputeProviderDefinitionMutation;
    this.addGithubInstallationMutation = addGithubInstallationMutation;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.archiveArtifactMutation = archiveArtifactMutation;
    this.attachSecretToAgentMutation = attachSecretToAgentMutation
      ?? new AttachSecretToAgentMutation(defaultSecretService);
    this.attachSecretToSessionMutation = attachSecretToSessionMutation
      ?? new AttachSecretToSessionMutation(defaultSecretService);
    this.agentConversationMessagesQueryResolver = agentConversationMessagesQueryResolver;
    this.agentConversationsQueryResolver = agentConversationsQueryResolver;
    this.agentQueryResolver = agentQueryResolver ?? new AgentQueryResolver(defaultAgentEnvironmentRequirementsService);
    this.agentCreateOptionsQueryResolver = agentCreateOptionsQueryResolver;
    this.agentSecretsQueryResolver = agentSecretsQueryResolver
      ?? new AgentSecretsQueryResolver(defaultSecretService);
    this.agentsQueryResolver = agentsQueryResolver;
    this.artifactQueryResolver = artifactQueryResolver;
    this.artifactsQueryResolver = artifactsQueryResolver;
    this.environmentsQueryResolver = environmentsQueryResolver;
    this.archiveSessionMutation = archiveSessionMutation;
    this.createExternalLinkArtifactMutation = createExternalLinkArtifactMutation;
    this.createMarkdownArtifactMutation = createMarkdownArtifactMutation;
    this.createPullRequestArtifactMutation = createPullRequestArtifactMutation;
    this.createTaskCategoryMutation = createTaskCategoryMutation;
    this.createTaskMutation = createTaskMutation;
    this.createSecretMutation = createSecretMutation ?? new CreateSecretMutation(defaultSecretService);
    this.createSessionMutation = createSessionMutation;
    this.computeProviderDefinitionsQueryResolver = computeProviderDefinitionsQueryResolver;
    this.companySettingsQueryResolver = companySettingsQueryResolver;
    this.deleteArtifactMutation = deleteArtifactMutation;
    this.deleteAgentMutation = deleteAgentMutation;
    this.deleteComputeProviderDefinitionMutation = deleteComputeProviderDefinitionMutation;
    this.deleteEnvironmentMutation = deleteEnvironmentMutation;
    this.startEnvironmentMutation = startEnvironmentMutation;
    this.stopEnvironmentMutation = stopEnvironmentMutation;
    this.deleteGithubInstallationMutation = deleteGithubInstallationMutation;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
    this.deleteSessionQueuedMessageMutation = deleteSessionQueuedMessageMutation;
    this.deleteSecretMutation = deleteSecretMutation ?? new DeleteSecretMutation(defaultSecretService);
    this.detachSecretFromAgentMutation = detachSecretFromAgentMutation
      ?? new DetachSecretFromAgentMutation(defaultSecretService);
    this.updateSecretMutation = updateSecretMutation ?? new UpdateSecretMutation(defaultSecretService);
    this.detachSecretFromSessionMutation = detachSecretFromSessionMutation
      ?? new DetachSecretFromSessionMutation(defaultSecretService);
    this.inboxHumanQuestionsQueryResolver = inboxHumanQuestionsQueryResolver;
    this.promptSessionMutation = promptSessionMutation;
    this.resolveInboxHumanQuestionMutation = resolveInboxHumanQuestionMutation;
    this.refreshModelProviderCredentialModelsMutation = refreshModelProviderCredentialModelsMutation;
    this.refreshGithubInstallationRepositoriesMutation = refreshGithubInstallationRepositoriesMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
    this.githubAppConfigQueryResolver = githubAppConfigQueryResolver;
    this.githubInstallationsQueryResolver = githubInstallationsQueryResolver;
    this.githubRepositoriesQueryResolver = githubRepositoriesQueryResolver;
    this.meQueryResolver = meQueryResolver;
    this.markSessionReadMutation = markSessionReadMutation;
    this.modelProviderCredentialModelsQueryResolver = modelProviderCredentialModelsQueryResolver;
    this.modelProviderCredentialsQueryResolver = modelProviderCredentialsQueryResolver;
    this.modelProvidersQueryResolver = modelProvidersQueryResolver;
    this.secretsQueryResolver = secretsQueryResolver ?? new SecretsQueryResolver(defaultSecretService);
    this.sessionMessagesQueryResolver = sessionMessagesQueryResolver;
    this.sessionEnvironmentQueryResolver = sessionEnvironmentQueryResolver;
    this.sessionQueuedMessagesQueryResolver = sessionQueuedMessagesQueryResolver;
    this.sessionMessageUpdatedSubscriptionResolver = sessionMessageUpdatedSubscriptionResolver;
    this.sessionQueuedMessagesUpdatedSubscriptionResolver = sessionQueuedMessagesUpdatedSubscriptionResolver;
    this.sessionSecretsQueryResolver = sessionSecretsQueryResolver
      ?? new SessionSecretsQueryResolver(defaultSecretService);
    this.sessionTranscriptMessagesQueryResolver = sessionTranscriptMessagesQueryResolver;
    this.sessionsQueryResolver = sessionsQueryResolver;
    this.sessionUpdatedSubscriptionResolver = sessionUpdatedSubscriptionResolver;
    this.setTaskCategoryMutation = setTaskCategoryMutation;
    this.steerSessionQueuedMessageMutation = steerSessionQueuedMessageMutation;
    this.taskQueryResolver = taskQueryResolver;
    this.taskAssignableUsersQueryResolver = taskAssignableUsersQueryResolver;
    this.taskCategoriesQueryResolver = taskCategoriesQueryResolver;
    this.tasksQueryResolver = tasksQueryResolver;
    this.updateAgentMutation = updateAgentMutation;
    this.updateArtifactMutation = updateArtifactMutation;
    this.updateAgentEnvironmentRequirementsMutation = updateAgentEnvironmentRequirementsMutation
      ?? new UpdateAgentEnvironmentRequirementsMutation(defaultAgentEnvironmentRequirementsService);
    this.updateCompanySettingsMutation = updateCompanySettingsMutation;
    this.updateComputeProviderDefinitionMutation = updateComputeProviderDefinitionMutation;
    this.updateExternalLinkArtifactMutation = updateExternalLinkArtifactMutation;
    this.updateMarkdownArtifactMutation = updateMarkdownArtifactMutation;
    this.updateTaskMutation = updateTaskMutation;
    this.redisService = redisService;
  }

  async register(app: FastifyInstance): Promise<void> {
    const graphqlPluginOptions = {
      schema: GraphqlSchema.getDocument(),
      context: (
        request: Parameters<GraphqlRequestContextResolver["resolve"]>[0],
      ) => this.graphqlRequestContextResolver.resolve(request),
      subscription: {
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
        Query: {
          Agent: this.agentQueryResolver.execute,
          AgentConversationMessages: this.agentConversationMessagesQueryResolver.execute,
          AgentConversations: this.agentConversationsQueryResolver.execute,
          AgentCreateOptions: this.agentCreateOptionsQueryResolver.execute,
          AgentSecrets: this.agentSecretsQueryResolver.execute,
          Agents: this.agentsQueryResolver.execute,
          Artifact: this.artifactQueryResolver.execute,
          Artifacts: this.artifactsQueryResolver.execute,
          CompanySettings: this.companySettingsQueryResolver.execute,
          ComputeProviderDefinitions: this.computeProviderDefinitionsQueryResolver.execute,
          Environments: this.environmentsQueryResolver.execute,
          GithubAppConfig: this.githubAppConfigQueryResolver.execute,
          GithubInstallations: this.githubInstallationsQueryResolver.execute,
          GithubRepositories: this.githubRepositoriesQueryResolver.execute,
          health: this.healthQueryResolver.execute,
          InboxHumanQuestions: this.inboxHumanQuestionsQueryResolver.execute,
          Me: this.meQueryResolver.execute,
          ModelProviderCredentialModels: this.modelProviderCredentialModelsQueryResolver.execute,
          ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
          ModelProviders: this.modelProvidersQueryResolver.execute,
          Secrets: this.secretsQueryResolver.execute,
          SessionQueuedMessages: this.sessionQueuedMessagesQueryResolver.execute,
          SessionEnvironment: this.sessionEnvironmentQueryResolver.execute,
          Task: this.taskQueryResolver.execute,
          TaskAssignableUsers: this.taskAssignableUsersQueryResolver.execute,
          TaskCategories: this.taskCategoriesQueryResolver.execute,
          Tasks: this.tasksQueryResolver.execute,
          SessionMessages: this.sessionMessagesQueryResolver.execute,
          SessionSecrets: this.sessionSecretsQueryResolver.execute,
          SessionTranscriptMessages: this.sessionTranscriptMessagesQueryResolver.execute,
          Sessions: this.sessionsQueryResolver.execute,
        },
        Mutation: {
          AddAgent: this.addAgentMutation.execute,
          AddComputeProviderDefinition: this.addComputeProviderDefinitionMutation.execute,
          DeleteEnvironment: this.deleteEnvironmentMutation.execute,
          DeleteComputeProviderDefinition: this.deleteComputeProviderDefinitionMutation.execute,
          StartEnvironment: this.startEnvironmentMutation.execute,
          StopEnvironment: this.stopEnvironmentMutation.execute,
          AddGithubInstallation: this.addGithubInstallationMutation.execute,
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          ArchiveArtifact: this.archiveArtifactMutation.execute,
          AttachSecretToAgent: this.attachSecretToAgentMutation.execute,
          AttachSecretToSession: this.attachSecretToSessionMutation.execute,
          ArchiveSession: this.archiveSessionMutation.execute,
          CreateExternalLinkArtifact: this.createExternalLinkArtifactMutation.execute,
          CreateMarkdownArtifact: this.createMarkdownArtifactMutation.execute,
          CreatePullRequestArtifact: this.createPullRequestArtifactMutation.execute,
          CreateSecret: this.createSecretMutation.execute,
          CreateTask: this.createTaskMutation.execute,
          CreateTaskCategory: this.createTaskCategoryMutation.execute,
          CreateSession: this.createSessionMutation.execute,
          DeleteArtifact: this.deleteArtifactMutation.execute,
          DeleteAgent: this.deleteAgentMutation.execute,
          DeleteGithubInstallation: this.deleteGithubInstallationMutation.execute,
          DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
          DeleteSessionQueuedMessage: this.deleteSessionQueuedMessageMutation.execute,
          DeleteSecret: this.deleteSecretMutation.execute,
          DetachSecretFromAgent: this.detachSecretFromAgentMutation.execute,
          DetachSecretFromSession: this.detachSecretFromSessionMutation.execute,
          MarkSessionRead: this.markSessionReadMutation.execute,
          RefreshGithubInstallationRepositories: this.refreshGithubInstallationRepositoriesMutation.execute,
          PromptSession: this.promptSessionMutation.execute,
          ResolveInboxHumanQuestion: this.resolveInboxHumanQuestionMutation.execute,
          RefreshModelProviderCredentialModels: this.refreshModelProviderCredentialModelsMutation.execute,
          SetTaskCategory: this.setTaskCategoryMutation.execute,
          SteerSessionQueuedMessage: this.steerSessionQueuedMessageMutation.execute,
          UpdateAgentEnvironmentRequirements: this.updateAgentEnvironmentRequirementsMutation.execute,
          UpdateAgent: this.updateAgentMutation.execute,
          UpdateArtifact: this.updateArtifactMutation.execute,
          UpdateCompanySettings: this.updateCompanySettingsMutation.execute,
          UpdateComputeProviderDefinition: this.updateComputeProviderDefinitionMutation.execute,
          UpdateExternalLinkArtifact: this.updateExternalLinkArtifactMutation.execute,
          UpdateMarkdownArtifact: this.updateMarkdownArtifactMutation.execute,
          UpdateSecret: this.updateSecretMutation.execute,
          UpdateTask: this.updateTaskMutation.execute,
        },
        Subscription: {
          SessionMessageUpdated: {
            subscribe: this.sessionMessageUpdatedSubscriptionResolver.subscribe,
            resolve: this.sessionMessageUpdatedSubscriptionResolver.resolve,
          },
          SessionQueuedMessagesUpdated: {
            subscribe: this.sessionQueuedMessagesUpdatedSubscriptionResolver.subscribe,
            resolve: this.sessionQueuedMessagesUpdatedSubscriptionResolver.resolve,
          },
          SessionUpdated: {
            subscribe: this.sessionUpdatedSubscriptionResolver.subscribe,
            resolve: this.sessionUpdatedSubscriptionResolver.resolve,
          },
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    };

    await app.register(mercurius as never, graphqlPluginOptions as never);
  }
}
