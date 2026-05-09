import { inject, injectable } from "inversify";
import { McpService } from "../../services/mcp/service.ts";
import { McpValidationService } from "../../services/mcp/validation_service.ts";
import type { McpServerAuthType } from "../../services/mcp/oauth/types.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type ValidateMcpServerDraftMutationArguments = {
  input: {
    authType: McpServerAuthType;
    callTimeoutMs?: number | null;
    headersText?: string | null;
    url: string;
  };
};

type ValidateMcpServerDraftPayload = {
  errorMessage: string | null;
  status: string;
  toolCount: number | null;
  toolNames: string[];
  validatedAt: string | null;
};

/**
 * Validates a draft MCP server definition before it is persisted so the web app can block saving
 * obviously broken manual-auth or unauthenticated servers.
 */
@injectable()
export class ValidateMcpServerDraftMutation extends Mutation<
  ValidateMcpServerDraftMutationArguments,
  ValidateMcpServerDraftPayload
> {
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
    arguments_: ValidateMcpServerDraftMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<ValidateMcpServerDraftPayload> => {
    if (!context.authSession?.company) {
      throw new Error("Authentication required.");
    }

    const draft = this.mcpService.normalizeMcpServerDraft({
      authType: arguments_.input.authType,
      callTimeoutMs: arguments_.input.callTimeoutMs,
      description: null,
      headersText: arguments_.input.headersText,
      name: "draft",
      url: arguments_.input.url,
    });
    const validation = await this.mcpValidationService.validateDraft({
      authType: draft.authType,
      callTimeoutMs: draft.callTimeoutMs,
      headers: draft.headers,
      url: draft.url,
    });

    return {
      errorMessage: validation.errorMessage,
      status: validation.status,
      toolCount: validation.toolCount,
      toolNames: validation.toolNames,
      validatedAt: validation.validatedAt?.toISOString() ?? null,
    };
  };
}
