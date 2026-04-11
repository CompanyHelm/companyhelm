import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import GraphQLJSON from "graphql-type-json";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import { GithubClient } from "../github/client.ts";
import { GithubInstallationStateService } from "../github/installation_state_service.ts";
import { ApiLogger } from "../log/api_logger.ts";
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
import { AttachSkillGroupToAgentMutation } from "./mutations/attach_skill_group_to_agent.ts";
import { AttachSkillToAgentMutation } from "./mutations/attach_skill_to_agent.ts";
import { AttachSecretToSessionMutation } from "./mutations/attach_secret_to_session.ts";
import { ArchiveSessionMutation } from "./mutations/archive_session.ts";
import { CreateExternalLinkArtifactMutation } from "./mutations/create_external_link_artifact.ts";
import { CreateGithubInstallationUrlMutation } from "./mutations/create_github_installation_url.ts";
import { CreateMarkdownArtifactMutation } from "./mutations/create_markdown_artifact.ts";
import { CreatePullRequestArtifactMutation } from "./mutations/create_pull_request_artifact.ts";
import { CreateSkillMutation } from "./mutations/create_skill.ts";
import { ImportGithubSkillMutation } from "./mutations/import_github_skill.ts";
import { CreateSkillGroupMutation } from "./mutations/create_skill_group.ts";
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
import { DeleteSkillMutation } from "./mutations/delete_skill.ts";
import { DeleteSkillGroupMutation } from "./mutations/delete_skill_group.ts";
import { DeleteTaskCategoryMutation } from "./mutations/delete_task_category.ts";
import { DeleteSessionQueuedMessageMutation } from "./mutations/delete_session_queued_message.ts";
import { DeleteSecretMutation } from "./mutations/delete_secret.ts";
import { DeleteTaskMutation } from "./mutations/delete_task.ts";
import { DismissInboxHumanQuestionMutation } from "./mutations/dismiss_inbox_human_question.ts";
import { DetachSecretFromAgentMutation } from "./mutations/detach_secret_from_agent.ts";
import { DetachSkillGroupFromAgentMutation } from "./mutations/detach_skill_group_from_agent.ts";
import { DetachSkillFromAgentMutation } from "./mutations/detach_skill_from_agent.ts";
import { DetachSecretFromSessionMutation } from "./mutations/detach_secret_from_session.ts";
import { ExecuteTaskMutation } from "./mutations/execute_task.ts";
import { ForkSessionMutation } from "./mutations/fork_session.ts";
import { GetEnvironmentVncUrlMutation } from "./mutations/get_environment_vnc_url.ts";
import { InterruptSessionMutation } from "./mutations/interrupt_session.ts";
import { MarkSessionReadMutation } from "./mutations/mark_session_read.ts";
import { PromptSessionMutation } from "./mutations/prompt_session.ts";
import { ResolveInboxHumanQuestionMutation } from "./mutations/resolve_inbox_human_question.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "./mutations/refresh_github_installation_repositories.ts";
import { RefreshModelProviderCredentialModelsMutation } from "./mutations/refresh_model_provider_credential_models.ts";
import { SetDefaultComputeProviderDefinitionMutation } from "./mutations/set_default_compute_provider_definition.ts";
import { SetDefaultModelProviderCredentialMutation } from "./mutations/set_default_model_provider_credential.ts";
import { SetDefaultModelProviderCredentialModelMutation } from "./mutations/set_default_model_provider_credential_model.ts";
import { SetTaskCategoryMutation } from "./mutations/set_task_category.ts";
import { SteerSessionQueuedMessageMutation } from "./mutations/steer_session_queued_message.ts";
import { StartEnvironmentMutation } from "./mutations/start_environment.ts";
import { StopEnvironmentMutation } from "./mutations/stop_environment.ts";
import { UpdateAgentMutation } from "./mutations/update_agent.ts";
import { UpdateArtifactMutation } from "./mutations/update_artifact.ts";
import { UpdateCompanySettingsMutation } from "./mutations/update_company_settings.ts";
import { UpdateComputeProviderDefinitionMutation } from "./mutations/update_compute_provider_definition.ts";
import { UpdateExternalLinkArtifactMutation } from "./mutations/update_external_link_artifact.ts";
import { UpdateMarkdownArtifactMutation } from "./mutations/update_markdown_artifact.ts";
import { UpdateSecretMutation } from "./mutations/update_secret.ts";
import { UpdateSkillMutation } from "./mutations/update_skill.ts";
import { UpdateSessionTitleMutation } from "./mutations/update_session_title.ts";
import { UpdateTaskMutation } from "./mutations/update_task.ts";
import {
  GraphqlErrorLogger,
  type GraphqlExecutionContext,
  type GraphqlExecutionResult,
} from "./error_logger.ts";
import type { GraphqlRequestContext } from "./graphql_request_context.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { AgentConversationMessagesQueryResolver } from "./resolvers/agent_conversation_messages.ts";
import { AgentConversationsQueryResolver } from "./resolvers/agent_conversations.ts";
import { AgentQueryResolver } from "./resolvers/agent.ts";
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
import { GithubInstallationsQueryResolver } from "./resolvers/github_installations.ts";
import { GithubRepositoriesQueryResolver } from "./resolvers/github_repositories.ts";
import { GithubSkillDirectoriesQueryResolver } from "./resolvers/github_skill_directories.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { InboxHumanQuestionsQueryResolver } from "./resolvers/inbox_human_questions.ts";
import { InboxHumanQuestionsUpdatedSubscriptionResolver } from "./resolvers/inbox_human_questions_updated.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "./resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "./resolvers/model_providers.ts";
import { SecretsQueryResolver } from "./resolvers/secrets.ts";
import { SkillGroupsQueryResolver } from "./resolvers/skill_groups.ts";
import { SkillQueryResolver } from "./resolvers/skill.ts";
import { SkillsQueryResolver } from "./resolvers/skills.ts";
import { SessionSecretsQueryResolver } from "./resolvers/session_secrets.ts";
import { TaskQueryResolver } from "./resolvers/task.ts";
import { TaskAssignableUsersQueryResolver } from "./resolvers/task_assignable_users.ts";
import { TaskCategoriesQueryResolver } from "./resolvers/task_categories.ts";
import { TaskRunsQueryResolver } from "./resolvers/task_runs.ts";
import { TasksQueryResolver } from "./resolvers/tasks.ts";
import { SessionMessagesQueryResolver } from "./resolvers/session_messages.ts";
import { SessionQueuedMessagesQueryResolver } from "./resolvers/session_queued_messages.ts";
import { SessionInboxHumanQuestionsUpdatedSubscriptionResolver } from "./resolvers/session_inbox_human_questions_updated.ts";
import { SessionQueuedMessagesUpdatedSubscriptionResolver } from "./resolvers/session_queued_messages_updated.ts";
import { SessionMessageUpdatedSubscriptionResolver } from "./resolvers/session_message_updated.ts";
import { SessionEnvironmentQueryResolver } from "./resolvers/session_environment.ts";
import { SessionTranscriptMessagesQueryResolver } from "./resolvers/session_transcript_messages.ts";
import { SessionsQueryResolver } from "./resolvers/sessions.ts";
import { SessionUpdatedSubscriptionResolver } from "./resolvers/session_updated.ts";
import { AgentEnvironmentTemplateService } from "../services/environments/template_service.ts";
import { GithubSkillService } from "../services/skills/github_service.ts";
import { SkillService } from "../services/skills/service.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable()
export class GraphqlApplication {
  private static readonly SUBSCRIPTION_KEEP_ALIVE_MILLISECONDS = 30_000;
  private readonly configDocument: Config;
  private readonly addAgentMutation: AddAgentMutation;
  private readonly addComputeProviderDefinitionMutation: AddComputeProviderDefinitionMutation;
  private readonly addGithubInstallationMutation: AddGithubInstallationMutation;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly archiveArtifactMutation: ArchiveArtifactMutation;
  private readonly attachSecretToAgentMutation: AttachSecretToAgentMutation;
  private readonly attachSkillGroupToAgentMutation: AttachSkillGroupToAgentMutation;
  private readonly attachSkillToAgentMutation: AttachSkillToAgentMutation;
  private readonly attachSecretToSessionMutation: AttachSecretToSessionMutation;
  private readonly agentConversationMessagesQueryResolver: AgentConversationMessagesQueryResolver;
  private readonly agentConversationsQueryResolver: AgentConversationsQueryResolver;
  private readonly agentQueryResolver: AgentQueryResolver;
  private readonly agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver;
  private readonly agentEnvironmentTemplateResolver: AgentEnvironmentTemplateResolver;
  private readonly agentSecretsQueryResolver: AgentSecretsQueryResolver;
  private readonly agentSkillGroupsQueryResolver: AgentSkillGroupsQueryResolver;
  private readonly agentSkillsQueryResolver: AgentSkillsQueryResolver;
  private readonly agentsQueryResolver: AgentsQueryResolver;
  private readonly artifactQueryResolver: ArtifactQueryResolver;
  private readonly artifactsQueryResolver: ArtifactsQueryResolver;
  private readonly environmentsQueryResolver: EnvironmentsQueryResolver;
  private readonly archiveSessionMutation: ArchiveSessionMutation;
  private readonly createExternalLinkArtifactMutation: CreateExternalLinkArtifactMutation;
  private readonly createGithubInstallationUrlMutation: CreateGithubInstallationUrlMutation;
  private readonly createMarkdownArtifactMutation: CreateMarkdownArtifactMutation;
  private readonly createPullRequestArtifactMutation: CreatePullRequestArtifactMutation;
  private readonly createSkillMutation: CreateSkillMutation;
  private readonly createSkillGroupMutation: CreateSkillGroupMutation;
  private readonly createTaskCategoryMutation: CreateTaskCategoryMutation;
  private readonly createTaskMutation: CreateTaskMutation;
  private readonly createSecretMutation: CreateSecretMutation;
  private readonly createSessionMutation: CreateSessionMutation;
  private readonly computeProviderDefinitionsQueryResolver: ComputeProviderDefinitionsQueryResolver;
  private readonly computeProviderDefinitionTemplatesResolver: ComputeProviderDefinitionTemplatesResolver;
  private readonly companySettingsQueryResolver: CompanySettingsQueryResolver;
  private readonly deleteArtifactMutation: DeleteArtifactMutation;
  private readonly deleteAgentMutation: DeleteAgentMutation;
  private readonly deleteComputeProviderDefinitionMutation: DeleteComputeProviderDefinitionMutation;
  private readonly deleteEnvironmentMutation: DeleteEnvironmentMutation;
  private readonly getEnvironmentVncUrlMutation: GetEnvironmentVncUrlMutation;
  private readonly deleteGithubInstallationMutation: DeleteGithubInstallationMutation;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
  private readonly deleteSkillMutation: DeleteSkillMutation;
  private readonly deleteSkillGroupMutation: DeleteSkillGroupMutation;
  private readonly deleteTaskCategoryMutation: DeleteTaskCategoryMutation;
  private readonly deleteSessionQueuedMessageMutation: DeleteSessionQueuedMessageMutation;
  private readonly deleteSecretMutation: DeleteSecretMutation;
  private readonly deleteTaskMutation: DeleteTaskMutation;
  private readonly dismissInboxHumanQuestionMutation: DismissInboxHumanQuestionMutation;
  private readonly detachSecretFromAgentMutation: DetachSecretFromAgentMutation;
  private readonly detachSkillGroupFromAgentMutation: DetachSkillGroupFromAgentMutation;
  private readonly detachSkillFromAgentMutation: DetachSkillFromAgentMutation;
  private readonly detachSecretFromSessionMutation: DetachSecretFromSessionMutation;
  private readonly executeTaskMutation: ExecuteTaskMutation;
  private readonly forkSessionMutation: ForkSessionMutation;
  private readonly inboxHumanQuestionsQueryResolver: InboxHumanQuestionsQueryResolver;
  private readonly inboxHumanQuestionsUpdatedSubscriptionResolver: InboxHumanQuestionsUpdatedSubscriptionResolver;
  private readonly interruptSessionMutation: InterruptSessionMutation;
  private readonly promptSessionMutation: PromptSessionMutation;
  private readonly resolveInboxHumanQuestionMutation: ResolveInboxHumanQuestionMutation;
  private readonly refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation;
  private readonly refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly githubAppConfigQueryResolver: GithubAppConfigQueryResolver;
  private readonly githubInstallationsQueryResolver: GithubInstallationsQueryResolver;
  private readonly githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver;
  private readonly githubSkillDirectoriesQueryResolver: GithubSkillDirectoriesQueryResolver;
  private readonly importGithubSkillMutation: ImportGithubSkillMutation;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly markSessionReadMutation: MarkSessionReadMutation;
  private readonly modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;
  private readonly modelProvidersQueryResolver: ModelProvidersQueryResolver;
  private readonly secretsQueryResolver: SecretsQueryResolver;
  private readonly skillGroupsQueryResolver: SkillGroupsQueryResolver;
  private readonly skillQueryResolver: SkillQueryResolver;
  private readonly skillsQueryResolver: SkillsQueryResolver;
  private readonly sessionMessagesQueryResolver: SessionMessagesQueryResolver;
  private readonly sessionEnvironmentQueryResolver: SessionEnvironmentQueryResolver;
  private readonly sessionInboxHumanQuestionsUpdatedSubscriptionResolver: SessionInboxHumanQuestionsUpdatedSubscriptionResolver;
  private readonly sessionQueuedMessagesQueryResolver: SessionQueuedMessagesQueryResolver;
  private readonly sessionMessageUpdatedSubscriptionResolver: SessionMessageUpdatedSubscriptionResolver;
  private readonly sessionQueuedMessagesUpdatedSubscriptionResolver: SessionQueuedMessagesUpdatedSubscriptionResolver;
  private readonly sessionSecretsQueryResolver: SessionSecretsQueryResolver;
  private readonly sessionTranscriptMessagesQueryResolver: SessionTranscriptMessagesQueryResolver;
  private readonly sessionsQueryResolver: SessionsQueryResolver;
  private readonly sessionUpdatedSubscriptionResolver: SessionUpdatedSubscriptionResolver;
  private readonly setTaskCategoryMutation: SetTaskCategoryMutation;
  private readonly setDefaultComputeProviderDefinitionMutation: SetDefaultComputeProviderDefinitionMutation;
  private readonly setDefaultModelProviderCredentialMutation: SetDefaultModelProviderCredentialMutation;
  private readonly setDefaultModelProviderCredentialModelMutation: SetDefaultModelProviderCredentialModelMutation;
  private readonly startEnvironmentMutation: StartEnvironmentMutation;
  private readonly steerSessionQueuedMessageMutation: SteerSessionQueuedMessageMutation;
  private readonly stopEnvironmentMutation: StopEnvironmentMutation;
  private readonly taskQueryResolver: TaskQueryResolver;
  private readonly taskAssignableUsersQueryResolver: TaskAssignableUsersQueryResolver;
  private readonly taskCategoriesQueryResolver: TaskCategoriesQueryResolver;
  private readonly taskRunsQueryResolver: TaskRunsQueryResolver;
  private readonly tasksQueryResolver: TasksQueryResolver;
  private readonly updateAgentMutation: UpdateAgentMutation;
  private readonly updateArtifactMutation: UpdateArtifactMutation;
  private readonly updateCompanySettingsMutation: UpdateCompanySettingsMutation;
  private readonly updateComputeProviderDefinitionMutation: UpdateComputeProviderDefinitionMutation;
  private readonly updateExternalLinkArtifactMutation: UpdateExternalLinkArtifactMutation;
  private readonly updateMarkdownArtifactMutation: UpdateMarkdownArtifactMutation;
  private readonly updateSecretMutation: UpdateSecretMutation;
  private readonly updateSkillMutation: UpdateSkillMutation;
  private readonly updateSessionTitleMutation: UpdateSessionTitleMutation;
  private readonly updateTaskMutation: UpdateTaskMutation;
  private readonly redisService: RedisService;
  private readonly graphqlErrorLogger: GraphqlErrorLogger;

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
    @inject(RedisService) redisService: RedisService = new RedisService(config, new ApiLogger(config)),
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
    @inject(GithubSkillDirectoriesQueryResolver)
    githubSkillDirectoriesQueryResolver?: GithubSkillDirectoriesQueryResolver,
    @inject(CreateGithubInstallationUrlMutation)
    createGithubInstallationUrlMutation: CreateGithubInstallationUrlMutation =
      new CreateGithubInstallationUrlMutation(
        new GithubClient(config),
        new GithubInstallationStateService(config),
      ),
    @inject(AddGithubInstallationMutation)
    addGithubInstallationMutation: AddGithubInstallationMutation =
      new AddGithubInstallationMutation(
        new GithubClient(config),
        new GithubInstallationStateService(config),
        new AppRuntimeDatabase(config),
      ),
    @inject(DeleteGithubInstallationMutation)
    deleteGithubInstallationMutation: DeleteGithubInstallationMutation = new DeleteGithubInstallationMutation(),
    @inject(DeleteSessionQueuedMessageMutation)
    deleteSessionQueuedMessageMutation: DeleteSessionQueuedMessageMutation = new DeleteSessionQueuedMessageMutation(),
    @inject(DeleteTaskMutation) deleteTaskMutation: DeleteTaskMutation = new DeleteTaskMutation(),
    @inject(DismissInboxHumanQuestionMutation)
    dismissInboxHumanQuestionMutation: DismissInboxHumanQuestionMutation = new DismissInboxHumanQuestionMutation({
      async dismissHumanQuestion() {
        throw new Error("DismissInboxHumanQuestion mutation is not configured.");
      },
    } as never),
    @inject(RefreshGithubInstallationRepositoriesMutation)
    refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation =
      new RefreshGithubInstallationRepositoriesMutation(new GithubClient(config)),
    @inject(EnvironmentsQueryResolver) environmentsQueryResolver: EnvironmentsQueryResolver = new EnvironmentsQueryResolver(),
    @inject(AttachSecretToAgentMutation)
    attachSecretToAgentMutation?: AttachSecretToAgentMutation,
    @inject(AttachSkillGroupToAgentMutation)
    attachSkillGroupToAgentMutation?: AttachSkillGroupToAgentMutation,
    @inject(AttachSkillToAgentMutation)
    attachSkillToAgentMutation?: AttachSkillToAgentMutation,
    @inject(AttachSecretToSessionMutation)
    attachSecretToSessionMutation?: AttachSecretToSessionMutation,
    @inject(CreateSecretMutation)
    createSecretMutation?: CreateSecretMutation,
    @inject(DeleteSecretMutation)
    deleteSecretMutation?: DeleteSecretMutation,
    @inject(DetachSecretFromAgentMutation)
    detachSecretFromAgentMutation?: DetachSecretFromAgentMutation,
    @inject(DetachSkillGroupFromAgentMutation)
    detachSkillGroupFromAgentMutation?: DetachSkillGroupFromAgentMutation,
    @inject(DetachSkillFromAgentMutation)
    detachSkillFromAgentMutation?: DetachSkillFromAgentMutation,
    @inject(UpdateSecretMutation)
    updateSecretMutation?: UpdateSecretMutation,
    @inject(DetachSecretFromSessionMutation)
    detachSecretFromSessionMutation?: DetachSecretFromSessionMutation,
    @inject(AgentSecretsQueryResolver)
    agentSecretsQueryResolver?: AgentSecretsQueryResolver,
    @inject(AgentSkillGroupsQueryResolver)
    agentSkillGroupsQueryResolver?: AgentSkillGroupsQueryResolver,
    @inject(AgentSkillsQueryResolver)
    agentSkillsQueryResolver?: AgentSkillsQueryResolver,
    @inject(SecretsQueryResolver)
    secretsQueryResolver?: SecretsQueryResolver,
    @inject(SessionSecretsQueryResolver)
    sessionSecretsQueryResolver?: SessionSecretsQueryResolver,
    @inject(AgentEnvironmentTemplateService)
    agentEnvironmentTemplateService?: AgentEnvironmentTemplateService,
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
    @inject(TaskRunsQueryResolver)
    taskRunsQueryResolver: TaskRunsQueryResolver = new TaskRunsQueryResolver({
      async executeTask() {
        throw new Error("TaskRun service is not configured.");
      },
      async listTaskRuns() {
        throw new Error("TaskRuns query is not configured.");
      },
    } as never),
    @inject(ExecuteTaskMutation)
    executeTaskMutation: ExecuteTaskMutation = new ExecuteTaskMutation({
      async executeTask() {
        throw new Error("ExecuteTask mutation is not configured.");
      },
      async listTaskRuns() {
        throw new Error("TaskRun service is not configured.");
      },
    } as never),
    @inject(UpdateSessionTitleMutation)
    updateSessionTitleMutation: UpdateSessionTitleMutation = new UpdateSessionTitleMutation({
      async updateSessionTitle() {
        throw new Error("UpdateSessionTitle mutation is not configured.");
      },
    } as never),
    @inject(InterruptSessionMutation)
    interruptSessionMutation: InterruptSessionMutation = new InterruptSessionMutation({
      async interruptSession() {
        throw new Error("InterruptSession mutation is not configured.");
      },
    } as never),
    @inject(DeleteTaskCategoryMutation)
    deleteTaskCategoryMutation: DeleteTaskCategoryMutation = new DeleteTaskCategoryMutation(),
    @inject(GraphqlErrorLogger)
    graphqlErrorLogger: GraphqlErrorLogger = new GraphqlErrorLogger(),
    @inject(SetDefaultComputeProviderDefinitionMutation)
    setDefaultComputeProviderDefinitionMutation: SetDefaultComputeProviderDefinitionMutation = {
      async execute() {
        throw new Error("SetDefaultComputeProviderDefinition mutation is not configured.");
      },
    } as never,
    @inject(SetDefaultModelProviderCredentialMutation)
    setDefaultModelProviderCredentialMutation: SetDefaultModelProviderCredentialMutation = {
      async execute() {
        throw new Error("SetDefaultModelProviderCredential mutation is not configured.");
      },
    } as never,
    @inject(SetDefaultModelProviderCredentialModelMutation)
    setDefaultModelProviderCredentialModelMutation: SetDefaultModelProviderCredentialModelMutation = {
      async execute() {
        throw new Error("SetDefaultModelProviderCredentialModel mutation is not configured.");
      },
    } as never,
    @inject(AgentEnvironmentTemplateResolver)
    agentEnvironmentTemplateResolver?: AgentEnvironmentTemplateResolver,
    @inject(ComputeProviderDefinitionTemplatesResolver)
    computeProviderDefinitionTemplatesResolver?: ComputeProviderDefinitionTemplatesResolver,
    @inject(GetEnvironmentVncUrlMutation)
    getEnvironmentVncUrlMutation: GetEnvironmentVncUrlMutation = new GetEnvironmentVncUrlMutation(),
    @inject(ForkSessionMutation)
    forkSessionMutation: ForkSessionMutation = new ForkSessionMutation({
      async forkSession() {
        throw new Error("ForkSession mutation is not configured.");
      },
    } as never),
    @inject(CreateSkillMutation)
    createSkillMutation?: CreateSkillMutation,
    @inject(ImportGithubSkillMutation)
    importGithubSkillMutation?: ImportGithubSkillMutation,
    @inject(UpdateSkillMutation)
    updateSkillMutation?: UpdateSkillMutation,
    @inject(SkillGroupsQueryResolver)
    skillGroupsQueryResolver?: SkillGroupsQueryResolver,
    @inject(SkillQueryResolver)
    skillQueryResolver?: SkillQueryResolver,
    @inject(SkillsQueryResolver)
    skillsQueryResolver?: SkillsQueryResolver,
    @inject(CreateSkillGroupMutation)
    createSkillGroupMutation?: CreateSkillGroupMutation,
    @inject(DeleteSkillMutation)
    deleteSkillMutation?: DeleteSkillMutation,
    @inject(DeleteSkillGroupMutation)
    deleteSkillGroupMutation?: DeleteSkillGroupMutation,
    @inject(SessionInboxHumanQuestionsUpdatedSubscriptionResolver)
    sessionInboxHumanQuestionsUpdatedSubscriptionResolver: SessionInboxHumanQuestionsUpdatedSubscriptionResolver = new SessionInboxHumanQuestionsUpdatedSubscriptionResolver({
      async listOpenHumanQuestionsForSession() {
        throw new Error("SessionInboxHumanQuestionsUpdated subscription is not configured.");
      },
    } as never),
    @inject(InboxHumanQuestionsUpdatedSubscriptionResolver)
    inboxHumanQuestionsUpdatedSubscriptionResolver: InboxHumanQuestionsUpdatedSubscriptionResolver = new InboxHumanQuestionsUpdatedSubscriptionResolver({
      async listOpenHumanQuestions() {
        throw new Error("InboxHumanQuestionsUpdated subscription is not configured.");
      },
    } as never),
  ) {
    const defaultSecretService = new SecretService(new SecretEncryptionService(config));
    const defaultSkillService = new SkillService();
    const defaultGithubSkillService = new GithubSkillService(new GithubClient(config), defaultSkillService);
    const defaultAgentEnvironmentTemplateService = agentEnvironmentTemplateService
      ?? ({
        async getAgentTemplate() {
          return {
            computerUse: true,
            cpuCount: 4,
            diskSpaceGb: 10,
            memoryGb: 8,
            name: "Desktop",
            templateId: "e2b/desktop",
          };
        },
        async listTemplatesForProvider() {
          return [{
            computerUse: true,
            cpuCount: 4,
            diskSpaceGb: 10,
            memoryGb: 8,
            name: "Desktop",
            templateId: "e2b/desktop",
          }];
        },
        async resolveTemplateForProvider(
          _transactionProvider: TransactionProviderInterface,
          input: {
            companyId: string;
            providerDefinitionId: string;
            templateId: string;
          },
        ) {
          if (input.templateId === "e2b/desktop") {
            return {
              computerUse: true,
              cpuCount: 4,
              diskSpaceGb: 10,
              memoryGb: 8,
              name: "Desktop",
              templateId: input.templateId,
            };
          }

          return {
            computerUse: false,
            cpuCount: 4,
            diskSpaceGb: 10,
            memoryGb: 8,
            name: "Default",
            templateId: input.templateId,
          };
        },
      } as never);

    this.configDocument = config;
    this.addAgentMutation = addAgentMutation
      ?? new AddAgentMutation(defaultSecretService, defaultSkillService, defaultAgentEnvironmentTemplateService);
    this.addComputeProviderDefinitionMutation = addComputeProviderDefinitionMutation;
    this.addGithubInstallationMutation = addGithubInstallationMutation;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.archiveArtifactMutation = archiveArtifactMutation;
    this.attachSecretToAgentMutation = attachSecretToAgentMutation
      ?? new AttachSecretToAgentMutation(defaultSecretService);
    this.attachSkillGroupToAgentMutation = attachSkillGroupToAgentMutation
      ?? new AttachSkillGroupToAgentMutation(defaultSkillService);
    this.attachSkillToAgentMutation = attachSkillToAgentMutation
      ?? new AttachSkillToAgentMutation(defaultSkillService);
    this.attachSecretToSessionMutation = attachSecretToSessionMutation
      ?? new AttachSecretToSessionMutation(defaultSecretService);
    this.agentConversationMessagesQueryResolver = agentConversationMessagesQueryResolver;
    this.agentConversationsQueryResolver = agentConversationsQueryResolver;
    this.agentQueryResolver = agentQueryResolver ?? new AgentQueryResolver();
    this.agentCreateOptionsQueryResolver = agentCreateOptionsQueryResolver;
    this.agentEnvironmentTemplateResolver = agentEnvironmentTemplateResolver
      ?? new AgentEnvironmentTemplateResolver(defaultAgentEnvironmentTemplateService);
    this.agentSecretsQueryResolver = agentSecretsQueryResolver
      ?? new AgentSecretsQueryResolver(defaultSecretService);
    this.agentSkillGroupsQueryResolver = agentSkillGroupsQueryResolver
      ?? new AgentSkillGroupsQueryResolver(defaultSkillService);
    this.agentSkillsQueryResolver = agentSkillsQueryResolver
      ?? new AgentSkillsQueryResolver(defaultSkillService);
    this.agentsQueryResolver = agentsQueryResolver;
    this.artifactQueryResolver = artifactQueryResolver;
    this.artifactsQueryResolver = artifactsQueryResolver;
    this.environmentsQueryResolver = environmentsQueryResolver;
    this.archiveSessionMutation = archiveSessionMutation;
    this.createExternalLinkArtifactMutation = createExternalLinkArtifactMutation;
    this.createGithubInstallationUrlMutation = createGithubInstallationUrlMutation;
    this.createMarkdownArtifactMutation = createMarkdownArtifactMutation;
    this.createPullRequestArtifactMutation = createPullRequestArtifactMutation;
    this.createSkillMutation = createSkillMutation ?? new CreateSkillMutation(defaultSkillService);
    this.createSkillGroupMutation = createSkillGroupMutation ?? new CreateSkillGroupMutation(defaultSkillService);
    this.createTaskCategoryMutation = createTaskCategoryMutation;
    this.createTaskMutation = createTaskMutation;
    this.createSecretMutation = createSecretMutation ?? new CreateSecretMutation(defaultSecretService);
    this.createSessionMutation = createSessionMutation;
    this.computeProviderDefinitionsQueryResolver = computeProviderDefinitionsQueryResolver;
    this.computeProviderDefinitionTemplatesResolver = computeProviderDefinitionTemplatesResolver
      ?? new ComputeProviderDefinitionTemplatesResolver(defaultAgentEnvironmentTemplateService);
    this.companySettingsQueryResolver = companySettingsQueryResolver;
    this.deleteArtifactMutation = deleteArtifactMutation;
    this.deleteAgentMutation = deleteAgentMutation;
    this.deleteComputeProviderDefinitionMutation = deleteComputeProviderDefinitionMutation;
    this.deleteEnvironmentMutation = deleteEnvironmentMutation;
    this.getEnvironmentVncUrlMutation = getEnvironmentVncUrlMutation;
    this.startEnvironmentMutation = startEnvironmentMutation;
    this.stopEnvironmentMutation = stopEnvironmentMutation;
    this.deleteGithubInstallationMutation = deleteGithubInstallationMutation;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
    this.deleteSkillMutation = deleteSkillMutation ?? new DeleteSkillMutation(defaultSkillService);
    this.deleteSkillGroupMutation = deleteSkillGroupMutation ?? new DeleteSkillGroupMutation(defaultSkillService);
    this.deleteTaskCategoryMutation = deleteTaskCategoryMutation;
    this.deleteSessionQueuedMessageMutation = deleteSessionQueuedMessageMutation;
    this.deleteSecretMutation = deleteSecretMutation ?? new DeleteSecretMutation(defaultSecretService);
    this.deleteTaskMutation = deleteTaskMutation;
    this.dismissInboxHumanQuestionMutation = dismissInboxHumanQuestionMutation;
    this.detachSecretFromAgentMutation = detachSecretFromAgentMutation
      ?? new DetachSecretFromAgentMutation(defaultSecretService);
    this.detachSkillGroupFromAgentMutation = detachSkillGroupFromAgentMutation
      ?? new DetachSkillGroupFromAgentMutation(defaultSkillService);
    this.detachSkillFromAgentMutation = detachSkillFromAgentMutation
      ?? new DetachSkillFromAgentMutation(defaultSkillService);
    this.updateSecretMutation = updateSecretMutation ?? new UpdateSecretMutation(defaultSecretService);
    this.updateSkillMutation = updateSkillMutation ?? new UpdateSkillMutation(defaultSkillService);
    this.detachSecretFromSessionMutation = detachSecretFromSessionMutation
      ?? new DetachSecretFromSessionMutation(defaultSecretService);
    this.executeTaskMutation = executeTaskMutation;
    this.forkSessionMutation = forkSessionMutation;
    this.inboxHumanQuestionsQueryResolver = inboxHumanQuestionsQueryResolver;
    this.inboxHumanQuestionsUpdatedSubscriptionResolver = inboxHumanQuestionsUpdatedSubscriptionResolver;
    this.interruptSessionMutation = interruptSessionMutation;
    this.promptSessionMutation = promptSessionMutation;
    this.resolveInboxHumanQuestionMutation = resolveInboxHumanQuestionMutation;
    this.refreshModelProviderCredentialModelsMutation = refreshModelProviderCredentialModelsMutation;
    this.refreshGithubInstallationRepositoriesMutation = refreshGithubInstallationRepositoriesMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
    this.githubAppConfigQueryResolver = githubAppConfigQueryResolver;
    this.githubInstallationsQueryResolver = githubInstallationsQueryResolver;
    this.githubRepositoriesQueryResolver = githubRepositoriesQueryResolver;
    this.githubSkillDirectoriesQueryResolver = githubSkillDirectoriesQueryResolver
      ?? new GithubSkillDirectoriesQueryResolver(defaultGithubSkillService);
    this.importGithubSkillMutation = importGithubSkillMutation
      ?? new ImportGithubSkillMutation(defaultGithubSkillService);
    this.meQueryResolver = meQueryResolver;
    this.markSessionReadMutation = markSessionReadMutation;
    this.updateSessionTitleMutation = updateSessionTitleMutation;
    this.modelProviderCredentialModelsQueryResolver = modelProviderCredentialModelsQueryResolver;
    this.modelProviderCredentialsQueryResolver = modelProviderCredentialsQueryResolver;
    this.modelProvidersQueryResolver = modelProvidersQueryResolver;
    this.secretsQueryResolver = secretsQueryResolver ?? new SecretsQueryResolver(defaultSecretService);
    this.skillGroupsQueryResolver = skillGroupsQueryResolver ?? new SkillGroupsQueryResolver(defaultSkillService);
    this.skillQueryResolver = skillQueryResolver ?? new SkillQueryResolver(defaultSkillService);
    this.skillsQueryResolver = skillsQueryResolver ?? new SkillsQueryResolver(defaultSkillService);
    this.sessionMessagesQueryResolver = sessionMessagesQueryResolver;
    this.sessionEnvironmentQueryResolver = sessionEnvironmentQueryResolver;
    this.sessionInboxHumanQuestionsUpdatedSubscriptionResolver = sessionInboxHumanQuestionsUpdatedSubscriptionResolver;
    this.sessionQueuedMessagesQueryResolver = sessionQueuedMessagesQueryResolver;
    this.sessionMessageUpdatedSubscriptionResolver = sessionMessageUpdatedSubscriptionResolver;
    this.sessionQueuedMessagesUpdatedSubscriptionResolver = sessionQueuedMessagesUpdatedSubscriptionResolver;
    this.sessionSecretsQueryResolver = sessionSecretsQueryResolver
      ?? new SessionSecretsQueryResolver(defaultSecretService);
    this.sessionTranscriptMessagesQueryResolver = sessionTranscriptMessagesQueryResolver;
    this.sessionsQueryResolver = sessionsQueryResolver;
    this.sessionUpdatedSubscriptionResolver = sessionUpdatedSubscriptionResolver;
    this.setTaskCategoryMutation = setTaskCategoryMutation;
    this.setDefaultComputeProviderDefinitionMutation = setDefaultComputeProviderDefinitionMutation;
    this.setDefaultModelProviderCredentialMutation = setDefaultModelProviderCredentialMutation;
    this.setDefaultModelProviderCredentialModelMutation = setDefaultModelProviderCredentialModelMutation;
    this.steerSessionQueuedMessageMutation = steerSessionQueuedMessageMutation;
    this.taskQueryResolver = taskQueryResolver;
    this.taskAssignableUsersQueryResolver = taskAssignableUsersQueryResolver;
    this.taskCategoriesQueryResolver = taskCategoriesQueryResolver;
    this.taskRunsQueryResolver = taskRunsQueryResolver;
    this.tasksQueryResolver = tasksQueryResolver;
    this.updateAgentMutation = updateAgentMutation;
    this.updateArtifactMutation = updateArtifactMutation;
    this.updateCompanySettingsMutation = updateCompanySettingsMutation;
    this.updateComputeProviderDefinitionMutation = updateComputeProviderDefinitionMutation;
    this.updateExternalLinkArtifactMutation = updateExternalLinkArtifactMutation;
    this.updateMarkdownArtifactMutation = updateMarkdownArtifactMutation;
    this.updateTaskMutation = updateTaskMutation;
    this.redisService = redisService;
    this.graphqlErrorLogger = graphqlErrorLogger;
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
        Agent: {
          environmentTemplate: this.agentEnvironmentTemplateResolver.execute,
        },
        ComputeProviderDefinition: {
          templates: this.computeProviderDefinitionTemplatesResolver.execute,
        },
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
          GithubSkillDirectories: this.githubSkillDirectoriesQueryResolver.execute,
          health: this.healthQueryResolver.execute,
          InboxHumanQuestions: this.inboxHumanQuestionsQueryResolver.execute,
          Me: this.meQueryResolver.execute,
          ModelProviderCredentialModels: this.modelProviderCredentialModelsQueryResolver.execute,
          ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
          ModelProviders: this.modelProvidersQueryResolver.execute,
          Secrets: this.secretsQueryResolver.execute,
          AgentSkillGroups: this.agentSkillGroupsQueryResolver.execute,
          AgentSkills: this.agentSkillsQueryResolver.execute,
          Skill: this.skillQueryResolver.execute,
          SkillGroups: this.skillGroupsQueryResolver.execute,
          Skills: this.skillsQueryResolver.execute,
          SessionQueuedMessages: this.sessionQueuedMessagesQueryResolver.execute,
          SessionEnvironment: this.sessionEnvironmentQueryResolver.execute,
          Task: this.taskQueryResolver.execute,
          TaskAssignableUsers: this.taskAssignableUsersQueryResolver.execute,
          TaskCategories: this.taskCategoriesQueryResolver.execute,
          TaskRuns: this.taskRunsQueryResolver.execute,
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
          GetEnvironmentVncUrl: this.getEnvironmentVncUrlMutation.execute,
          StartEnvironment: this.startEnvironmentMutation.execute,
          StopEnvironment: this.stopEnvironmentMutation.execute,
          AddGithubInstallation: this.addGithubInstallationMutation.execute,
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          ArchiveArtifact: this.archiveArtifactMutation.execute,
          AttachSecretToAgent: this.attachSecretToAgentMutation.execute,
          AttachSkillGroupToAgent: this.attachSkillGroupToAgentMutation.execute,
          AttachSkillToAgent: this.attachSkillToAgentMutation.execute,
          AttachSecretToSession: this.attachSecretToSessionMutation.execute,
          ArchiveSession: this.archiveSessionMutation.execute,
          CreateExternalLinkArtifact: this.createExternalLinkArtifactMutation.execute,
          CreateGithubInstallationUrl: this.createGithubInstallationUrlMutation.execute,
          ImportGithubSkill: this.importGithubSkillMutation.execute,
          CreateMarkdownArtifact: this.createMarkdownArtifactMutation.execute,
          CreatePullRequestArtifact: this.createPullRequestArtifactMutation.execute,
          CreateSecret: this.createSecretMutation.execute,
          CreateSkill: this.createSkillMutation.execute,
          CreateSkillGroup: this.createSkillGroupMutation.execute,
          CreateTask: this.createTaskMutation.execute,
          CreateTaskCategory: this.createTaskCategoryMutation.execute,
          CreateSession: this.createSessionMutation.execute,
          DeleteArtifact: this.deleteArtifactMutation.execute,
          DeleteAgent: this.deleteAgentMutation.execute,
          DeleteGithubInstallation: this.deleteGithubInstallationMutation.execute,
          DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
          DeleteSkill: this.deleteSkillMutation.execute,
          DeleteSkillGroup: this.deleteSkillGroupMutation.execute,
          DeleteTaskCategory: this.deleteTaskCategoryMutation.execute,
          DeleteSessionQueuedMessage: this.deleteSessionQueuedMessageMutation.execute,
          DeleteSecret: this.deleteSecretMutation.execute,
          DeleteTask: this.deleteTaskMutation.execute,
          DismissInboxHumanQuestion: this.dismissInboxHumanQuestionMutation.execute,
          DetachSecretFromAgent: this.detachSecretFromAgentMutation.execute,
          DetachSkillGroupFromAgent: this.detachSkillGroupFromAgentMutation.execute,
          DetachSkillFromAgent: this.detachSkillFromAgentMutation.execute,
          DetachSecretFromSession: this.detachSecretFromSessionMutation.execute,
          ExecuteTask: this.executeTaskMutation.execute,
          ForkSession: this.forkSessionMutation.execute,
          InterruptSession: this.interruptSessionMutation.execute,
          MarkSessionRead: this.markSessionReadMutation.execute,
          RefreshGithubInstallationRepositories: this.refreshGithubInstallationRepositoriesMutation.execute,
          PromptSession: this.promptSessionMutation.execute,
          UpdateSessionTitle: this.updateSessionTitleMutation.execute,
          ResolveInboxHumanQuestion: this.resolveInboxHumanQuestionMutation.execute,
          RefreshModelProviderCredentialModels: this.refreshModelProviderCredentialModelsMutation.execute,
          SetDefaultComputeProviderDefinition: this.setDefaultComputeProviderDefinitionMutation.execute,
          SetDefaultModelProviderCredential: this.setDefaultModelProviderCredentialMutation.execute,
          SetDefaultModelProviderCredentialModel: this.setDefaultModelProviderCredentialModelMutation.execute,
          SetTaskCategory: this.setTaskCategoryMutation.execute,
          SteerSessionQueuedMessage: this.steerSessionQueuedMessageMutation.execute,
          UpdateAgent: this.updateAgentMutation.execute,
          UpdateArtifact: this.updateArtifactMutation.execute,
          UpdateCompanySettings: this.updateCompanySettingsMutation.execute,
          UpdateComputeProviderDefinition: this.updateComputeProviderDefinitionMutation.execute,
          UpdateExternalLinkArtifact: this.updateExternalLinkArtifactMutation.execute,
          UpdateMarkdownArtifact: this.updateMarkdownArtifactMutation.execute,
          UpdateSecret: this.updateSecretMutation.execute,
          UpdateSkill: this.updateSkillMutation.execute,
          UpdateTask: this.updateTaskMutation.execute,
        },
        Subscription: {
          SessionInboxHumanQuestionsUpdated: {
            subscribe: this.sessionInboxHumanQuestionsUpdatedSubscriptionResolver.subscribe,
            resolve: this.sessionInboxHumanQuestionsUpdatedSubscriptionResolver.resolve,
          },
          InboxHumanQuestionsUpdated: {
            subscribe: this.inboxHumanQuestionsUpdatedSubscriptionResolver.subscribe,
            resolve: this.inboxHumanQuestionsUpdatedSubscriptionResolver.resolve,
          },
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
