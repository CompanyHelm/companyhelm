import { inject, injectable } from "inversify";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { McpService } from "../../services/mcp/service.ts";
import { McpOauthClientCredentialsConnectionService } from "../../services/mcp/oauth/client_credentials_connection.ts";
import { McpValidationService } from "../../services/mcp/validation_service.ts";
import { Mutation } from "./mutation.ts";

type ConnectMcpServerOauthClientCredentialsMutationArguments = {
  input: {
    mcpServerId: string;
    oauthClientId?: string | null;
    oauthClientSecret?: string | null;
    requestedScopes?: string[] | null;
  };
};

/**
 * Connects an MCP server with the OAuth client-credentials grant and persists the resulting token
 * metadata so runtime MCP calls can reuse the encrypted client configuration.
 */
@injectable()
export class ConnectMcpServerOauthClientCredentialsMutation extends Mutation<
  ConnectMcpServerOauthClientCredentialsMutationArguments,
  GraphqlMcpServerRecord
> {
  private readonly clientCredentialsConnectionService: McpOauthClientCredentialsConnectionService;
  private readonly mcpService: McpService;
  private readonly mcpValidationService: McpValidationService;

  constructor(
    @inject(McpService) mcpService: McpService,
    @inject(McpOauthClientCredentialsConnectionService)
    clientCredentialsConnectionService: McpOauthClientCredentialsConnectionService,
    @inject(McpValidationService) mcpValidationService: McpValidationService,
  ) {
    super();
    this.clientCredentialsConnectionService = clientCredentialsConnectionService;
    this.mcpService = mcpService;
    this.mcpValidationService = mcpValidationService;
  }

  protected resolve = async (
    arguments_: ConnectMcpServerOauthClientCredentialsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlMcpServerRecord> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const server = await this.mcpService.getMcpServer(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      arguments_.input.mcpServerId,
    );
    if (server.authType !== "oauth_client_credentials") {
      throw new Error("MCP server must be configured for OAuth client credentials before connecting.");
    }

    await context.app_runtime_transaction_provider.transaction(async (tx) => {
      await this.clientCredentialsConnectionService.connect({
        authenticatedUserId: context.authSession!.user.id,
        companyId: context.authSession!.company!.id,
        database: tx as never,
        mcpServerId: server.id,
        oauthClientId: arguments_.input.oauthClientId,
        oauthClientSecret: arguments_.input.oauthClientSecret,
        requestedScopes: arguments_.input.requestedScopes,
        serverUrl: server.url,
      });
    });

    const validation = await this.mcpValidationService.validatePersistedServer(
      context.app_runtime_transaction_provider,
      {
        companyId: context.authSession.company.id,
        mcpServerId: server.id,
      },
    );
    await this.mcpService.updateMcpServerValidation(context.app_runtime_transaction_provider, {
      companyId: context.authSession.company.id,
      lastValidatedAt: validation.validatedAt,
      lastValidationError: validation.errorMessage,
      lastValidationStatus: validation.status,
      lastValidationToolCount: validation.toolCount,
      mcpServerId: server.id,
      userId: context.authSession.user.id,
    });

    const connectedServer = await this.mcpService.getMcpServer(
      context.app_runtime_transaction_provider,
      context.authSession.company.id,
      server.id,
    );

    return GraphqlMcpServerPresenter.present(connectedServer);
  };
}
