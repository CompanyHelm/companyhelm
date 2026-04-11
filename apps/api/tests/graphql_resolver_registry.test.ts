import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { Container } from "inversify";
import { AgentGraphqlRegistry } from "../src/graphql/registries/agent_graphql_registry.ts";
import { ArtifactGraphqlRegistry } from "../src/graphql/registries/artifact_graphql_registry.ts";
import { ConversationGraphqlRegistry } from "../src/graphql/registries/conversation_graphql_registry.ts";
import { EnvironmentGraphqlRegistry } from "../src/graphql/registries/environment_graphql_registry.ts";
import { GraphqlResolverRegistry } from "../src/graphql/registries/graphql_resolver_registry.ts";
import { ManagementGraphqlRegistry } from "../src/graphql/registries/management_graphql_registry.ts";
import { TaskGraphqlRegistry } from "../src/graphql/registries/task_graphql_registry.ts";

class GraphqlResolverRegistryTestHarness {
  static createContainer(): Container {
    const container = new Container();

    container.bind(AgentGraphqlRegistry).toConstantValue({
      createResolvers: () => ({
        Query: {
          Agent: "agent-query",
        },
      }),
    } as unknown as AgentGraphqlRegistry);
    container.bind(ArtifactGraphqlRegistry).toConstantValue({
      createResolvers: () => ({
        Mutation: {
          CreateArtifact: "artifact-mutation",
        },
      }),
    } as unknown as ArtifactGraphqlRegistry);
    container.bind(ConversationGraphqlRegistry).toConstantValue({
      createResolvers: () => ({
        Subscription: {
          SessionUpdated: "conversation-subscription",
        },
      }),
    } as unknown as ConversationGraphqlRegistry);
    container.bind(EnvironmentGraphqlRegistry).toConstantValue({
      createResolvers: () => ({
        Query: {
          Environments: "environment-query",
        },
      }),
    } as unknown as EnvironmentGraphqlRegistry);
    container.bind(ManagementGraphqlRegistry).toConstantValue({
      createResolvers: () => ({
        Query: {
          Me: "management-query",
        },
      }),
    } as unknown as ManagementGraphqlRegistry);
    container.bind(TaskGraphqlRegistry).toConstantValue({
      createResolvers: () => ({
        Mutation: {
          CreateTask: "task-mutation",
        },
      }),
    } as unknown as TaskGraphqlRegistry);
    container.bind(GraphqlResolverRegistry).toSelf();

    return container;
  }
}

test("GraphqlResolverRegistry resolves from explicit constructor injections", () => {
  const container = GraphqlResolverRegistryTestHarness.createContainer();

  const registry = container.get(GraphqlResolverRegistry);

  assert.deepEqual(registry.createResolvers(), {
    Mutation: {
      CreateArtifact: "artifact-mutation",
      CreateTask: "task-mutation",
    },
    Query: {
      Agent: "agent-query",
      Environments: "environment-query",
      Me: "management-query",
    },
    Subscription: {
      SessionUpdated: "conversation-subscription",
    },
  });
});
