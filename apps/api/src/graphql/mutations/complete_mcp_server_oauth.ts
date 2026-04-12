import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import { companyMembers } from "../../db/schema.ts";
import { AppRuntimeTransactionProvider } from "../../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { McpOauthCompleteConnectionService } from "../../services/mcp/oauth/complete_connection_service.ts";
import { McpOauthStateService } from "../../services/mcp/oauth/state_service.ts";
import { GraphqlMcpServerPresenter, type GraphqlMcpServerRecord } from "../mcp_server_presenter.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";
import { McpService } from "../../services/mcp/service.ts";

type CompleteMcpServerOauthMutationArguments = {
  input: {
    code: string;
    state: string;
  };
};

type CompleteMcpServerOauthPayload = {
  mcpServer: GraphqlMcpServerRecord;
  organizationSlug: string;
};

type CompanyScopedDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
      };
    };
  };
};

@injectable()
export class CompleteMcpServerOauthMutation extends Mutation<
  CompleteMcpServerOauthMutationArguments,
  CompleteMcpServerOauthPayload
> {
  private readonly appRuntimeDatabase: AppRuntimeDatabase;
  private readonly completeConnectionService: McpOauthCompleteConnectionService;
  private readonly logger: ApiLogger;
  private readonly mcpService: McpService;
  private readonly stateService: McpOauthStateService;

  constructor(
    @inject(AppRuntimeDatabase) appRuntimeDatabase: AppRuntimeDatabase,
    @inject(McpOauthCompleteConnectionService)
    completeConnectionService: McpOauthCompleteConnectionService,
    @inject(McpOauthStateService) stateService: McpOauthStateService,
    @inject(McpService) mcpService: McpService,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    super();
    this.appRuntimeDatabase = appRuntimeDatabase;
    this.completeConnectionService = completeConnectionService;
    this.logger = logger;
    this.mcpService = mcpService;
    this.stateService = stateService;
  }

  protected resolve = async (
    arguments_: CompleteMcpServerOauthMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CompleteMcpServerOauthPayload> => {
    if (!context.authSession) {
      throw new Error("Authentication required.");
    }

    try {
      const stateValue = this.stateService.readState(arguments_.input.state);
      if (stateValue.userId !== context.authSession.user.id) {
        throw new Error("MCP OAuth state does not match the authenticated user.");
      }

      const result = await this.appRuntimeDatabase.withCompanyContext(stateValue.companyId, async (database) => {
        await this.ensureMembership(database as CompanyScopedDatabase, {
          companyId: stateValue.companyId,
          userId: context.authSession!.user.id,
        });

        return this.completeConnectionService.completeConnection({
          authenticatedUserId: context.authSession!.user.id,
          code: arguments_.input.code,
          database: database as never,
          state: arguments_.input.state,
        });
      });

      const server = await this.mcpService.getMcpServer(
        new AppRuntimeTransactionProvider(this.appRuntimeDatabase, result.companyId),
        result.companyId,
        result.mcpServerId,
      );

      return {
        mcpServer: GraphqlMcpServerPresenter.present(server),
        organizationSlug: result.organizationSlug,
      };
    } catch (error) {
      this.logger.getLogger().error({
        error: error instanceof Error ? error.message : "Unknown MCP OAuth completion failure.",
      }, "failed to complete mcp oauth");
      throw new Error("Unable to complete MCP OAuth authorization.", {
        cause: error,
      });
    }
  };

  private async ensureMembership(
    database: CompanyScopedDatabase,
    input: {
      companyId: string;
      userId: string;
    },
  ): Promise<void> {
    const [membership] = await database
      .select({
        userId: companyMembers.userId,
      })
      .from(companyMembers)
      .where(and(
        eq(companyMembers.companyId, input.companyId),
        eq(companyMembers.userId, input.userId),
      ))
      .limit(1) as Array<{ userId: string }>;

    if (!membership) {
      throw new Error("Authenticated user is not a member of the target company.");
    }
  }
}
