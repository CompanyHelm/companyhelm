import { injectable } from "inversify";
import { AgentGraphqlRegistry } from "./agent_graphql_registry.ts";
import { ArtifactGraphqlRegistry } from "./artifact_graphql_registry.ts";
import { ConversationGraphqlRegistry } from "./conversation_graphql_registry.ts";
import { EnvironmentGraphqlRegistry } from "./environment_graphql_registry.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";
import { ManagementGraphqlRegistry } from "./management_graphql_registry.ts";
import { TaskGraphqlRegistry } from "./task_graphql_registry.ts";

/**
 * Merges the domain resolver fragments into the single resolver object expected by Mercurius while
 * keeping ownership of each schema slice in its respective registry.
 */
@injectable()
export class GraphqlResolverRegistry implements GraphqlRegistryInterface {
  constructor(
    private readonly agentGraphqlRegistry: AgentGraphqlRegistry,
    private readonly artifactGraphqlRegistry: ArtifactGraphqlRegistry,
    private readonly conversationGraphqlRegistry: ConversationGraphqlRegistry,
    private readonly environmentGraphqlRegistry: EnvironmentGraphqlRegistry,
    private readonly managementGraphqlRegistry: ManagementGraphqlRegistry,
    private readonly taskGraphqlRegistry: TaskGraphqlRegistry,
  ) {}

  createResolvers(): GraphqlResolverFragment {
    const fragments = [
      this.agentGraphqlRegistry.createResolvers(),
      this.artifactGraphqlRegistry.createResolvers(),
      this.conversationGraphqlRegistry.createResolvers(),
      this.environmentGraphqlRegistry.createResolvers(),
      this.managementGraphqlRegistry.createResolvers(),
      this.taskGraphqlRegistry.createResolvers(),
    ];
    const mergedResolvers: GraphqlResolverFragment = {};

    for (const fragment of fragments) {
      this.mergeFragment(mergedResolvers, fragment);
    }

    return mergedResolvers;
  }

  getAgentGraphqlRegistry(): AgentGraphqlRegistry {
    return this.agentGraphqlRegistry;
  }

  getConversationGraphqlRegistry(): ConversationGraphqlRegistry {
    return this.conversationGraphqlRegistry;
  }

  getEnvironmentGraphqlRegistry(): EnvironmentGraphqlRegistry {
    return this.environmentGraphqlRegistry;
  }

  private mergeFragment(target: GraphqlResolverFragment, source: GraphqlResolverFragment): void {
    for (const [typeName, resolvers] of Object.entries(source)) {
      target[typeName] = {
        ...(target[typeName] ?? {}),
        ...resolvers,
      };
    }
  }
}
