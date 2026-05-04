import { inject, injectable } from "inversify";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import { McpService } from "../../services/mcp/service.ts";
import { McpValidationService } from "../../services/mcp/validation_service.ts";
import type { McpServerAuthType } from "../../services/mcp/oauth/types.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateMcpServerMutationArguments = {
  input: {
    authType?: McpServerAuthType | null;
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
  private readonly mcpValidationService: McpValidationService;

  constructor(
    @inject(McpService) mcpService: McpService,
    @inject(McpValidationService) mcpValidationService: McpValidationService,
  ) {
    super();
    this.mcpService = mcpService;
    this.mcpValidationService = mcpValidationService;
  }

  protected resolve = async (
    arguments_: CreateMcpServerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const draft = this.mcpService.normalizeMcpServerDraft({
      authType: arguments_.input.authType,
      callTimeoutMs: arguments_.input.callTimeoutMs,
      description: arguments_.input.description,
      headersText: arguments_.input.headersText,
      name: arguments_.input.name,
      url: arguments_.input.url,
    });
    const validation = await this.mcpValidationService.validateDraft({
      authType: draft.authType,
      callTimeoutMs: draft.callTimeoutMs,
      headers: draft.headers,
      url: draft.url,
    });
    if (validation.status !== "ok" && validation.status !== "unknown") {
      throw new Error(validation.errorMessage ?? "Unable to validate MCP server.");
    }

    const server = await this.mcpService.createMcpServer(context.app_runtime_transaction_provider, {
      authType: arguments_.input.authType,
      callTimeoutMs: arguments_.input.callTimeoutMs,
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      enabled: arguments_.input.enabled,
      headersText: arguments_.input.headersText,
      name: arguments_.input.name,
      url: arguments_.input.url,
      userId: context.authSession.user.id,
    });

    const validatedServer = await this.mcpService.updateMcpServerValidation(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      lastValidatedAt: validation.validatedAt,
      lastValidationError: validation.errorMessage,
      lastValidationStatus: validation.status,
      lastValidationToolCount: validation.toolCount,
      mcpServerId: server.id,
      userId: context.authSession.user.id,
    });

    return GraphqlMcpServerPresenter.present(validatedServer);
  };
}
