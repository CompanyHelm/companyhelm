import { and, eq, isNull } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { mcpOauthConnections, mcpOauthSessions } from "../../../db/schema.ts";
import { SecretEncryptionService } from "../../secrets/encryption.ts";
import { McpOauthStateService } from "./state_service.ts";
import { McpOauthTokenService } from "./token_service.ts";
import {
  normalizeNonEmptyString,
  serializeStoredMcpOauthToken,
} from "./types.ts";

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

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
      };
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

type SessionRecord = {
  authorizationServerIssuer: string;
  authorizationServerMetadata: Record<string, unknown>;
  clientRegistrationMetadata: Record<string, unknown> | null;
  clientType: string;
  codeVerifier: string;
  companyId: string;
  completedAt: Date | null;
  createdByUserId: string | null;
  expiresAt: Date;
  id: string;
  mcpServerId: string;
  oauthClientId: string;
  oauthClientSecretEncryptedValue: string | null;
  oauthClientSecretEncryptionKeyId: string | null;
  protectedResourceMetadata: Record<string, unknown>;
  redirectUri: string;
  requestedScopes: string[];
  resourceIndicator: string;
  resourceMetadataUrl: string;
  state: string;
  tokenEndpointAuthMethod: string;
};

@injectable()
export class McpOauthCompleteConnectionService {
  private readonly encryptionService: SecretEncryptionService;
  private readonly stateService: McpOauthStateService;
  private readonly tokenService: McpOauthTokenService;

  constructor(
    @inject(SecretEncryptionService) encryptionService: SecretEncryptionService,
    @inject(McpOauthStateService) stateService: McpOauthStateService,
    @inject(McpOauthTokenService) tokenService: McpOauthTokenService,
  ) {
    this.encryptionService = encryptionService;
    this.stateService = stateService;
    this.tokenService = tokenService;
  }

  async completeConnection(params: {
    authenticatedUserId: string;
    code: string;
    database: SelectableDatabase & InsertableDatabase & UpdatableDatabase & DeletableDatabase;
    fetchImpl?: typeof fetch;
    now?: Date;
    state: string;
  }): Promise<{
    companyId: string;
    mcpServerId: string;
    organizationSlug: string;
  }> {
    const normalizedCode = normalizeNonEmptyString(params.code);
    const normalizedState = normalizeNonEmptyString(params.state);
    const authenticatedUserId = normalizeNonEmptyString(params.authenticatedUserId);
    if (!normalizedCode || !normalizedState || !authenticatedUserId) {
      throw new Error("OAuth callback requires state, code, and an authenticated user.");
    }

    const stateValue = this.stateService.readState(normalizedState);
    if (stateValue.userId !== authenticatedUserId) {
      throw new Error("MCP OAuth state does not match the authenticated user.");
    }

    const [session] = await params.database
      .select({
        authorizationServerIssuer: mcpOauthSessions.authorizationServerIssuer,
        authorizationServerMetadata: mcpOauthSessions.authorizationServerMetadata,
        clientRegistrationMetadata: mcpOauthSessions.clientRegistrationMetadata,
        clientType: mcpOauthSessions.clientType,
        codeVerifier: mcpOauthSessions.codeVerifier,
        companyId: mcpOauthSessions.companyId,
        completedAt: mcpOauthSessions.completedAt,
        createdByUserId: mcpOauthSessions.createdByUserId,
        expiresAt: mcpOauthSessions.expiresAt,
        id: mcpOauthSessions.id,
        mcpServerId: mcpOauthSessions.mcpServerId,
        oauthClientId: mcpOauthSessions.oauthClientId,
        oauthClientSecretEncryptedValue: mcpOauthSessions.oauthClientSecretEncryptedValue,
        oauthClientSecretEncryptionKeyId: mcpOauthSessions.oauthClientSecretEncryptionKeyId,
        protectedResourceMetadata: mcpOauthSessions.protectedResourceMetadata,
        redirectUri: mcpOauthSessions.redirectUri,
        requestedScopes: mcpOauthSessions.requestedScopes,
        resourceIndicator: mcpOauthSessions.resourceIndicator,
        resourceMetadataUrl: mcpOauthSessions.resourceMetadataUrl,
        state: mcpOauthSessions.state,
        tokenEndpointAuthMethod: mcpOauthSessions.tokenEndpointAuthMethod,
      })
      .from(mcpOauthSessions)
      .where(and(
        eq(mcpOauthSessions.id, stateValue.sessionId),
        eq(mcpOauthSessions.companyId, stateValue.companyId),
        eq(mcpOauthSessions.mcpServerId, stateValue.mcpServerId),
        isNull(mcpOauthSessions.completedAt),
      ))
      .limit(1) as SessionRecord[];

    if (!session || session.state !== normalizedState) {
      throw new Error("OAuth session not found.");
    }

    const now = params.now ?? new Date();
    if (!(session.expiresAt instanceof Date) || session.expiresAt.getTime() < now.getTime()) {
      throw new Error("OAuth session has expired.");
    }

    const tokenEndpoint = normalizeNonEmptyString(session.authorizationServerMetadata.token_endpoint);
    if (!tokenEndpoint) {
      throw new Error("Authorization server metadata is missing token_endpoint.");
    }

    const clientSecret = session.oauthClientSecretEncryptedValue
      ? this.encryptionService.decrypt(
        session.oauthClientSecretEncryptedValue,
        session.oauthClientSecretEncryptionKeyId ?? "",
      )
      : null;

    const tokenSet = await this.tokenService.exchangeAuthorizationCode({
      clientId: session.oauthClientId,
      clientSecret,
      code: normalizedCode,
      codeVerifier: session.codeVerifier,
      fetchImpl: params.fetchImpl,
      now,
      redirectUri: session.redirectUri,
      resource: session.resourceIndicator,
      tokenEndpoint,
      tokenEndpointAuthMethod: session.tokenEndpointAuthMethod,
    });
    const encryptedToken = this.encryptionService.encrypt(serializeStoredMcpOauthToken({
      accessToken: tokenSet.accessToken,
      expiresAt: tokenSet.expiresAt,
      rawResponse: tokenSet.rawResponse,
      refreshToken: tokenSet.refreshToken,
      scope: tokenSet.scope.length > 0 ? tokenSet.scope : session.requestedScopes,
      tokenType: tokenSet.tokenType,
    }));

    await params.database.delete(mcpOauthConnections).where(and(
      eq(mcpOauthConnections.companyId, session.companyId),
      eq(mcpOauthConnections.mcpServerId, session.mcpServerId),
    ));

    const encryptedClientSecret = clientSecret ? this.encryptionService.encrypt(clientSecret) : null;

    await params.database
      .insert(mcpOauthConnections)
      .values({
        accessTokenExpiresAt: tokenSet.expiresAt,
        authorizationServerIssuer: session.authorizationServerIssuer,
        authorizationServerMetadata: session.authorizationServerMetadata,
        clientRegistrationMetadata: session.clientRegistrationMetadata,
        clientType: session.clientType,
        companyId: session.companyId,
        createdAt: now,
        createdByUserId: session.createdByUserId ?? authenticatedUserId,
        grantedScopes: tokenSet.scope.length > 0 ? tokenSet.scope : session.requestedScopes,
        lastError: null,
        mcpServerId: session.mcpServerId,
        oauthClientId: session.oauthClientId,
        oauthClientSecretEncryptedValue: encryptedClientSecret?.encryptedValue ?? null,
        oauthClientSecretEncryptionKeyId: encryptedClientSecret?.encryptionKeyId ?? null,
        protectedResourceMetadata: session.protectedResourceMetadata,
        refreshedAt: now,
        requestedScopes: session.requestedScopes,
        resourceIndicator: session.resourceIndicator,
        resourceMetadataUrl: session.resourceMetadataUrl,
        status: "connected",
        tokenEncryptedValue: encryptedToken.encryptedValue,
        tokenEncryptionKeyId: encryptedToken.encryptionKeyId,
        tokenEndpointAuthMethod: session.tokenEndpointAuthMethod,
        updatedAt: now,
        updatedByUserId: authenticatedUserId,
      })
      .returning?.();

    await params.database
      .update(mcpOauthSessions)
      .set({
        completedAt: now,
        updatedAt: now,
        updatedByUserId: authenticatedUserId,
      })
      .where(eq(mcpOauthSessions.id, session.id))
      .returning?.();

    return {
      companyId: session.companyId,
      mcpServerId: session.mcpServerId,
      organizationSlug: stateValue.organizationSlug,
    };
  }
}
