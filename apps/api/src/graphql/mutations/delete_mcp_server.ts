import { inject, injectable } from "inversify";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import { McpService } from "../../services/mcp/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type DeleteMcpServerMutationArguments = {
  input: {
    id: string;
  };
};

@injectable()
export class DeleteMcpServerMutation extends Mutation<DeleteMcpServerMutationArguments, GraphqlMcpServerRecord> {
  private readonly mcpService: McpService;

  constructor(@inject(McpService) mcpService: McpService) {
    super();
    this.mcpService = mcpService;
  }

  protected resolve = async (
    arguments_: DeleteMcpServerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const server = await this.mcpService.deleteMcpServer(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );

    return GraphqlMcpServerPresenter.present(server);
  };
}
