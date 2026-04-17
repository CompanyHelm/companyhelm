import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { AgentEnvironmentCatalogService } from "../../services/environments/catalog_service.ts";
import { EnvironmentTerminalConnectionTokenService } from "../../services/environments/terminal/connection_token_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type CreateEnvironmentTerminalConnectionMutationArguments = {
  input: {
    columns?: number | null;
    id: string;
    rows?: number | null;
  };
};

type GraphqlEnvironmentTerminalConnectionRecord = {
  environmentId: string;
  expiresAt: string;
  terminalSessionId: string;
  websocketUrl: string;
};

/**
 * Creates a short-lived browser websocket grant for a single environment terminal. The websocket
 * URL is intentionally minted only after normal GraphQL auth so browsers never place Clerk bearer
 * tokens in query strings.
 */
@injectable()
export class CreateEnvironmentTerminalConnectionMutation extends Mutation<
  CreateEnvironmentTerminalConnectionMutationArguments,
  GraphqlEnvironmentTerminalConnectionRecord
> {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly config: Config;
  private readonly tokenService: EnvironmentTerminalConnectionTokenService;

  constructor(
    @inject(Config) config: Config,
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService = new AgentEnvironmentCatalogService(),
    @inject(EnvironmentTerminalConnectionTokenService)
    tokenService: EnvironmentTerminalConnectionTokenService = new EnvironmentTerminalConnectionTokenService(),
  ) {
    super();
    this.catalogService = catalogService;
    this.config = config;
    this.tokenService = tokenService;
  }

  protected resolve = async (
    arguments_: CreateEnvironmentTerminalConnectionMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlEnvironmentTerminalConnectionRecord> => {
    const environmentId = String(arguments_.input.id || "").trim();
    if (environmentId.length === 0) {
      throw new Error("id is required.");
    }
    if (!context.authSession?.company || !context.authSession.user) {
      throw new Error("Authentication required.");
    }
    if (!context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    const environment = await this.catalogService.loadEnvironmentById(
      context.app_runtime_transaction_provider,
      environmentId,
    );
    if (!environment || environment.companyId !== context.authSession.company.id) {
      throw new Error("Environment not found.");
    }
    if (environment.provider !== "e2b") {
      throw new Error("Web terminal streaming is only supported for E2B environments.");
    }

    const terminalSessionId = CreateEnvironmentTerminalConnectionMutation.createTerminalSessionId(
      context.authSession.user.id,
    );
    const grant = this.tokenService.createGrant({
      columns: CreateEnvironmentTerminalConnectionMutation.resolveDimension(arguments_.input.columns, 120),
      companyId: context.authSession.company.id,
      environmentId: environment.id,
      rows: CreateEnvironmentTerminalConnectionMutation.resolveDimension(arguments_.input.rows, 36),
      terminalSessionId,
      userId: context.authSession.user.id,
    });

    return {
      environmentId: environment.id,
      expiresAt: grant.expiresAt.toISOString(),
      terminalSessionId,
      websocketUrl: this.createWebsocketUrl(grant.token),
    };
  };

  private createWebsocketUrl(token: string): string {
    const websocketUrl = new URL("/environment-terminal", this.config.publicUrl);
    websocketUrl.protocol = websocketUrl.protocol === "https:" ? "wss:" : "ws:";
    websocketUrl.searchParams.set("token", token);
    return websocketUrl.toString();
  }

  private static createTerminalSessionId(userId: string): string {
    const safeUserId = userId.replace(/[^A-Za-z0-9_]/gu, "").slice(0, 32);
    return `companyhelm-web-${safeUserId || "user"}`;
  }

  private static resolveDimension(value: unknown, fallback: number): number {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue)) {
      return fallback;
    }

    return Math.min(300, Math.max(8, numericValue));
  }
}
