import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { McpRuntimeClient } from "./runtime/client.ts";
import { McpService } from "./service.ts";
import type { McpServerAuthType, McpServerValidationStatus } from "./oauth/types.ts";

export type McpServerValidationResult = {
  errorMessage: string | null;
  status: McpServerValidationStatus;
  toolCount: number | null;
  toolNames: string[];
  validatedAt: Date | null;
};

/**
 * Performs live MCP validation by attempting remote tool discovery with either a draft server
 * definition or a persisted company-scoped MCP server. The result is normalized into a compact
 * status shape that the API can persist and the UI can render without exposing transport internals.
 */
@injectable()
export class McpValidationService {
  private readonly mcpService: McpService;
  private readonly runtimeClient: McpRuntimeClient;

  constructor(
    @inject(McpService) mcpService: McpService,
    @inject(McpRuntimeClient) runtimeClient: McpRuntimeClient = new McpRuntimeClient(),
  ) {
    this.mcpService = mcpService;
    this.runtimeClient = runtimeClient;
  }

  async validateDraft(input: {
    authType: McpServerAuthType;
    callTimeoutMs: number;
    headers: Record<string, string>;
    url: string;
  }): Promise<McpServerValidationResult> {
    if (!this.shouldValidateDraft(input.authType)) {
      return this.buildUnknownResult();
    }

    return this.validateResolvedConfiguration({
      callTimeoutMs: input.callTimeoutMs,
      headers: input.headers,
      url: input.url,
    });
  }

  async validatePersistedServer(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      mcpServerId: string;
    },
  ): Promise<McpServerValidationResult> {
    const server = await this.mcpService.getMcpServer(
      transactionProvider,
      input.companyId,
      input.mcpServerId,
    );
    if (
      (server.authType === "oauth_authorization_code" || server.authType === "oauth_client_credentials")
      && server.oauthConnectionStatus !== "connected"
    ) {
      return this.buildUnknownResult();
    }

    const headers = await this.mcpService.resolveMcpServerRequestHeaders(
      transactionProvider,
      input,
    );
    return this.validateResolvedConfiguration({
      callTimeoutMs: server.callTimeoutMs,
      headers,
      url: server.url,
    });
  }

  private buildUnknownResult(): McpServerValidationResult {
    return {
      errorMessage: null,
      status: "unknown",
      toolCount: null,
      toolNames: [],
      validatedAt: null,
    };
  }

  private classifyFailure(error: unknown): McpServerValidationStatus {
    const normalizedMessage = this.normalizeErrorMessage(error).toLowerCase();
    if (
      normalizedMessage.includes("401")
      || normalizedMessage.includes("403")
      || normalizedMessage.includes("unauthorized")
      || normalizedMessage.includes("forbidden")
      || normalizedMessage.includes("invalid token")
    ) {
      return "auth_error";
    }
    if (
      normalizedMessage.includes("timed out")
      || normalizedMessage.includes("timeout")
      || normalizedMessage.includes("fetch failed")
      || normalizedMessage.includes("network")
      || normalizedMessage.includes("econnrefused")
      || normalizedMessage.includes("enotfound")
      || normalizedMessage.includes("socket")
      || normalizedMessage.includes("connect")
    ) {
      return "network_error";
    }
    if (
      normalizedMessage.includes("500")
      || normalizedMessage.includes("502")
      || normalizedMessage.includes("503")
      || normalizedMessage.includes("504")
      || normalizedMessage.includes("internal server error")
      || normalizedMessage.includes("bad gateway")
      || normalizedMessage.includes("service unavailable")
    ) {
      return "server_error";
    }

    return "protocol_error";
  }

  private normalizeErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    const normalizedMessage = message.trim();
    if (normalizedMessage.length <= 500) {
      return normalizedMessage;
    }

    return `${normalizedMessage.slice(0, 497)}...`;
  }

  private shouldValidateDraft(authType: McpServerAuthType): boolean {
    return authType === "none" || authType === "authorization_header";
  }

  private async validateResolvedConfiguration(input: {
    callTimeoutMs: number;
    headers: Record<string, string>;
    url: string;
  }): Promise<McpServerValidationResult> {
    const validatedAt = new Date();
    try {
      const tools = await this.runtimeClient.listTools({
        callTimeoutMs: input.callTimeoutMs,
        headers: input.headers,
        url: input.url,
      });

      return {
        errorMessage: null,
        status: "ok",
        toolCount: tools.length,
        toolNames: tools.map((tool) => tool.name),
        validatedAt,
      };
    } catch (error) {
      return {
        errorMessage: this.normalizeErrorMessage(error),
        status: this.classifyFailure(error),
        toolCount: null,
        toolNames: [],
        validatedAt,
      };
    }
  }
}
