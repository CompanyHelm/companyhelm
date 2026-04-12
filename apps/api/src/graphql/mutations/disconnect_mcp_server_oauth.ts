import { and, eq, isNull } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { mcpOauthConnections, mcpOauthSessions } from "../../db/schema.ts";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { McpService } from "../../services/mcp/service.ts";

type DisconnectMcpServerOauthMutationArguments = {
  input: {
    mcpServerId: string;
  };
};

@injectable()
export class DisconnectMcpServerOauthMutation extends Mutation<
  DisconnectMcpServerOauthMutationArguments,
  GraphqlMcpServerRecord
> {
  private readonly mcpService: McpService;

  constructor(@inject(McpService) mcpService: McpService) {
    super();
    this.mcpService = mcpService;
  }

  protected resolve = async (
    arguments_: DisconnectMcpServerOauthMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    await context.app_runtime_transaction_provider.transaction(async (tx) => {
      await tx
        .delete(mcpOauthConnections)
        .where(and(
          eq(mcpOauthConnections.companyId, context.authSession!.company!.id),
          eq(mcpOauthConnections.mcpServerId, arguments_.input.mcpServerId),
        ));

      await tx
        .delete(mcpOauthSessions)
        .where(and(
          eq(mcpOauthSessions.companyId, context.authSession!.company!.id),
          eq(mcpOauthSessions.mcpServerId, arguments_.input.mcpServerId),
          isNull(mcpOauthSessions.completedAt),
        ));
    });

    const server = await this.mcpService.getMcpServer(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.mcpServerId,
    );

    return GraphqlMcpServerPresenter.present(server);
  };
}
