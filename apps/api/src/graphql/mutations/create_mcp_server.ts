import { inject, injectable } from "inversify";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import { McpService } from "../../services/mcp/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateMcpServerMutationArguments = {
  input: {
    callTimeoutMs?: number | null;
    description?: string | null;
    enabled?: boolean | null;
    headersText?: string | null;
    name: string;
    url: string;
  };
};

@injectable()
export class CreateMcpServerMutation extends Mutation<CreateMcpServerMutationArguments, GraphqlMcpServerRecord> {
  private readonly mcpService: McpService;

  constructor(@inject(McpService) mcpService: McpService) {
    super();
    this.mcpService = mcpService;
  }

  protected resolve = async (
    arguments_: CreateMcpServerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const server = await this.mcpService.createMcpServer(context.app_runtime_transaction_provider, {
      callTimeoutMs: arguments_.input.callTimeoutMs,
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      enabled: arguments_.input.enabled,
      headersText: arguments_.input.headersText,
      name: arguments_.input.name,
      url: arguments_.input.url,
      userId: context.authSession.user.id,
    });

    return GraphqlMcpServerPresenter.present(server);
  };
}
