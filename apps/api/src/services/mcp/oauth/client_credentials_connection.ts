import { and, eq, isNull } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { mcpOauthConnections, mcpOauthSessions } from "../../../db/schema.ts";
import {
  McpAuthTypeDetectionService,
} from "../auth_type_detection.ts";
import { SecretEncryptionService } from "../../secrets/encryption.ts";
import {
  normalizeNonEmptyString,
  normalizeScopeList,
  serializeStoredMcpOauthToken,
} from "./types.ts";
import { McpOauthDiscoveryService } from "./discovery.ts";
import { McpOauthTokenService } from "./token_service.ts";

type SelectableDatabase = {
  select(selection?: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): {
        limit(limit: number): Promise<unknown[]>;
      };
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): Promise<unknown> | {
      returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

type ExistingConnectionRecord = {
  oauthClientId: string;
  oauthClientSecretEncryptedValue: string | null;
  oauthClientSecretEncryptionKeyId: string | null;
  requestedScopes: string[];
};

/**
 * Establishes and stores OAuth client-credentials connections for MCP servers so the runtime can
 * reuse the encrypted client configuration and lazily reacquire bearer tokens when needed.
 */
@injectable()
export class McpOauthClientCredentialsConnectionService {
  private readonly authTypeDetectionService: McpAuthTypeDetectionService;
  private readonly discoveryService: McpOauthDiscoveryService;
  private readonly encryptionService: SecretEncryptionService;
  private readonly tokenService: McpOauthTokenService;

  constructor(
    @inject(McpAuthTypeDetectionService) authTypeDetectionService: McpAuthTypeDetectionService,
    @inject(McpOauthDiscoveryService) discoveryService: McpOauthDiscoveryService,
    @inject(SecretEncryptionService) encryptionService: SecretEncryptionService,
    @inject(McpOauthTokenService) tokenService: McpOauthTokenService,
  ) {
    this.authTypeDetectionService = authTypeDetectionService;
    this.discoveryService = discoveryService;
    this.encryptionService = encryptionService;
    this.tokenService = tokenService;
  }

  async connect(params: {
    authenticatedUserId: string;
    companyId: string;
    database: SelectableDatabase & InsertableDatabase & DeletableDatabase;
    mcpServerId: string;
    now?: Date;
    oauthClientId?: string | null;
    oauthClientSecret?: string | null;
    requestedScopes?: string[] | null;
    serverUrl: string;
  }): Promise<void> {
    const authenticatedUserId = normalizeNonEmptyString(params.authenticatedUserId);
    if (!authenticatedUserId) {
      throw new Error("Authenticated user is required.");
    }

    const [existingConnection] = await params.database
      .select({
        oauthClientId: mcpOauthConnections.oauthClientId,
        oauthClientSecretEncryptedValue: mcpOauthConnections.oauthClientSecretEncryptedValue,
        oauthClientSecretEncryptionKeyId: mcpOauthConnections.oauthClientSecretEncryptionKeyId,
        requestedScopes: mcpOauthConnections.requestedScopes,
      })
      .from(mcpOauthConnections)
      .where(and(
        eq(mcpOauthConnections.companyId, params.companyId),
        eq(mcpOauthConnections.mcpServerId, params.mcpServerId),
      ))
      .limit(1) as ExistingConnectionRecord[];

    const oauthClientId = normalizeNonEmptyString(params.oauthClientId)
      ?? normalizeNonEmptyString(existingConnection?.oauthClientId);
    if (!oauthClientId) {
      throw new Error("OAuth client ID is required.");
    }

    const oauthClientSecret = normalizeNonEmptyString(params.oauthClientSecret)
      ?? (
        existingConnection?.oauthClientSecretEncryptedValue
          ? this.encryptionService.decrypt(
            existingConnection.oauthClientSecretEncryptedValue,
            existingConnection.oauthClientSecretEncryptionKeyId ?? "",
          )
          : null
      );

    const requestedScopes = normalizeScopeList(params.requestedScopes).length > 0
      ? normalizeScopeList(params.requestedScopes)
      : normalizeScopeList(existingConnection?.requestedScopes);
    const discovery = await this.discoveryService.discover({
      mcpServerUrl: params.serverUrl,
    });
    if (!this.authTypeDetectionService.supportsClientCredentials(discovery)) {
      throw new Error("MCP server does not advertise OAuth client credentials.");
    }

    const tokenEndpoint = normalizeNonEmptyString(discovery.authorizationServerMetadata.token_endpoint);
    if (!tokenEndpoint) {
      throw new Error("Authorization server metadata is missing token_endpoint.");
    }

    const tokenEndpointAuthMethod = this.authTypeDetectionService.resolveSupportedTokenEndpointAuthMethod(
      discovery.authorizationServerMetadata,
    );
    if (!tokenEndpointAuthMethod) {
      throw new Error("Authorization server token endpoint auth method is unsupported.");
    }

    const tokenSet = await this.tokenService.requestClientCredentialsToken({
      clientId: oauthClientId,
      clientSecret: oauthClientSecret,
      now: params.now,
      requestedScopes,
      resource: normalizeNonEmptyString(discovery.protectedResourceMetadata.resource) ?? params.serverUrl,
      tokenEndpoint,
      tokenEndpointAuthMethod,
    });
    const encryptedToken = this.encryptionService.encrypt(serializeStoredMcpOauthToken({
      accessToken: tokenSet.accessToken,
      expiresAt: tokenSet.expiresAt,
      rawResponse: tokenSet.rawResponse,
      refreshToken: tokenSet.refreshToken,
      scope: tokenSet.scope.length > 0 ? tokenSet.scope : requestedScopes,
      tokenType: tokenSet.tokenType,
    }));
    const encryptedClientSecret = oauthClientSecret
      ? this.encryptionService.encrypt(oauthClientSecret)
      : null;
    const now = params.now ?? new Date();

    await params.database.delete(mcpOauthConnections).where(and(
      eq(mcpOauthConnections.companyId, params.companyId),
      eq(mcpOauthConnections.mcpServerId, params.mcpServerId),
    ));
    await params.database.delete(mcpOauthSessions).where(and(
      eq(mcpOauthSessions.companyId, params.companyId),
      eq(mcpOauthSessions.mcpServerId, params.mcpServerId),
      isNull(mcpOauthSessions.completedAt),
    ));

    await params.database
      .insert(mcpOauthConnections)
      .values({
        accessTokenExpiresAt: tokenSet.expiresAt,
        authorizationServerIssuer: discovery.authorizationServerIssuer,
        authorizationServerMetadata: discovery.authorizationServerMetadata,
        clientRegistrationMetadata: null,
        clientType: "client_credentials_manual",
        companyId: params.companyId,
        createdAt: now,
        createdByUserId: authenticatedUserId,
        grantedScopes: tokenSet.scope.length > 0 ? tokenSet.scope : requestedScopes,
        lastError: null,
        mcpServerId: params.mcpServerId,
        oauthClientId,
        oauthClientSecretEncryptedValue: encryptedClientSecret?.encryptedValue ?? null,
        oauthClientSecretEncryptionKeyId: encryptedClientSecret?.encryptionKeyId ?? null,
        protectedResourceMetadata: discovery.protectedResourceMetadata,
        refreshedAt: now,
        requestedScopes,
        resourceIndicator: normalizeNonEmptyString(discovery.protectedResourceMetadata.resource) ?? params.serverUrl,
        resourceMetadataUrl: discovery.resourceMetadataUrl,
        status: "connected",
        tokenEncryptedValue: encryptedToken.encryptedValue,
        tokenEncryptionKeyId: encryptedToken.encryptionKeyId,
        tokenEndpointAuthMethod,
        updatedAt: now,
        updatedByUserId: authenticatedUserId,
      })
      .returning?.();
  }
}
