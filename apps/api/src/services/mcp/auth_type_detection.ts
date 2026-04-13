import { inject, injectable } from "inversify";
import { McpOauthDiscoveryService } from "./oauth/discovery.ts";
import {
  normalizeNonEmptyString,
  type McpOauthDiscoveryResult,
  type McpProtectedResourceMetadata,
  type McpServerAuthType,
  type McpSupportedOauthAuthType,
  type OAuthAuthorizationServerMetadata,
} from "./oauth/types.ts";

export type McpServerAuthTypeDetection = {
  detailMessage: string | null;
  detectedAuthType: McpServerAuthType | null;
  requiresManualClient: boolean;
  wasAutoDetected: boolean;
};

/**
 * Interprets MCP OAuth discovery metadata into CompanyHelm's auth-type model so the UI can
 * auto-select supported OAuth flows without guessing about non-OAuth configurations.
 */
@injectable()
export class McpAuthTypeDetectionService {
  private readonly discoveryService: McpOauthDiscoveryService;

  constructor(@inject(McpOauthDiscoveryService) discoveryService: McpOauthDiscoveryService) {
    this.discoveryService = discoveryService;
  }

  async detect(params: {
    url: string;
  }): Promise<McpServerAuthTypeDetection> {
    const normalizedUrl = normalizeNonEmptyString(params.url);
    if (!normalizedUrl) {
      throw new Error("MCP server URL is required.");
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      throw new Error("MCP server URL must be a valid HTTP or HTTPS URL.");
    }

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      throw new Error("MCP server URL must use HTTP or HTTPS.");
    }

    try {
      return this.presentDetectionResult(
        await this.discoveryService.discover({
          mcpServerUrl: parsedUrl.toString(),
        }),
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown auth detection failure.";
      if (this.isManualSelectionRequired(errorMessage)) {
        return {
          detailMessage: null,
          detectedAuthType: null,
          requiresManualClient: false,
          wasAutoDetected: false,
        };
      }

      return {
        detailMessage: `Could not auto-detect auth type: ${errorMessage}`,
        detectedAuthType: null,
        requiresManualClient: false,
        wasAutoDetected: false,
      };
    }
  }

  supportsAuthorizationCode(discovery: McpOauthDiscoveryResult): boolean {
    const authorizationEndpoint = normalizeNonEmptyString(
      discovery.authorizationServerMetadata.authorization_endpoint,
    );
    if (!authorizationEndpoint) {
      return false;
    }

    const grantTypes = this.readGrantTypes(discovery.authorizationServerMetadata);
    if (grantTypes.length > 0 && !grantTypes.includes("authorization_code")) {
      return false;
    }

    const codeChallengeMethods = this.readCodeChallengeMethods(discovery.authorizationServerMetadata);
    return codeChallengeMethods.length === 0 || codeChallengeMethods.includes("S256");
  }

  supportsClientCredentials(discovery: McpOauthDiscoveryResult): boolean {
    const grantTypes = this.readGrantTypes(discovery.authorizationServerMetadata);
    if (!grantTypes.includes("client_credentials")) {
      return false;
    }

    return Boolean(
      normalizeNonEmptyString(discovery.authorizationServerMetadata.token_endpoint)
      && this.resolveSupportedTokenEndpointAuthMethod(discovery.authorizationServerMetadata),
    );
  }

  resolveSupportedTokenEndpointAuthMethod(
    metadata: OAuthAuthorizationServerMetadata | Record<string, unknown>,
  ): "client_secret_basic" | "client_secret_post" | "none" | null {
    const supportedAuthMethods = Array.isArray(metadata.token_endpoint_auth_methods_supported)
      ? metadata.token_endpoint_auth_methods_supported
          .map((value) => normalizeNonEmptyString(value))
          .filter((value): value is string => Boolean(value))
      : ["client_secret_basic"];

    for (const authMethod of supportedAuthMethods) {
      if (
        authMethod === "client_secret_basic"
        || authMethod === "client_secret_post"
        || authMethod === "none"
      ) {
        return authMethod;
      }
    }

    return null;
  }

  private presentDetectionResult(discovery: McpOauthDiscoveryResult): McpServerAuthTypeDetection {
    const supportedAuthTypes = this.readSupportedOauthAuthTypes(discovery);
    const detectedAuthType = supportedAuthTypes[0] ?? null;
    if (!detectedAuthType) {
      return {
        detailMessage: "OAuth metadata was discovered, but the advertised grant types are not supported.",
        detectedAuthType: null,
        requiresManualClient: false,
        wasAutoDetected: false,
      };
    }

    return {
      detailMessage: this.buildDetectionMessage(detectedAuthType, supportedAuthTypes, discovery.protectedResourceMetadata),
      detectedAuthType,
      requiresManualClient: detectedAuthType === "oauth_authorization_code"
        && !this.supportsDynamicClientRegistration(discovery.authorizationServerMetadata),
      wasAutoDetected: true,
    };
  }

  private readSupportedOauthAuthTypes(discovery: McpOauthDiscoveryResult): McpSupportedOauthAuthType[] {
    const supportedAuthTypes: McpSupportedOauthAuthType[] = [];
    if (this.supportsAuthorizationCode(discovery)) {
      supportedAuthTypes.push("oauth_authorization_code");
    }
    if (this.supportsClientCredentials(discovery)) {
      supportedAuthTypes.push("oauth_client_credentials");
    }

    return supportedAuthTypes;
  }

  private buildDetectionMessage(
    detectedAuthType: McpSupportedOauthAuthType,
    supportedAuthTypes: McpSupportedOauthAuthType[],
    protectedResourceMetadata: McpProtectedResourceMetadata,
  ): string {
    const resourceName = normalizeNonEmptyString(protectedResourceMetadata["resource_name"])
      ?? "the MCP server";

    if (
      detectedAuthType === "oauth_authorization_code"
      && supportedAuthTypes.includes("oauth_client_credentials")
    ) {
      return `Auto-detected OAuth authorization code for ${resourceName}. The server also advertises client credentials, but authorization code is the default.`;
    }

    return detectedAuthType === "oauth_authorization_code"
      ? `Auto-detected OAuth authorization code for ${resourceName}.`
      : `Auto-detected OAuth client credentials for ${resourceName}.`;
  }

  private readGrantTypes(metadata: OAuthAuthorizationServerMetadata): string[] {
    return Array.isArray(metadata.grant_types_supported)
      ? metadata.grant_types_supported
          .map((value) => normalizeNonEmptyString(value))
          .filter((value): value is string => Boolean(value))
      : [];
  }

  private readCodeChallengeMethods(metadata: OAuthAuthorizationServerMetadata): string[] {
    return Array.isArray(metadata.code_challenge_methods_supported)
      ? metadata.code_challenge_methods_supported
          .map((value) => normalizeNonEmptyString(value))
          .filter((value): value is string => Boolean(value))
      : [];
  }

  private supportsDynamicClientRegistration(metadata: OAuthAuthorizationServerMetadata): boolean {
    return Boolean(normalizeNonEmptyString(metadata.registration_endpoint));
  }

  private isManualSelectionRequired(errorMessage: string): boolean {
    return errorMessage.includes("resource_metadata")
      || errorMessage.includes("reject unauthenticated requests")
      || errorMessage.includes("authorization_servers");
  }
}
