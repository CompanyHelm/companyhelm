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
import { AddGithubInstallationMutation } from "./mutations/add_github_installation.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { AttachSecretToAgentMutation } from "./mutations/attach_secret_to_agent.ts";
import { AttachSecretToSessionMutation } from "./mutations/attach_secret_to_session.ts";
import { ArchiveSessionMutation } from "./mutations/archive_session.ts";
import { CreateTaskCategoryMutation } from "./mutations/create_task_category.ts";
import { CreateTaskMutation } from "./mutations/create_task.ts";
import { CreateSecretMutation } from "./mutations/create_secret.ts";
import { CreateSessionMutation } from "./mutations/create_session.ts";
import { DeleteAgentMutation } from "./mutations/delete_agent.ts";
import { DeleteEnvironmentMutation } from "./mutations/delete_environment.ts";
import { DeleteGithubInstallationMutation } from "./mutations/delete_github_installation.ts";
import { DeleteModelProviderCredentialMutation } from "./mutations/delete_model_provider_credential.ts";
import { DeleteSecretMutation } from "./mutations/delete_secret.ts";
import { DetachSecretFromAgentMutation } from "./mutations/detach_secret_from_agent.ts";
import { DetachSecretFromSessionMutation } from "./mutations/detach_secret_from_session.ts";
import { PromptSessionMutation } from "./mutations/prompt_session.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "./mutations/refresh_github_installation_repositories.ts";
import { RefreshModelProviderCredentialModelsMutation } from "./mutations/refresh_model_provider_credential_models.ts";
import { SetTaskCategoryMutation } from "./mutations/set_task_category.ts";
import { StartEnvironmentMutation } from "./mutations/start_environment.ts";
import { StopEnvironmentMutation } from "./mutations/stop_environment.ts";
import { UpdateAgentMutation } from "./mutations/update_agent.ts";
import { UpdateSecretMutation } from "./mutations/update_secret.ts";
import type { GraphqlRequestContext } from "./graphql_request_context.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { AgentQueryResolver } from "./resolvers/agent.ts";
import { AgentCreateOptionsQueryResolver } from "./resolvers/agent_create_options.ts";
import { AgentSecretsQueryResolver } from "./resolvers/agent_secrets.ts";
import { AgentsQueryResolver } from "./resolvers/agents.ts";
import { EnvironmentsQueryResolver } from "./resolvers/environments.ts";
import { GithubAppConfigQueryResolver } from "./resolvers/github_app_config.ts";
import { GithubInstallationsQueryResolver } from "./resolvers/github_installations.ts";
import { GithubRepositoriesQueryResolver } from "./resolvers/github_repositories.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "./resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "./resolvers/model_providers.ts";
import { SecretsQueryResolver } from "./resolvers/secrets.ts";
import { SessionSecretsQueryResolver } from "./resolvers/session_secrets.ts";
import { TaskCategoriesQueryResolver } from "./resolvers/task_categories.ts";
import { TasksQueryResolver } from "./resolvers/tasks.ts";
import { SessionMessagesQueryResolver } from "./resolvers/session_messages.ts";
import { SessionMessageUpdatedSubscriptionResolver } from "./resolvers/session_message_updated.ts";
import { SessionTranscriptMessagesQueryResolver } from "./resolvers/session_transcript_messages.ts";
import { SessionsQueryResolver } from "./resolvers/sessions.ts";
import { SessionUpdatedSubscriptionResolver } from "./resolvers/session_updated.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable()
export class GraphqlApplication {
  private readonly configDocument: Config;
  private readonly addAgentMutation: AddAgentMutation;
  private readonly addGithubInstallationMutation: AddGithubInstallationMutation;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly attachSecretToAgentMutation: AttachSecretToAgentMutation;
  private readonly attachSecretToSessionMutation: AttachSecretToSessionMutation;
  private readonly agentQueryResolver: AgentQueryResolver;
  private readonly agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver;
  private readonly agentSecretsQueryResolver: AgentSecretsQueryResolver;
  private readonly agentsQueryResolver: AgentsQueryResolver;
  private readonly environmentsQueryResolver: EnvironmentsQueryResolver;
  private readonly archiveSessionMutation: ArchiveSessionMutation;
  private readonly createTaskCategoryMutation: CreateTaskCategoryMutation;
  private readonly createTaskMutation: CreateTaskMutation;
  private readonly createSecretMutation: CreateSecretMutation;
  private readonly createSessionMutation: CreateSessionMutation;
  private readonly deleteAgentMutation: DeleteAgentMutation;
  private readonly deleteEnvironmentMutation: DeleteEnvironmentMutation;
  private readonly deleteGithubInstallationMutation: DeleteGithubInstallationMutation;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
  private readonly deleteSecretMutation: DeleteSecretMutation;
  private readonly detachSecretFromAgentMutation: DetachSecretFromAgentMutation;
  private readonly detachSecretFromSessionMutation: DetachSecretFromSessionMutation;
  private readonly promptSessionMutation: PromptSessionMutation;
  private readonly refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation;
  private readonly refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly githubAppConfigQueryResolver: GithubAppConfigQueryResolver;
  private readonly githubInstallationsQueryResolver: GithubInstallationsQueryResolver;
  private readonly githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;
  private readonly modelProvidersQueryResolver: ModelProvidersQueryResolver;
  private readonly secretsQueryResolver: SecretsQueryResolver;
  private readonly sessionMessagesQueryResolver: SessionMessagesQueryResolver;
  private readonly sessionMessageUpdatedSubscriptionResolver: SessionMessageUpdatedSubscriptionResolver;
  private readonly sessionSecretsQueryResolver: SessionSecretsQueryResolver;
  private readonly sessionTranscriptMessagesQueryResolver: SessionTranscriptMessagesQueryResolver;
  private readonly sessionsQueryResolver: SessionsQueryResolver;
  private readonly sessionUpdatedSubscriptionResolver: SessionUpdatedSubscriptionResolver;
  private readonly setTaskCategoryMutation: SetTaskCategoryMutation;
  private readonly startEnvironmentMutation: StartEnvironmentMutation;
  private readonly stopEnvironmentMutation: StopEnvironmentMutation;
  private readonly taskCategoriesQueryResolver: TaskCategoriesQueryResolver;
  private readonly tasksQueryResolver: TasksQueryResolver;
  private readonly updateAgentMutation: UpdateAgentMutation;
  private readonly updateSecretMutation: UpdateSecretMutation;
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
    @inject(AddAgentMutation) addAgentMutation: AddAgentMutation = new AddAgentMutation(),
    @inject(CreateSessionMutation)
    createSessionMutation: CreateSessionMutation = new CreateSessionMutation({
      async createSession() {
        throw new Error("CreateSession mutation is not configured.");
      },
    } as never),
    @inject(AgentQueryResolver) agentQueryResolver: AgentQueryResolver = new AgentQueryResolver(),
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
    @inject(TaskCategoriesQueryResolver)
    taskCategoriesQueryResolver: TaskCategoriesQueryResolver = new TaskCategoriesQueryResolver(),
    @inject(TasksQueryResolver) tasksQueryResolver: TasksQueryResolver = new TasksQueryResolver(),
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
  ) {
    const defaultSecretService = new SecretService(new SecretEncryptionService(config));

    this.configDocument = config;
    this.addAgentMutation = addAgentMutation;
    this.addGithubInstallationMutation = addGithubInstallationMutation;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.attachSecretToAgentMutation = attachSecretToAgentMutation
      ?? new AttachSecretToAgentMutation(defaultSecretService);
    this.attachSecretToSessionMutation = attachSecretToSessionMutation
      ?? new AttachSecretToSessionMutation(defaultSecretService);
    this.agentQueryResolver = agentQueryResolver;
    this.agentCreateOptionsQueryResolver = agentCreateOptionsQueryResolver;
    this.agentSecretsQueryResolver = agentSecretsQueryResolver
      ?? new AgentSecretsQueryResolver(defaultSecretService);
    this.agentsQueryResolver = agentsQueryResolver;
    this.environmentsQueryResolver = environmentsQueryResolver;
    this.archiveSessionMutation = archiveSessionMutation;
    this.createTaskCategoryMutation = createTaskCategoryMutation;
    this.createTaskMutation = createTaskMutation;
    this.createSecretMutation = createSecretMutation ?? new CreateSecretMutation(defaultSecretService);
    this.createSessionMutation = createSessionMutation;
    this.deleteAgentMutation = deleteAgentMutation;
    this.deleteEnvironmentMutation = deleteEnvironmentMutation;
    this.startEnvironmentMutation = startEnvironmentMutation;
    this.stopEnvironmentMutation = stopEnvironmentMutation;
    this.deleteGithubInstallationMutation = deleteGithubInstallationMutation;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
    this.deleteSecretMutation = deleteSecretMutation ?? new DeleteSecretMutation(defaultSecretService);
    this.detachSecretFromAgentMutation = detachSecretFromAgentMutation
      ?? new DetachSecretFromAgentMutation(defaultSecretService);
    this.updateSecretMutation = updateSecretMutation ?? new UpdateSecretMutation(defaultSecretService);
    this.detachSecretFromSessionMutation = detachSecretFromSessionMutation
      ?? new DetachSecretFromSessionMutation(defaultSecretService);
    this.promptSessionMutation = promptSessionMutation;
    this.refreshModelProviderCredentialModelsMutation = refreshModelProviderCredentialModelsMutation;
    this.refreshGithubInstallationRepositoriesMutation = refreshGithubInstallationRepositoriesMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
    this.githubAppConfigQueryResolver = githubAppConfigQueryResolver;
    this.githubInstallationsQueryResolver = githubInstallationsQueryResolver;
    this.githubRepositoriesQueryResolver = githubRepositoriesQueryResolver;
    this.meQueryResolver = meQueryResolver;
    this.modelProviderCredentialModelsQueryResolver = modelProviderCredentialModelsQueryResolver;
    this.modelProviderCredentialsQueryResolver = modelProviderCredentialsQueryResolver;
    this.modelProvidersQueryResolver = modelProvidersQueryResolver;
    this.secretsQueryResolver = secretsQueryResolver ?? new SecretsQueryResolver(defaultSecretService);
    this.sessionMessagesQueryResolver = sessionMessagesQueryResolver;
    this.sessionMessageUpdatedSubscriptionResolver = sessionMessageUpdatedSubscriptionResolver;
    this.sessionSecretsQueryResolver = sessionSecretsQueryResolver
      ?? new SessionSecretsQueryResolver(defaultSecretService);
    this.sessionTranscriptMessagesQueryResolver = sessionTranscriptMessagesQueryResolver;
    this.sessionsQueryResolver = sessionsQueryResolver;
    this.sessionUpdatedSubscriptionResolver = sessionUpdatedSubscriptionResolver;
    this.setTaskCategoryMutation = setTaskCategoryMutation;
    this.taskCategoriesQueryResolver = taskCategoriesQueryResolver;
    this.tasksQueryResolver = tasksQueryResolver;
    this.updateAgentMutation = updateAgentMutation;
    this.redisService = redisService;
  }

  async register(app: FastifyInstance): Promise<void> {
    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      context: (request) => this.graphqlRequestContextResolver.resolve(request),
      subscription: {
        context: async (_socket, request) => {
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
        onDisconnect: async (context) => {
          const resolvedContext = await context.resolveSubscriptionContext?.();
          await resolvedContext?.redisCompanyScopedService?.disconnect();
        },
      },
      resolvers: {
        JSON: GraphQLJSON,
        Query: {
          Agent: this.agentQueryResolver.execute,
          AgentCreateOptions: this.agentCreateOptionsQueryResolver.execute,
          AgentSecrets: this.agentSecretsQueryResolver.execute,
          Agents: this.agentsQueryResolver.execute,
          Environments: this.environmentsQueryResolver.execute,
          GithubAppConfig: this.githubAppConfigQueryResolver.execute,
          GithubInstallations: this.githubInstallationsQueryResolver.execute,
          GithubRepositories: this.githubRepositoriesQueryResolver.execute,
          health: this.healthQueryResolver.execute,
          Me: this.meQueryResolver.execute,
          ModelProviderCredentialModels: this.modelProviderCredentialModelsQueryResolver.execute,
          ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
          ModelProviders: this.modelProvidersQueryResolver.execute,
          Secrets: this.secretsQueryResolver.execute,
          TaskCategories: this.taskCategoriesQueryResolver.execute,
          Tasks: this.tasksQueryResolver.execute,
          SessionMessages: this.sessionMessagesQueryResolver.execute,
          SessionSecrets: this.sessionSecretsQueryResolver.execute,
          SessionTranscriptMessages: this.sessionTranscriptMessagesQueryResolver.execute,
          Sessions: this.sessionsQueryResolver.execute,
        },
        Mutation: {
          AddAgent: this.addAgentMutation.execute,
          DeleteEnvironment: this.deleteEnvironmentMutation.execute,
          StartEnvironment: this.startEnvironmentMutation.execute,
          StopEnvironment: this.stopEnvironmentMutation.execute,
          AddGithubInstallation: this.addGithubInstallationMutation.execute,
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          AttachSecretToAgent: this.attachSecretToAgentMutation.execute,
          AttachSecretToSession: this.attachSecretToSessionMutation.execute,
          ArchiveSession: this.archiveSessionMutation.execute,
          CreateSecret: this.createSecretMutation.execute,
          CreateTask: this.createTaskMutation.execute,
          CreateTaskCategory: this.createTaskCategoryMutation.execute,
          CreateSession: this.createSessionMutation.execute,
          DeleteAgent: this.deleteAgentMutation.execute,
          DeleteGithubInstallation: this.deleteGithubInstallationMutation.execute,
          DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
          DeleteSecret: this.deleteSecretMutation.execute,
          DetachSecretFromAgent: this.detachSecretFromAgentMutation.execute,
          DetachSecretFromSession: this.detachSecretFromSessionMutation.execute,
          RefreshGithubInstallationRepositories: this.refreshGithubInstallationRepositoriesMutation.execute,
          PromptSession: this.promptSessionMutation.execute,
          RefreshModelProviderCredentialModels: this.refreshModelProviderCredentialModelsMutation.execute,
          SetTaskCategory: this.setTaskCategoryMutation.execute,
          UpdateAgent: this.updateAgentMutation.execute,
          UpdateSecret: this.updateSecretMutation.execute,
        },
        Subscription: {
          SessionMessageUpdated: {
            subscribe: this.sessionMessageUpdatedSubscriptionResolver.subscribe,
            resolve: this.sessionMessageUpdatedSubscriptionResolver.resolve,
          },
          SessionUpdated: {
            subscribe: this.sessionUpdatedSubscriptionResolver.subscribe,
            resolve: this.sessionUpdatedSubscriptionResolver.resolve,
          },
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}
