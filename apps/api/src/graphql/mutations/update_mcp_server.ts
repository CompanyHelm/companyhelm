import { inject, injectable } from "inversify";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import { McpService } from "../../services/mcp/service.ts";
import { McpValidationService } from "../../services/mcp/validation_service.ts";
import type { McpServerAuthType } from "../../services/mcp/oauth/types.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type UpdateMcpServerMutationArguments = {
  input: {
    authType?: McpServerAuthType | null;
    callTimeoutMs?: number | null;
    description?: string | null;
    enabled?: boolean | null;
    headersText?: string | null;
    id: string;
    name?: string | null;
    url?: string | null;
  };
};

@injectable()
export class UpdateMcpServerMutation extends Mutation<UpdateMcpServerMutationArguments, GraphqlMcpServerRecord> {
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
    arguments_: UpdateMcpServerMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const existingServer = await this.mcpService.getMcpServer(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.id,
    );
    const nextAuthType = arguments_.input.authType ?? existingServer.authType;
    const didChangeConnectivityConfig = arguments_.input.authType !== undefined
      || arguments_.input.callTimeoutMs !== undefined
      || arguments_.input.headersText !== undefined
      || arguments_.input.url != null;
    const shouldValidateDraft = didChangeConnectivityConfig
      && (nextAuthType === "none" || nextAuthType === "authorization_header");
    const draft = shouldValidateDraft
      ? this.mcpService.normalizeMcpServerDraft({
        authType: arguments_.input.authType ?? existingServer.authType,
        callTimeoutMs: arguments_.input.callTimeoutMs ?? existingServer.callTimeoutMs,
        description: arguments_.input.description ?? existingServer.description,
        headersText: arguments_.input.headersText === undefined
          ? Object.entries(existingServer.headers)
            .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
            .map(([name, value]) => `${name}: ${value}`)
            .join("\n")
          : arguments_.input.headersText,
        name: arguments_.input.name ?? existingServer.name,
        url: arguments_.input.url ?? existingServer.url,
      })
      : null;
    const validation = draft
      ? await this.mcpValidationService.validateDraft({
        authType: draft.authType,
        callTimeoutMs: draft.callTimeoutMs,
        headers: draft.headers,
        url: draft.url,
      })
      : null;
    if (validation && validation.status !== "ok" && validation.status !== "unknown") {
      throw new Error(validation.errorMessage ?? "Unable to validate MCP server.");
    }

    const server = await this.mcpService.updateMcpServer(context.app_runtime_transaction_provider, {
      authType: arguments_.input.authType,
      callTimeoutMs: arguments_.input.callTimeoutMs,
      companyId: context.authSession.company.id,
      description: arguments_.input.description,
      enabled: arguments_.input.enabled,
      headersText: arguments_.input.headersText,
      mcpServerId: arguments_.input.id,
      name: arguments_.input.name,
      url: arguments_.input.url,
      userId: context.authSession.user.id,
    });

    const validatedServer = await this.mcpService.updateMcpServerValidation(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      lastValidatedAt: validation
        ? validation.validatedAt
        : didChangeConnectivityConfig
          ? null
          : existingServer.lastValidatedAt,
      lastValidationError: validation
        ? validation.errorMessage
        : didChangeConnectivityConfig
          ? null
          : existingServer.lastValidationError,
      lastValidationStatus: validation
        ? validation.status
        : didChangeConnectivityConfig
          ? "unknown"
          : existingServer.lastValidationStatus,
      lastValidationToolCount: validation
        ? validation.toolCount
        : didChangeConnectivityConfig
          ? null
          : existingServer.lastValidationToolCount,
      mcpServerId: server.id,
      userId: context.authSession.user.id,
    });

    return GraphqlMcpServerPresenter.present(validatedServer);
  };
}
