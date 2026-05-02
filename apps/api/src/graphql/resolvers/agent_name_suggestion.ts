import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agents } from "../../db/schema.ts";
import { AgentNameSuggestionService, type AgentNameSuggestion } from "../../services/agents/name_suggestion_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Resolver } from "./resolver.ts";

type AgentRecord = {
  name: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Provides identity defaults for the agent creation dialog using company-scoped names so the first
 * suggestion is usually unique without reserving names or adding modal-level locking.
 */
@injectable()
export class AgentNameSuggestionQueryResolver extends Resolver<AgentNameSuggestion> {
  private readonly suggestionService: AgentNameSuggestionService;

  constructor(
    @inject(AgentNameSuggestionService)
    suggestionService: AgentNameSuggestionService = new AgentNameSuggestionService(),
  ) {
    super();
    this.suggestionService = suggestionService;
  }

  protected resolve = async (context: GraphqlRequestContext): Promise<AgentNameSuggestion> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }
    const companyId = context.authSession.company.id;

    return context.app_runtime_transaction_provider.transaction(async (tx) => {
      const selectableDatabase = tx as unknown as SelectableDatabase;
      const agentRecords = await selectableDatabase
        .select({
          name: agents.name,
        })
        .from(agents)
        .where(eq(agents.companyId, companyId)) as AgentRecord[];

      return this.suggestionService.suggest(agentRecords.map((agentRecord) => agentRecord.name));
    });
  };
}
