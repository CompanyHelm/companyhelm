import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import GraphQLJSON from "graphql-type-json";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { GithubClient } from "../github/client.ts";
import { RedisService } from "../services/redis/service.ts";
import { RedisCompanyScopedService } from "../services/redis/company_scoped_service.ts";
import { AddAgentMutation } from "./mutations/add_agent.ts";
import { AddGithubInstallationMutation } from "./mutations/add_github_installation.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { ArchiveSessionMutation } from "./mutations/archive_session.ts";
import { CreateTaskCategoryMutation } from "./mutations/create_task_category.ts";
import { CreateTaskMutation } from "./mutations/create_task.ts";
import { CreateSessionMutation } from "./mutations/create_session.ts";
import { DeleteAgentMutation } from "./mutations/delete_agent.ts";
import { DeleteGithubInstallationMutation } from "./mutations/delete_github_installation.ts";
import { DeleteModelProviderCredentialMutation } from "./mutations/delete_model_provider_credential.ts";
import { PromptSessionMutation } from "./mutations/prompt_session.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "./mutations/refresh_github_installation_repositories.ts";
import { RefreshModelProviderCredentialModelsMutation } from "./mutations/refresh_model_provider_credential_models.ts";
import { SetTaskCategoryMutation } from "./mutations/set_task_category.ts";
import { UpdateAgentMutation } from "./mutations/update_agent.ts";
import type { GraphqlRequestContext } from "./graphql_request_context.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { AgentQueryResolver } from "./resolvers/agent.ts";
import { AgentCreateOptionsQueryResolver } from "./resolvers/agent_create_options.ts";
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
  private readonly agentQueryResolver: AgentQueryResolver;
  private readonly agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver;
  private readonly agentsQueryResolver: AgentsQueryResolver;
  private readonly environmentsQueryResolver: EnvironmentsQueryResolver;
  private readonly archiveSessionMutation: ArchiveSessionMutation;
  private readonly createTaskCategoryMutation: CreateTaskCategoryMutation;
  private readonly createTaskMutation: CreateTaskMutation;
  private readonly createSessionMutation: CreateSessionMutation;
  private readonly deleteAgentMutation: DeleteAgentMutation;
  private readonly deleteGithubInstallationMutation: DeleteGithubInstallationMutation;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
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
  private readonly sessionMessagesQueryResolver: SessionMessagesQueryResolver;
  private readonly sessionMessageUpdatedSubscriptionResolver: SessionMessageUpdatedSubscriptionResolver;
  private readonly sessionTranscriptMessagesQueryResolver: SessionTranscriptMessagesQueryResolver;
  private readonly sessionsQueryResolver: SessionsQueryResolver;
  private readonly sessionUpdatedSubscriptionResolver: SessionUpdatedSubscriptionResolver;
  private readonly setTaskCategoryMutation: SetTaskCategoryMutation;
  private readonly taskCategoriesQueryResolver: TaskCategoriesQueryResolver;
  private readonly tasksQueryResolver: TasksQueryResolver;
  private readonly updateAgentMutation: UpdateAgentMutation;
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
  ) {
    this.configDocument = config;
    this.addAgentMutation = addAgentMutation;
    this.addGithubInstallationMutation = addGithubInstallationMutation;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.agentQueryResolver = agentQueryResolver;
    this.agentCreateOptionsQueryResolver = agentCreateOptionsQueryResolver;
    this.agentsQueryResolver = agentsQueryResolver;
    this.environmentsQueryResolver = environmentsQueryResolver;
    this.archiveSessionMutation = archiveSessionMutation;
    this.createTaskCategoryMutation = createTaskCategoryMutation;
    this.createTaskMutation = createTaskMutation;
    this.createSessionMutation = createSessionMutation;
    this.deleteAgentMutation = deleteAgentMutation;
    this.deleteGithubInstallationMutation = deleteGithubInstallationMutation;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
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
    this.sessionMessagesQueryResolver = sessionMessagesQueryResolver;
    this.sessionMessageUpdatedSubscriptionResolver = sessionMessageUpdatedSubscriptionResolver;
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
          TaskCategories: this.taskCategoriesQueryResolver.execute,
          Tasks: this.tasksQueryResolver.execute,
          SessionMessages: this.sessionMessagesQueryResolver.execute,
          SessionTranscriptMessages: this.sessionTranscriptMessagesQueryResolver.execute,
          Sessions: this.sessionsQueryResolver.execute,
        },
        Mutation: {
          AddAgent: this.addAgentMutation.execute,
          AddGithubInstallation: this.addGithubInstallationMutation.execute,
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          ArchiveSession: this.archiveSessionMutation.execute,
          CreateTask: this.createTaskMutation.execute,
          CreateTaskCategory: this.createTaskCategoryMutation.execute,
          CreateSession: this.createSessionMutation.execute,
          DeleteAgent: this.deleteAgentMutation.execute,
          DeleteGithubInstallation: this.deleteGithubInstallationMutation.execute,
          DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
          RefreshGithubInstallationRepositories: this.refreshGithubInstallationRepositoriesMutation.execute,
          PromptSession: this.promptSessionMutation.execute,
          RefreshModelProviderCredentialModels: this.refreshModelProviderCredentialModelsMutation.execute,
          SetTaskCategory: this.setTaskCategoryMutation.execute,
          UpdateAgent: this.updateAgentMutation.execute,
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
