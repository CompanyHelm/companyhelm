import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agents,
  agentDefaultMcpServers,
  mcpOauthConnections,
  mcpOauthSessions,
  mcpServers,
} from "../../db/schema.ts";
import type {
  AppRuntimeTransaction,
  TransactionProviderInterface,
} from "../../db/transaction_provider_interface.ts";
import { SecretEncryptionService } from "../secrets/encryption.ts";
import { McpOauthTokenService } from "./oauth/token_service.ts";
import {
  normalizeNonEmptyString,
  parseStoredMcpOauthToken,
  serializeStoredMcpOauthToken,
  type McpOauthConnectionStatus,
  type McpServerAuthType,
} from "./oauth/types.ts";

export type McpServerRecord = {
  authType: McpServerAuthType;
  callTimeoutMs: number;
  companyId: string;
  createdAt: Date;
  description: string | null;
  enabled: boolean;
  headers: Record<string, string>;
  id: string;
  name: string;
  oauthClientId: string | null;
  oauthConnectionStatus: McpOauthConnectionStatus | null;
  oauthGrantedScopes: string[];
  oauthLastError: string | null;
  oauthRequestedScopes: string[];
  updatedAt: Date;
  url: string;
};

type AgentRecord = {
  id: string;
};

type SelectableDatabase = AppRuntimeTransaction;
type UpdatableDatabase = AppRuntimeTransaction;

type McpServerBaseRecord = {
  authType: string;
  callTimeoutMs: number;
  companyId: string;
  createdAt: Date;
  description: string | null;
  enabled: boolean;
  headers: Record<string, string>;
  id: string;
  name: string;
  updatedAt: Date;
  url: string;
};

type McpOauthConnectionRecord = {
  accessTokenExpiresAt: Date | null;
  authorizationServerMetadata: Record<string, unknown>;
  lastError: string | null;
  mcpServerId: string;
  oauthClientId: string;
  oauthClientSecretEncryptedValue: string | null;
  oauthClientSecretEncryptionKeyId: string | null;
  requestedScopes: string[];
  resourceIndicator: string;
  resourceMetadataUrl: string;
  status: string;
  tokenEncryptedValue: string;
  tokenEncryptionKeyId: string;
  tokenEndpointAuthMethod: string;
  updatedAt: Date;
};

@injectable()
export class McpService {
  private static readonly DEFAULT_REFRESH_WINDOW_MS = 120_000;
  private readonly encryptionService: SecretEncryptionService;
  private readonly tokenService: McpOauthTokenService;

  constructor(
    @inject(SecretEncryptionService) encryptionService?: SecretEncryptionService,
    @inject(McpOauthTokenService) tokenService?: McpOauthTokenService,
  ) {
    this.encryptionService = encryptionService ?? ({} as SecretEncryptionService);
    this.tokenService = tokenService ?? new McpOauthTokenService();
  }

  async createMcpServer(
    transactionProvider: TransactionProviderInterface,
    input: {
      authType?: McpServerAuthType | null;
      callTimeoutMs?: number | null;
      companyId: string;
      description?: string | null;
      enabled?: boolean | null;
      headersText?: string | null;
      name: string;
      url: string;
      userId: string;
    },
  ): Promise<McpServerRecord> {
    const name = this.requireNonEmptyValue(input.name, "MCP server name");
    const url = this.requireHttpUrl(input.url);
    const description = this.normalizeOptionalText(input.description);
    const headers = this.parseHeadersText(input.headersText);
    const authType = this.resolveAuthType(input.authType ?? undefined);
    const callTimeoutMs = this.resolveCallTimeoutMs(input.callTimeoutMs ?? undefined);
    const enabled = input.enabled ?? true;

    return transactionProvider.transaction(async (tx) => {
      const now = new Date();
      const [createdServer] = await tx
        .insert(mcpServers)
        .values({
          authType,
          callTimeoutMs,
          companyId: input.companyId,
          createdAt: now,
          createdByUserId: input.userId,
          description,
          enabled,
          headers,
          name,
          updatedAt: now,
          updatedByUserId: input.userId,
          url,
        })
        .returning(this.mcpServerSelection()) as McpServerBaseRecord[];

      if (!createdServer) {
        throw new Error("Failed to create MCP server.");
      }

      return this.hydrateServerRecords(tx, [createdServer]).then(([server]) => {
        if (!server) {
          throw new Error("Failed to hydrate created MCP server.");
        }

        return server;
      });
    });
  }

  async updateMcpServer(
    transactionProvider: TransactionProviderInterface,
    input: {
      authType?: McpServerAuthType | null;
      callTimeoutMs?: number | null;
      companyId: string;
      description?: string | null;
      enabled?: boolean | null;
      headersText?: string | null;
      mcpServerId: string;
      name?: string | null;
      url?: string | null;
      userId: string;
    },
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const existingServer = await this.requireMcpServer(tx, input.companyId, input.mcpServerId);
      const nextAuthType = input.authType === undefined
        ? existingServer.authType
        : this.resolveAuthType(input.authType);
      const [updatedServer] = await tx
        .update(mcpServers)
        .set({
          authType: nextAuthType,
          callTimeoutMs: input.callTimeoutMs === undefined
            ? existingServer.callTimeoutMs
            : this.resolveCallTimeoutMs(input.callTimeoutMs),
          description: input.description === undefined
            ? existingServer.description
            : this.normalizeOptionalText(input.description),
          enabled: input.enabled ?? existingServer.enabled,
          headers: input.headersText === undefined
            ? existingServer.headers
            : this.parseHeadersText(input.headersText),
          name: input.name == null
            ? existingServer.name
            : this.requireNonEmptyValue(input.name, "MCP server name"),
          updatedAt: new Date(),
          updatedByUserId: input.userId,
          url: input.url == null
            ? existingServer.url
            : this.requireHttpUrl(input.url),
        })
        .where(and(
          eq(mcpServers.companyId, input.companyId),
          eq(mcpServers.id, input.mcpServerId),
        ))
        .returning(this.mcpServerSelection()) as McpServerBaseRecord[];

      if (!updatedServer) {
        throw new Error("Failed to update MCP server.");
      }

      if (nextAuthType !== existingServer.authType) {
        await this.resetOauthState(tx, input.companyId, input.mcpServerId);
      }

      return this.hydrateServerRecords(tx, [updatedServer]).then(([server]) => {
        if (!server) {
          throw new Error("Failed to hydrate updated MCP server.");
        }

        return server;
      });
    });
  }

  async deleteMcpServer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    mcpServerId: string,
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const [deletedServer] = await tx
        .delete(mcpServers)
        .where(and(
          eq(mcpServers.companyId, companyId),
          eq(mcpServers.id, mcpServerId),
        ))
        .returning(this.mcpServerSelection()) as McpServerBaseRecord[];

      if (!deletedServer) {
        throw new Error("MCP server not found.");
      }

      return {
        ...this.presentBaseServer(deletedServer),
        oauthClientId: null,
        oauthConnectionStatus: this.isOauthAuthType(deletedServer.authType) ? "not_connected" : null,
        oauthGrantedScopes: [],
        oauthLastError: null,
        oauthRequestedScopes: [],
      };
    });
  }

  async getMcpServer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    mcpServerId: string,
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.requireMcpServer(tx, companyId, mcpServerId);
    });
  }

  async listMcpServers(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<McpServerRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const records = await tx
        .select(this.mcpServerSelection())
        .from(mcpServers)
        .where(eq(mcpServers.companyId, companyId)) as McpServerBaseRecord[];

      const hydratedRecords = await this.hydrateServerRecords(tx, records);
      return [...hydratedRecords].sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async listAgentMcpServers(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<McpServerRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      await this.requireAgent(tx, companyId, agentId);
      const attachments = await tx
        .select({
          mcpServerId: agentDefaultMcpServers.mcpServerId,
        })
        .from(agentDefaultMcpServers)
        .where(and(
          eq(agentDefaultMcpServers.companyId, companyId),
          eq(agentDefaultMcpServers.agentId, agentId),
        )) as Array<{ mcpServerId: string }>;

      return this.listMcpServersByIds(
        tx,
        companyId,
        attachments.map((attachment) => attachment.mcpServerId),
      );
    });
  }

  async attachMcpServerToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      mcpServerId: string;
      userId: string;
    },
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      await this.requireAgent(tx, input.companyId, input.agentId);
      const server = await this.requireMcpServer(tx, input.companyId, input.mcpServerId);

      await tx
        .insert(agentDefaultMcpServers)
        .values({
          agentId: input.agentId,
          companyId: input.companyId,
          createdAt: new Date(),
          createdByUserId: input.userId,
          mcpServerId: input.mcpServerId,
        })
        .returning();

      return server;
    }).catch((error) => {
      if (error instanceof Error && /duplicate key value/i.test(error.message)) {
        throw new Error("MCP server already attached to agent.");
      }

      throw error;
    });
  }

  async detachMcpServerFromAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      mcpServerId: string;
    },
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const server = await this.requireMcpServer(tx, input.companyId, input.mcpServerId);
      await this.requireAgent(tx, input.companyId, input.agentId);

      const [deletedRecord] = await tx
        .delete(agentDefaultMcpServers)
        .where(and(
          eq(agentDefaultMcpServers.companyId, input.companyId),
          eq(agentDefaultMcpServers.agentId, input.agentId),
          eq(agentDefaultMcpServers.mcpServerId, input.mcpServerId),
        ))
        .returning({
          mcpServerId: agentDefaultMcpServers.mcpServerId,
        }) as Array<{ mcpServerId: string }>;

      if (!deletedRecord) {
        throw new Error("MCP server is not attached to this agent.");
      }

      return server;
    });
  }

  async resolveMcpServerRequestHeaders(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      mcpServerId: string;
      now?: Date;
      refreshWindowMs?: number;
    },
  ): Promise<Record<string, string>> {
    return transactionProvider.transaction(async (tx) => {
      const server = await this.requireMcpServer(tx, input.companyId, input.mcpServerId);
      if (!this.isOauthAuthType(server.authType)) {
        return { ...server.headers };
      }

      const connection = await this.requireOauthConnection(tx, input.companyId, input.mcpServerId);
      const storedToken = parseStoredMcpOauthToken(
        this.encryptionService.decrypt(connection.tokenEncryptedValue, connection.tokenEncryptionKeyId),
      );
      const now = input.now ?? new Date();
      const expiresAt = storedToken.expiresAt ? new Date(storedToken.expiresAt) : null;
      const refreshWindowMs = input.refreshWindowMs ?? McpService.DEFAULT_REFRESH_WINDOW_MS;
      if (expiresAt && Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > now.getTime() + refreshWindowMs) {
        return {
          ...server.headers,
          Authorization: this.buildOauthAuthorizationHeader(storedToken.tokenType, storedToken.accessToken),
        };
      }

      const refreshToken = normalizeNonEmptyString(storedToken.refreshToken);
      const tokenEndpoint = normalizeNonEmptyString(connection.authorizationServerMetadata.token_endpoint);
      if (!tokenEndpoint) {
        await this.markOauthConnectionDegraded(tx, {
          companyId: input.companyId,
          errorMessage: "MCP OAuth connection is missing a token endpoint.",
          mcpServerId: input.mcpServerId,
        });
        throw new Error("MCP OAuth connection must be reconnected.");
      }

      try {
        const clientSecret = connection.oauthClientSecretEncryptedValue
          ? this.encryptionService.decrypt(
            connection.oauthClientSecretEncryptedValue,
            connection.oauthClientSecretEncryptionKeyId ?? "",
          )
          : null;
        const refreshedToken = refreshToken
          ? await this.tokenService.refreshTokens({
            clientId: connection.oauthClientId,
            clientSecret,
            now,
            refreshToken,
            resource: connection.resourceIndicator,
            tokenEndpoint,
            tokenEndpointAuthMethod: connection.tokenEndpointAuthMethod,
          })
          : server.authType === "oauth_client_credentials"
            ? await this.tokenService.requestClientCredentialsToken({
              clientId: connection.oauthClientId,
              clientSecret,
              now,
              requestedScopes: connection.requestedScopes,
              resource: connection.resourceIndicator,
              tokenEndpoint,
              tokenEndpointAuthMethod: connection.tokenEndpointAuthMethod,
            })
            : (() => {
              throw new Error("MCP OAuth connection must be reconnected.");
            })();
        const encryptedToken = this.encryptionService.encrypt(serializeStoredMcpOauthToken({
          accessToken: refreshedToken.accessToken,
          expiresAt: refreshedToken.expiresAt,
          rawResponse: refreshedToken.rawResponse,
          refreshToken: refreshedToken.refreshToken,
          scope: refreshedToken.scope.length > 0 ? refreshedToken.scope : connection.requestedScopes,
          tokenType: refreshedToken.tokenType,
        }));

        await tx
          .update(mcpOauthConnections)
          .set({
            accessTokenExpiresAt: refreshedToken.expiresAt,
            grantedScopes: refreshedToken.scope.length > 0 ? refreshedToken.scope : connection.requestedScopes,
            lastError: null,
            refreshedAt: now,
            status: "connected",
            tokenEncryptedValue: encryptedToken.encryptedValue,
            tokenEncryptionKeyId: encryptedToken.encryptionKeyId,
            updatedAt: now,
          })
          .where(and(
            eq(mcpOauthConnections.companyId, input.companyId),
            eq(mcpOauthConnections.mcpServerId, input.mcpServerId),
          ))
          .returning();

        return {
          ...server.headers,
          Authorization: this.buildOauthAuthorizationHeader(refreshedToken.tokenType, refreshedToken.accessToken),
        };
      } catch (error) {
        await this.markOauthConnectionDegraded(tx, {
          companyId: input.companyId,
          errorMessage: error instanceof Error ? error.message : "Unknown OAuth refresh failure.",
          mcpServerId: input.mcpServerId,
        });

        throw error;
      }
    });
  }

  private async hydrateServerRecords(
    selectableDatabase: SelectableDatabase,
    records: McpServerBaseRecord[],
  ): Promise<McpServerRecord[]> {
    const serverIds = [...new Set(records.map((record) => record.id).filter(Boolean))];
    if (serverIds.length === 0) {
      return [];
    }

    const oauthConnections = await selectableDatabase
      .select(this.mcpOauthConnectionSelection())
      .from(mcpOauthConnections)
      .where(inArray(mcpOauthConnections.mcpServerId, serverIds)) as McpOauthConnectionRecord[];
    const connectionMap = new Map<string, McpOauthConnectionRecord>(
      oauthConnections.map((connection) => [connection.mcpServerId, connection]),
    );

      return records.map((record) => {
        const connection = connectionMap.get(record.id);
        return {
          ...this.presentBaseServer(record),
          oauthClientId: connection?.oauthClientId ?? null,
          oauthConnectionStatus: this.isOauthAuthType(record.authType)
            ? this.resolveOauthConnectionStatus(connection)
            : null,
          oauthGrantedScopes: connection
            ? this.readGrantedScopes(connection)
            : [],
        oauthLastError: connection?.lastError ?? null,
        oauthRequestedScopes: connection?.requestedScopes ?? [],
      };
    });
  }

  private async listMcpServersByIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    mcpServerIds: string[],
  ): Promise<McpServerRecord[]> {
    const normalizedIds = [...new Set(mcpServerIds.filter((id) => id.length > 0))];
    if (normalizedIds.length === 0) {
      return [];
    }

    const records = await selectableDatabase
      .select(this.mcpServerSelection())
      .from(mcpServers)
      .where(and(
        eq(mcpServers.companyId, companyId),
        inArray(mcpServers.id, normalizedIds),
      )) as McpServerBaseRecord[];

    const hydratedRecords = await this.hydrateServerRecords(selectableDatabase, records);
    return [...hydratedRecords].sort((left, right) => left.name.localeCompare(right.name));
  }

  private async requireAgent(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentId: string,
  ): Promise<AgentRecord> {
    const [agent] = await selectableDatabase
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      ))
      .limit(1) as AgentRecord[];

    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }

  private async requireMcpServer(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    mcpServerId: string,
  ): Promise<McpServerRecord> {
    const [server] = await selectableDatabase
      .select(this.mcpServerSelection())
      .from(mcpServers)
      .where(and(
        eq(mcpServers.companyId, companyId),
        eq(mcpServers.id, mcpServerId),
      ))
      .limit(1) as McpServerBaseRecord[];

    if (!server) {
      throw new Error("MCP server not found.");
    }

    const [hydratedServer] = await this.hydrateServerRecords(selectableDatabase, [server]);
    if (!hydratedServer) {
      throw new Error("Failed to hydrate MCP server.");
    }

    return hydratedServer;
  }

  private async requireOauthConnection(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    mcpServerId: string,
  ): Promise<McpOauthConnectionRecord> {
    const [connection] = await selectableDatabase
      .select(this.mcpOauthConnectionSelection())
      .from(mcpOauthConnections)
      .where(and(
        eq(mcpOauthConnections.companyId, companyId),
        eq(mcpOauthConnections.mcpServerId, mcpServerId),
      ))
      .limit(1) as McpOauthConnectionRecord[];

    if (!connection) {
      throw new Error("MCP OAuth connection not found.");
    }

    return connection;
  }

  private async markOauthConnectionDegraded(
    updatableDatabase: UpdatableDatabase,
    input: {
      companyId: string;
      errorMessage: string;
      mcpServerId: string;
    },
  ): Promise<void> {
    await updatableDatabase
      .update(mcpOauthConnections)
      .set({
        lastError: input.errorMessage,
        status: "degraded",
        updatedAt: new Date(),
      })
      .where(and(
        eq(mcpOauthConnections.companyId, input.companyId),
        eq(mcpOauthConnections.mcpServerId, input.mcpServerId),
      ))
      .returning();
  }

  private async resetOauthState(
    updatableDatabase: UpdatableDatabase & {
      delete(table: unknown): {
        where(condition: unknown): Promise<unknown>;
      };
    },
    companyId: string,
    mcpServerId: string,
  ): Promise<void> {
    await updatableDatabase.delete(mcpOauthConnections).where(and(
      eq(mcpOauthConnections.companyId, companyId),
      eq(mcpOauthConnections.mcpServerId, mcpServerId),
    ));
    await updatableDatabase.delete(mcpOauthSessions).where(and(
      eq(mcpOauthSessions.companyId, companyId),
      eq(mcpOauthSessions.mcpServerId, mcpServerId),
    ));
  }

  private mcpServerSelection() {
    return {
      authType: mcpServers.authType,
      callTimeoutMs: mcpServers.callTimeoutMs,
      companyId: mcpServers.companyId,
      createdAt: mcpServers.createdAt,
      description: mcpServers.description,
      enabled: mcpServers.enabled,
      headers: mcpServers.headers,
      id: mcpServers.id,
      name: mcpServers.name,
      updatedAt: mcpServers.updatedAt,
      url: mcpServers.url,
    };
  }

  private mcpOauthConnectionSelection() {
    return {
      accessTokenExpiresAt: mcpOauthConnections.accessTokenExpiresAt,
      authorizationServerMetadata: mcpOauthConnections.authorizationServerMetadata,
      lastError: mcpOauthConnections.lastError,
      mcpServerId: mcpOauthConnections.mcpServerId,
      oauthClientId: mcpOauthConnections.oauthClientId,
      oauthClientSecretEncryptedValue: mcpOauthConnections.oauthClientSecretEncryptedValue,
      oauthClientSecretEncryptionKeyId: mcpOauthConnections.oauthClientSecretEncryptionKeyId,
      requestedScopes: mcpOauthConnections.requestedScopes,
      resourceIndicator: mcpOauthConnections.resourceIndicator,
      resourceMetadataUrl: mcpOauthConnections.resourceMetadataUrl,
      status: mcpOauthConnections.status,
      tokenEncryptedValue: mcpOauthConnections.tokenEncryptedValue,
      tokenEncryptionKeyId: mcpOauthConnections.tokenEncryptionKeyId,
      tokenEndpointAuthMethod: mcpOauthConnections.tokenEndpointAuthMethod,
      updatedAt: mcpOauthConnections.updatedAt,
    };
  }

  private presentBaseServer(record: McpServerBaseRecord): Omit<
    McpServerRecord,
    "oauthClientId" | "oauthConnectionStatus" | "oauthGrantedScopes" | "oauthLastError" | "oauthRequestedScopes"
  > {
    return {
      authType: this.resolveAuthType(record.authType),
      callTimeoutMs: record.callTimeoutMs,
      companyId: record.companyId,
      createdAt: record.createdAt,
      description: record.description,
      enabled: record.enabled,
      headers: record.headers,
      id: record.id,
      name: record.name,
      updatedAt: record.updatedAt,
      url: record.url,
    };
  }

  private readGrantedScopes(connection: McpOauthConnectionRecord): string[] {
    try {
      const token = parseStoredMcpOauthToken(
        this.encryptionService.decrypt(connection.tokenEncryptedValue, connection.tokenEncryptionKeyId),
      );
      return token.scope;
    } catch {
      return [];
    }
  }

  private resolveOauthConnectionStatus(connection: McpOauthConnectionRecord | undefined): McpOauthConnectionStatus {
    if (!connection) {
      return "not_connected";
    }

    return connection.status === "degraded" ? "degraded" : "connected";
  }

  private buildOauthAuthorizationHeader(tokenType: string, accessToken: string): string {
    const normalizedTokenType = normalizeNonEmptyString(tokenType) ?? "Bearer";
    const authorizationScheme = normalizedTokenType.toLowerCase() === "bearer"
      ? "Bearer"
      : normalizedTokenType;

    return `${authorizationScheme} ${accessToken}`;
  }

  private requireNonEmptyValue(value: string, label: string): string {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private requireHttpUrl(value: string): string {
    const normalizedValue = this.requireNonEmptyValue(value, "MCP server URL");
    let url: URL;
    try {
      url = new URL(normalizedValue);
    } catch {
      throw new Error("MCP server URL must be a valid absolute URL.");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("MCP server URL must use http or https.");
    }

    return url.toString();
  }

  private resolveCallTimeoutMs(value: number | null | undefined): number {
    const normalizedValue = Number(value ?? 10_000);
    if (!Number.isFinite(normalizedValue) || normalizedValue < 1) {
      throw new Error("Call timeout must be a positive number of milliseconds.");
    }

    return Math.floor(normalizedValue);
  }

  private resolveAuthType(value: string | null | undefined): McpServerAuthType {
    const normalizedValue = normalizeNonEmptyString(value) ?? "none";
    if (
      normalizedValue === "none"
      || normalizedValue === "authorization_header"
      || normalizedValue === "oauth_client_credentials"
      || normalizedValue === "oauth_authorization_code"
    ) {
      return normalizedValue;
    }

    throw new Error("Unsupported MCP auth type.");
  }

  private parseHeadersText(value: string | null | undefined): Record<string, string> {
    const normalizedValue = String(value ?? "").trim();
    if (normalizedValue.length === 0) {
      return {};
    }

    const headers: Record<string, string> = {};
    for (const line of normalizedValue.split(/\r?\n/u)) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf(":");
      if (separatorIndex <= 0) {
        throw new Error("Each header line must use the format 'Name: Value'.");
      }

      const name = trimmedLine.slice(0, separatorIndex).trim();
      const headerValue = trimmedLine.slice(separatorIndex + 1).trim();
      if (name.length === 0 || headerValue.length === 0) {
        throw new Error("Each header line must use the format 'Name: Value'.");
      }

      headers[name] = headerValue;
    }

    return headers;
  }

  private isOauthAuthType(value: string): boolean {
    return value === "oauth_authorization_code" || value === "oauth_client_credentials";
  }
}
