import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { agents } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteAgentMutationArguments = {
  input: {
    id: string;
  };
};

type AgentRecord = {
  id: string;
  name: string;
  defaultReasoningLevel: string | null;
  systemPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type GraphqlAgentRecord = {
  id: string;
  name: string;
  modelProviderCredentialId: null;
  modelProviderCredentialModelId: null;
  modelProvider: null;
  modelName: null;
  reasoningLevel: string | null;
  systemPrompt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning?(selection?: Record<string, unknown>): Promise<AgentRecord[]>;
    };
  };
};

/**
 * Deletes one company-scoped agent so stale agent configurations can be removed without touching
 * the underlying provider credentials or models.
 */
@injectable()
export class DeleteAgentMutation extends Mutation<DeleteAgentMutationArguments, GraphqlAgentRecord> {
  protected resolve = async (
    arguments_: DeleteAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlAgentRecord> => {
    if (arguments_.input.id.length === 0) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const [agent] = await context.app_runtime_transaction_provider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      return deletableDatabase
        .delete(agents)
        .where(and(
          eq(agents.companyId, context.authSession.company.id),
          eq(agents.id, arguments_.input.id),
        ))
        .returning?.({
          id: agents.id,
          name: agents.name,
          defaultReasoningLevel: agents.default_reasoning_level,
          systemPrompt: agents.system_prompt,
          createdAt: agents.created_at,
          updatedAt: agents.updated_at,
        }) as Promise<AgentRecord[]>;
    });

    if (!agent) {
      throw new Error("Agent not found.");
    }

    return {
      id: agent.id,
      name: agent.name,
      modelProviderCredentialId: null,
      modelProviderCredentialModelId: null,
      modelProvider: null,
      modelName: null,
      reasoningLevel: agent.defaultReasoningLevel,
      systemPrompt: agent.systemPrompt,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    };
  };
}
