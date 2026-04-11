import { inject, injectable } from "inversify";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import { McpService } from "../../services/mcp/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DetachMcpServerFromAgentMutationArguments = {
  input: {
    agentId: string;
    mcpServerId: string;
  };
};

@injectable()
export class DetachMcpServerFromAgentMutation extends Mutation<
  DetachMcpServerFromAgentMutationArguments,
  GraphqlMcpServerRecord
> {
  private readonly mcpService: McpService;

  constructor(@inject(McpService) mcpService: McpService) {
    super();
    this.mcpService = mcpService;
  }

  protected resolve = async (
    arguments_: DetachMcpServerFromAgentMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const server = await this.mcpService.detachMcpServerFromAgent(context.app_runtime_transaction_provider, {
      agentId: arguments_.input.agentId,
      companyId: context.authSession.company.id,
      mcpServerId: arguments_.input.mcpServerId,
    });

    return GraphqlMcpServerPresenter.present(server);
  };
}
