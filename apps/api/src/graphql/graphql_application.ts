import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AddAgentMutation } from "./mutations/add_agent.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { ArchiveSessionMutation } from "./mutations/archive_session.ts";
import { CreateSessionMutation } from "./mutations/create_session.ts";
import { DeleteAgentMutation } from "./mutations/delete_agent.ts";
import { DeleteModelProviderCredentialMutation } from "./mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "./mutations/refresh_model_provider_credential_models.ts";
import { UpdateAgentMutation } from "./mutations/update_agent.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { AgentQueryResolver } from "./resolvers/agent.ts";
import { AgentCreateOptionsQueryResolver } from "./resolvers/agent_create_options.ts";
import { AgentsQueryResolver } from "./resolvers/agents.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "./resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";
import { ModelProvidersQueryResolver } from "./resolvers/model_providers.ts";
import { SessionsQueryResolver } from "./resolvers/sessions.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable()
export class GraphqlApplication {
  private readonly configDocument: Config;
  private readonly addAgentMutation: AddAgentMutation;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly agentQueryResolver: AgentQueryResolver;
  private readonly agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver;
  private readonly agentsQueryResolver: AgentsQueryResolver;
  private readonly archiveSessionMutation: ArchiveSessionMutation;
  private readonly createSessionMutation: CreateSessionMutation;
  private readonly deleteAgentMutation: DeleteAgentMutation;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
  private readonly refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;
  private readonly modelProvidersQueryResolver: ModelProvidersQueryResolver;
  private readonly sessionsQueryResolver: SessionsQueryResolver;
  private readonly updateAgentMutation: UpdateAgentMutation;

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
    @inject(SessionsQueryResolver) sessionsQueryResolver: SessionsQueryResolver = new SessionsQueryResolver(),
    @inject(ArchiveSessionMutation)
    archiveSessionMutation: ArchiveSessionMutation = new ArchiveSessionMutation({
      async archiveSession() {
        throw new Error("ArchiveSession mutation is not configured.");
      },
    } as never),
  ) {
    this.configDocument = config;
    this.addAgentMutation = addAgentMutation;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.agentQueryResolver = agentQueryResolver;
    this.agentCreateOptionsQueryResolver = agentCreateOptionsQueryResolver;
    this.agentsQueryResolver = agentsQueryResolver;
    this.archiveSessionMutation = archiveSessionMutation;
    this.createSessionMutation = createSessionMutation;
    this.deleteAgentMutation = deleteAgentMutation;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
    this.refreshModelProviderCredentialModelsMutation = refreshModelProviderCredentialModelsMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
    this.meQueryResolver = meQueryResolver;
    this.modelProviderCredentialModelsQueryResolver = modelProviderCredentialModelsQueryResolver;
    this.modelProviderCredentialsQueryResolver = modelProviderCredentialsQueryResolver;
    this.modelProvidersQueryResolver = modelProvidersQueryResolver;
    this.sessionsQueryResolver = sessionsQueryResolver;
    this.updateAgentMutation = updateAgentMutation;
  }

  async register(app: FastifyInstance): Promise<void> {
    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      context: (request) => this.graphqlRequestContextResolver.resolve(request),
      resolvers: {
        Query: {
          Agent: this.agentQueryResolver.execute,
          AgentCreateOptions: this.agentCreateOptionsQueryResolver.execute,
          Agents: this.agentsQueryResolver.execute,
          health: this.healthQueryResolver.execute,
          Me: this.meQueryResolver.execute,
          ModelProviderCredentialModels: this.modelProviderCredentialModelsQueryResolver.execute,
          ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
          ModelProviders: this.modelProvidersQueryResolver.execute,
          Sessions: this.sessionsQueryResolver.execute,
        },
        Mutation: {
          AddAgent: this.addAgentMutation.execute,
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          ArchiveSession: this.archiveSessionMutation.execute,
          CreateSession: this.createSessionMutation.execute,
          DeleteAgent: this.deleteAgentMutation.execute,
          DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
          RefreshModelProviderCredentialModels: this.refreshModelProviderCredentialModelsMutation.execute,
          UpdateAgent: this.updateAgentMutation.execute,
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}
