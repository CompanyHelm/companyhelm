import { inject, injectable } from "inversify";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import { McpService } from "../../services/mcp/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type AgentMcpServersQueryArguments = {
  agentId: string;
};

@injectable()
export class AgentMcpServersQueryResolver {
  private readonly mcpService: McpService;

  constructor(@inject(McpService) mcpService: McpService) {
    this.mcpService = mcpService;
  }

  execute = async (
    _root: unknown,
    arguments_: AgentMcpServersQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord[]> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const records = await this.mcpService.listAgentMcpServers(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.agentId,
    );

    return records.map((record) => GraphqlMcpServerPresenter.present(record));
  };
}
