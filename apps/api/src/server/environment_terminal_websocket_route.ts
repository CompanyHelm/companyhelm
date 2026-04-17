import type { FastifyInstance } from "fastify";
import { inject, injectable } from "inversify";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { AppRuntimeTransactionProvider } from "../db/app_runtime_transaction_provider.ts";
import { ApiLogger } from "../log/api_logger.ts";
import { AgentEnvironmentCatalogService } from "../services/environments/catalog_service.ts";
import { EnvironmentTerminalConnectionTokenService } from "../services/environments/terminal/connection_token_service.ts";
import { EnvironmentE2bTerminalBridge } from "../services/environments/terminal/e2b_terminal_bridge.ts";

type EnvironmentTerminalClientMessage = {
  columns?: number;
  data?: string;
  rows?: number;
  type?: string;
};

type EnvironmentTerminalRawMessage = Buffer | ArrayBuffer | Buffer[];

/**
 * Owns the authenticated websocket endpoint that streams terminal bytes between xterm.js and E2B.
 * The route consumes a one-time grant created through GraphQL, then keeps terminal traffic off the
 * GraphQL websocket so keystrokes and ANSI output do not compete with application subscriptions.
 */
@injectable()
export class EnvironmentTerminalWebsocketRoute {
  private static readonly ROUTE_PATH = "/environment-terminal";
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly database: AppRuntimeDatabase;
  private readonly logger: ApiLogger;
  private readonly terminalBridge: EnvironmentE2bTerminalBridge;
  private readonly tokenService: EnvironmentTerminalConnectionTokenService;

  constructor(
    @inject(AppRuntimeDatabase) database: AppRuntimeDatabase,
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(EnvironmentE2bTerminalBridge) terminalBridge: EnvironmentE2bTerminalBridge,
    @inject(EnvironmentTerminalConnectionTokenService)
    tokenService: EnvironmentTerminalConnectionTokenService,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    this.catalogService = catalogService;
    this.database = database;
    this.logger = logger;
    this.terminalBridge = terminalBridge;
    this.tokenService = tokenService;
  }

  register(app: FastifyInstance): void {
    app.get<{ Querystring: { token?: string } }>(
      EnvironmentTerminalWebsocketRoute.ROUTE_PATH,
      { websocket: true },
      async (socket, request) => {
        const grant = this.tokenService.consumeGrant(String(request.query.token || ""));
        if (!grant) {
          socket.close(4401, "Terminal connection token is invalid or expired.");
          return;
        }

        const routeLogger = this.logger.child({
          environmentId: grant.environmentId,
          route: EnvironmentTerminalWebsocketRoute.ROUTE_PATH,
          terminalSessionId: grant.terminalSessionId,
        });

        try {
          const transactionProvider = new AppRuntimeTransactionProvider(this.database, grant.companyId);
          const environment = await this.catalogService.loadEnvironmentById(
            transactionProvider,
            grant.environmentId,
          );
          if (!environment || environment.companyId !== grant.companyId) {
            socket.close(4404, "Environment not found.");
            return;
          }

          let didClose = false;
          const terminalConnection = await this.terminalBridge.open({
            columns: grant.columns,
            environment,
            onOutput: (output) => {
              this.sendServerMessage(socket, {
                data: output,
                type: "output",
              });
            },
            rows: grant.rows,
            terminalSessionId: grant.terminalSessionId,
            transactionProvider,
          });

          this.sendServerMessage(socket, {
            pid: terminalConnection.getPid(),
            terminalSessionId: grant.terminalSessionId,
            type: "ready",
          });

          socket.on("message", (message: EnvironmentTerminalRawMessage) => {
            void this.handleClientMessage(terminalConnection, message).catch((error: unknown) => {
              routeLogger.warn({
                error,
              }, "Failed to handle terminal websocket message.");
              this.sendServerMessage(socket, {
                message: error instanceof Error ? error.message : "Terminal input failed.",
                type: "error",
              });
            });
          });

          socket.on("close", () => {
            didClose = true;
            // Close only this websocket's native PTY client; the named tmux session remains alive.
            void terminalConnection.detachClient();
          });

          void terminalConnection.waitForExit().then((exitCode) => {
            if (!didClose) {
              this.sendServerMessage(socket, {
                exitCode,
                type: "exit",
              });
              socket.close();
            }
          });
        } catch (error) {
          routeLogger.warn({ error }, "Failed to open terminal websocket.");
          this.sendServerMessage(socket, {
            message: error instanceof Error ? error.message : "Terminal connection failed.",
            type: "error",
          });
          socket.close(1011, "Terminal connection failed.");
        }
      },
    );
  }

  private async handleClientMessage(
    terminalConnection: {
      resize(columns: number, rows: number): Promise<void>;
      sendInput(input: string): Promise<void>;
    },
    message: EnvironmentTerminalRawMessage,
  ): Promise<void> {
    const parsedMessage = this.parseClientMessage(message);
    if (parsedMessage.type === "input") {
      await terminalConnection.sendInput(String(parsedMessage.data ?? ""));
      return;
    }

    if (parsedMessage.type === "resize") {
      const columns = EnvironmentTerminalWebsocketRoute.resolveDimension(parsedMessage.columns, 80);
      const rows = EnvironmentTerminalWebsocketRoute.resolveDimension(parsedMessage.rows, 24);
      await terminalConnection.resize(columns, rows);
    }
  }

  private parseClientMessage(message: EnvironmentTerminalRawMessage): EnvironmentTerminalClientMessage {
    const rawMessage = EnvironmentTerminalWebsocketRoute.convertMessageToString(message);
    const parsedMessage = JSON.parse(rawMessage) as EnvironmentTerminalClientMessage;
    if (!parsedMessage || typeof parsedMessage !== "object") {
      throw new Error("Terminal websocket message must be an object.");
    }

    return parsedMessage;
  }

  private static convertMessageToString(message: EnvironmentTerminalRawMessage): string {
    if (Array.isArray(message)) {
      return Buffer.concat(message).toString("utf8");
    }
    if (message instanceof ArrayBuffer) {
      return Buffer.from(message).toString("utf8");
    }

    return message.toString("utf8");
  }

  private sendServerMessage(socket: { send(data: string): void }, message: Record<string, unknown>): void {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      this.logger.child({ route: EnvironmentTerminalWebsocketRoute.ROUTE_PATH }).debug({
        error,
      }, "Terminal websocket send failed after socket closed.");
    }
  }

  private static resolveDimension(value: unknown, fallback: number): number {
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue)) {
      return fallback;
    }

    return Math.min(300, Math.max(8, numericValue));
  }
}
