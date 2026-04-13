import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { mcpOauthConnections, mcpOauthSessions } from "../../db/schema.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import {
  McpOauthClientRegistrationService,
} from "../../services/mcp/oauth/client_registration.ts";
import { McpOauthDiscoveryService } from "../../services/mcp/oauth/discovery.ts";
import { McpOauthStateService } from "../../services/mcp/oauth/state_service.ts";
import { normalizeNonEmptyString, normalizeScopeList } from "../../services/mcp/oauth/types.ts";
import { SecretEncryptionService } from "../../services/secrets/encryption.ts";
import { McpService } from "../../services/mcp/service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type StartMcpServerOauthMutationArguments = {
  input: {
    mcpServerId: string;
    oauthClientId?: string | null;
    oauthClientSecret?: string | null;
    organizationSlug: string;
    requestedScopes?: string[] | null;
  };
};

type StartMcpServerOauthPayload = {
  authorizationUrl: string;
};

type ExistingConnectionRecord = {
  clientType: string;
  oauthClientId: string;
  oauthClientSecretEncryptedValue: string | null;
  oauthClientSecretEncryptionKeyId: string | null;
  tokenEndpointAuthMethod: string;
};

function generatePkceCodeVerifier(): string {
  return randomBytes(48).toString("base64url");
}

function createPkceCodeChallenge(codeVerifier: string): string {
  return createHash("sha256").update(codeVerifier, "utf8").digest("base64url");
}

function buildRedirectUri(config: Config): string {
  return new URL("/mcp/oauth/callback", config.webPublicUrl).toString();
}

function buildAuthorizationUrl(params: {
  authorizationEndpoint: string;
  clientId: string;
  codeChallenge: string;
  redirectUri: string;
  requestedScopes: string[];
  resource: string;
  state: string;
}): string {
  const authorizationUrl = new URL(params.authorizationEndpoint);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", params.clientId);
  authorizationUrl.searchParams.set("redirect_uri", params.redirectUri);
  authorizationUrl.searchParams.set("state", params.state);
  authorizationUrl.searchParams.set("code_challenge", params.codeChallenge);
  authorizationUrl.searchParams.set("code_challenge_method", "S256");
  authorizationUrl.searchParams.set("resource", params.resource);
  if (params.requestedScopes.length > 0) {
    authorizationUrl.searchParams.set("scope", params.requestedScopes.join(" "));
  }

  return authorizationUrl.toString();
}

@injectable()
export class StartMcpServerOauthMutation extends Mutation<
  StartMcpServerOauthMutationArguments,
  StartMcpServerOauthPayload
> {
  private readonly clientRegistrationService: McpOauthClientRegistrationService;
  private readonly config: Config;
  private readonly discoveryService: McpOauthDiscoveryService;
  private readonly encryptionService: SecretEncryptionService;
  private readonly logger: ApiLogger;
  private readonly mcpService: McpService;
  private readonly stateService: McpOauthStateService;

  constructor(
    @inject(Config) config: Config,
    @inject(McpService) mcpService: McpService,
    @inject(McpOauthDiscoveryService) discoveryService: McpOauthDiscoveryService,
    @inject(McpOauthClientRegistrationService)
    clientRegistrationService: McpOauthClientRegistrationService,
    @inject(McpOauthStateService) stateService: McpOauthStateService,
    @inject(SecretEncryptionService) encryptionService: SecretEncryptionService,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    super();
    this.clientRegistrationService = clientRegistrationService;
    this.config = config;
    this.discoveryService = discoveryService;
    this.encryptionService = encryptionService;
    this.logger = logger;
    this.mcpService = mcpService;
    this.stateService = stateService;
  }

  protected resolve = async (
    arguments_: StartMcpServerOauthMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<StartMcpServerOauthPayload> => {
    if (!context.authSession?.company || !context.app_runtime_transaction_provider) {
      throw new Error("Authentication required.");
    }

    try {
      const server = await this.mcpService.getMcpServer(
        context.app_runtime_transaction_provider,
        context.authSession.company.id,
        arguments_.input.mcpServerId,
      );
      if (server.authType !== "oauth_authorization_code") {
        throw new Error("MCP server must be configured for OAuth authorization code before connecting.");
      }

      const organizationSlug = normalizeNonEmptyString(arguments_.input.organizationSlug);
      if (!organizationSlug) {
        throw new Error("Organization slug is required.");
      }

      const requestedScopes = normalizeScopeList(arguments_.input.requestedScopes);
      const discovery = await this.discoveryService.discover({
        mcpServerUrl: server.url,
      });
      const authorizationEndpoint = normalizeNonEmptyString(
        discovery.authorizationServerMetadata.authorization_endpoint,
      );
      if (!authorizationEndpoint) {
        throw new Error("Authorization server metadata is missing authorization_endpoint.");
      }

      const redirectUri = buildRedirectUri(this.config);
      const manualClient = await context.app_runtime_transaction_provider.transaction(async (tx) => {
        const [existingConnection] = await tx
          .select({
            clientType: mcpOauthConnections.clientType,
            oauthClientId: mcpOauthConnections.oauthClientId,
            oauthClientSecretEncryptedValue: mcpOauthConnections.oauthClientSecretEncryptedValue,
            oauthClientSecretEncryptionKeyId: mcpOauthConnections.oauthClientSecretEncryptionKeyId,
            tokenEndpointAuthMethod: mcpOauthConnections.tokenEndpointAuthMethod,
          })
          .from(mcpOauthConnections)
          .where(and(
            eq(mcpOauthConnections.companyId, context.authSession!.company!.id),
            eq(mcpOauthConnections.mcpServerId, server.id),
          ))
          .limit(1) as ExistingConnectionRecord[];

        const explicitClientId = normalizeNonEmptyString(arguments_.input.oauthClientId);
        const explicitClientSecret = normalizeNonEmptyString(arguments_.input.oauthClientSecret);
        if (explicitClientId) {
          return {
            clientId: explicitClientId,
            clientSecret: explicitClientSecret,
            tokenEndpointAuthMethod: explicitClientSecret ? "client_secret_post" : "none",
          };
        }

        if (existingConnection?.clientType === "manual") {
          return {
            clientId: existingConnection.oauthClientId,
            clientSecret: existingConnection.oauthClientSecretEncryptedValue
              ? this.encryptionService.decrypt(
                existingConnection.oauthClientSecretEncryptedValue,
                existingConnection.oauthClientSecretEncryptionKeyId ?? "",
              )
              : null,
            tokenEndpointAuthMethod: existingConnection.tokenEndpointAuthMethod,
          };
        }

        return null;
      });

      const registeredClient = await this.clientRegistrationService.registerClient({
        clientName: `CompanyHelm MCP ${server.name}`,
        manualClient,
        redirectUri,
        registrationEndpoint: normalizeNonEmptyString(
          discovery.authorizationServerMetadata.registration_endpoint,
        ),
      });

      const sessionId = randomUUID();
      const state = this.stateService.createState({
        companyId: context.authSession.company.id,
        mcpServerId: server.id,
        organizationSlug,
        sessionId,
        userId: context.authSession.user.id,
      });
      const codeVerifier = generatePkceCodeVerifier();
      const codeChallenge = createPkceCodeChallenge(codeVerifier);
      const resourceIndicator = normalizeNonEmptyString(discovery.protectedResourceMetadata.resource) ?? server.url;
      const authorizationUrl = buildAuthorizationUrl({
        authorizationEndpoint,
        clientId: registeredClient.clientId,
        codeChallenge,
        redirectUri,
        requestedScopes,
        resource: resourceIndicator,
        state,
      });
      const encryptedClientSecret = registeredClient.clientSecret
        ? this.encryptionService.encrypt(registeredClient.clientSecret)
        : null;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (10 * 60 * 1000));

      await context.app_runtime_transaction_provider.transaction(async (tx) => {
        await tx
          .delete(mcpOauthSessions)
          .where(and(
            eq(mcpOauthSessions.companyId, context.authSession!.company!.id),
            eq(mcpOauthSessions.mcpServerId, server.id),
            isNull(mcpOauthSessions.completedAt),
          ));

        await tx
          .insert(mcpOauthSessions)
          .values({
            authorizationServerIssuer: discovery.authorizationServerIssuer,
            authorizationServerMetadata: discovery.authorizationServerMetadata,
            authorizationUrl,
            clientRegistrationMetadata: registeredClient.clientRegistrationMetadata,
            clientType: manualClient ? "manual" : "dynamic_registration",
            codeChallenge,
            codeVerifier,
            companyId: context.authSession!.company!.id,
            createdAt: now,
            createdByUserId: context.authSession!.user.id,
            expiresAt,
            id: sessionId,
            mcpServerId: server.id,
            oauthClientId: registeredClient.clientId,
            oauthClientSecretEncryptedValue: encryptedClientSecret?.encryptedValue ?? null,
            oauthClientSecretEncryptionKeyId: encryptedClientSecret?.encryptionKeyId ?? null,
            protectedResourceMetadata: discovery.protectedResourceMetadata,
            redirectUri,
            requestedScopes,
            resourceIndicator,
            resourceMetadataUrl: discovery.resourceMetadataUrl,
            state,
            tokenEndpointAuthMethod: registeredClient.tokenEndpointAuthMethod,
            updatedAt: now,
            updatedByUserId: context.authSession!.user.id,
          })
          .returning();
      });

      return {
        authorizationUrl,
      };
    } catch (error) {
      this.logger.getLogger().error({
        companyId: context.authSession.company.id,
        mcpServerId: arguments_.input.mcpServerId,
        error: error instanceof Error ? error.message : "Unknown MCP OAuth start failure.",
      }, "failed to start mcp oauth");
      throw new Error("Unable to start MCP OAuth authorization.", {
        cause: error,
      });
    }
  };
}
