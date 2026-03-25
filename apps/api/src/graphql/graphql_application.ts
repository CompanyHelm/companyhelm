import mercurius from "mercurius";
import type { FastifyInstance } from "fastify";
import { inject, injectable } from "inversify";
import { Config } from "../config/schema.ts";
import { AddAgentMutation } from "./mutations/add_agent.ts";
import { AddModelProviderCredentialMutation } from "./mutations/add_model_provider_credential.ts";
import { DeleteModelProviderCredentialMutation } from "./mutations/delete_model_provider_credential.ts";
import { RefreshModelProviderCredentialModelsMutation } from "./mutations/refresh_model_provider_credential_models.ts";
import { GraphqlRequestContextResolver } from "./graphql_request_context.ts";
import { GraphqlSchema } from "./schema/graphql_schema.ts";
import { AgentCreateOptionsQueryResolver } from "./resolvers/agent_create_options.ts";
import { AgentsQueryResolver } from "./resolvers/agents.ts";
import { HealthQueryResolver } from "./resolvers/health.ts";
import { MeQueryResolver } from "./resolvers/me.ts";
import { ModelProviderCredentialModelsQueryResolver } from "./resolvers/model_provider_credential_models.ts";
import { ModelProviderCredentialsQueryResolver } from "./resolvers/model_provider_credentials.ts";

/**
 * Registers the GraphQL transport and keeps schema wiring out of the server bootstrap.
 */
@injectable()
export class GraphqlApplication {
  private readonly configDocument: Config;
  private readonly addAgentMutation: AddAgentMutation;
  private readonly addModelProviderCredentialMutation: AddModelProviderCredentialMutation;
  private readonly agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver;
  private readonly agentsQueryResolver: AgentsQueryResolver;
  private readonly deleteModelProviderCredentialMutation: DeleteModelProviderCredentialMutation;
  private readonly refreshModelProviderCredentialModelsMutation: RefreshModelProviderCredentialModelsMutation;
  private readonly graphqlRequestContextResolver: GraphqlRequestContextResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly modelProviderCredentialModelsQueryResolver: ModelProviderCredentialModelsQueryResolver;
  private readonly modelProviderCredentialsQueryResolver: ModelProviderCredentialsQueryResolver;

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
    @inject(AgentCreateOptionsQueryResolver)
    agentCreateOptionsQueryResolver: AgentCreateOptionsQueryResolver = new AgentCreateOptionsQueryResolver(),
    @inject(AgentsQueryResolver) agentsQueryResolver: AgentsQueryResolver = new AgentsQueryResolver(),
  ) {
    this.configDocument = config;
    this.addAgentMutation = addAgentMutation;
    this.addModelProviderCredentialMutation = addModelProviderCredentialMutation;
    this.agentCreateOptionsQueryResolver = agentCreateOptionsQueryResolver;
    this.agentsQueryResolver = agentsQueryResolver;
    this.deleteModelProviderCredentialMutation = deleteModelProviderCredentialMutation;
    this.refreshModelProviderCredentialModelsMutation = refreshModelProviderCredentialModelsMutation;
    this.graphqlRequestContextResolver = graphqlRequestContextResolver;
    this.healthQueryResolver = healthQueryResolver;
    this.meQueryResolver = meQueryResolver;
    this.modelProviderCredentialModelsQueryResolver = modelProviderCredentialModelsQueryResolver;
    this.modelProviderCredentialsQueryResolver = modelProviderCredentialsQueryResolver;
  }

  async register(app: FastifyInstance): Promise<void> {
    await app.register(mercurius, {
      schema: GraphqlSchema.getDocument(),
      context: (request) => this.graphqlRequestContextResolver.resolve(request),
      resolvers: {
        Query: {
          AgentCreateOptions: this.agentCreateOptionsQueryResolver.execute,
          Agents: this.agentsQueryResolver.execute,
          health: this.healthQueryResolver.execute,
          Me: this.meQueryResolver.execute,
          ModelProviderCredentialModels: this.modelProviderCredentialModelsQueryResolver.execute,
          ModelProviderCredentials: this.modelProviderCredentialsQueryResolver.execute,
        },
        Mutation: {
          AddAgent: this.addAgentMutation.execute,
          AddModelProviderCredential: this.addModelProviderCredentialMutation.execute,
          DeleteModelProviderCredential: this.deleteModelProviderCredentialMutation.execute,
          RefreshModelProviderCredentialModels: this.refreshModelProviderCredentialModelsMutation.execute,
        },
      },
      path: this.configDocument.graphql.endpoint,
      graphiql: this.configDocument.graphql.graphiql,
    });
  }
}
