import { injectable } from "inversify";
import type { McpOauthDiscoveryResult, OAuthAuthorizationServerMetadata } from "./types.ts";
import {
  normalizeNonEmptyString,
  type McpProtectedResourceMetadata,
} from "./types.ts";

function buildOauthAuthorizationServerMetadataUrl(issuer: string): string {
  return new URL("/.well-known/oauth-authorization-server", issuer).toString();
}

function buildOidcConfigurationUrl(issuer: string): string {
  return new URL("/.well-known/openid-configuration", issuer).toString();
}

function parseResourceMetadataUrl(wwwAuthenticateHeader: string | null): string | null {
  const normalizedHeader = normalizeNonEmptyString(wwwAuthenticateHeader);
  if (!normalizedHeader) {
    return null;
  }

  const match = normalizedHeader.match(/resource_metadata="([^"]+)"/iu);
  return normalizeNonEmptyString(match?.[1]);
}

async function readJsonResponse(
  response: Response,
  errorPrefix: string,
): Promise<Record<string, unknown>> {
  const rawBody = await response.text();
  if (!response.ok) {
    const normalizedBody = normalizeNonEmptyString(rawBody);
    throw new Error(normalizedBody ? `${errorPrefix}: ${normalizedBody}` : errorPrefix);
  }

  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new Error(`${errorPrefix}: response body must be valid JSON.`);
  }
}

@injectable()
export class McpOauthDiscoveryService {
  async discover(params: {
    fetchImpl?: typeof fetch;
    mcpServerUrl: string;
  }): Promise<McpOauthDiscoveryResult> {
    const mcpServerUrl = normalizeNonEmptyString(params.mcpServerUrl);
    if (!mcpServerUrl) {
      throw new Error("MCP server URL is required.");
    }

    const fetchImpl = params.fetchImpl ?? fetch;
    const challengeResponse = await fetchImpl(mcpServerUrl, {
      method: "GET",
      redirect: "manual",
    });
    const resourceMetadataUrl = parseResourceMetadataUrl(challengeResponse.headers.get("WWW-Authenticate"));
    if (!resourceMetadataUrl) {
      throw new Error("MCP server must challenge unauthorized requests with resource_metadata.");
    }
    if (challengeResponse.ok || (challengeResponse.status !== 401 && challengeResponse.status !== 403)) {
      throw new Error("MCP server must reject unauthenticated requests before OAuth discovery.");
    }

    const protectedResourceMetadata = await readJsonResponse(
      await fetchImpl(resourceMetadataUrl, { method: "GET" }),
      "Failed to load protected resource metadata",
    ) as McpProtectedResourceMetadata;
    const authorizationServerIssuer = normalizeNonEmptyString(protectedResourceMetadata.authorization_servers?.[0]);
    if (!authorizationServerIssuer) {
      throw new Error("Protected resource metadata is missing authorization_servers.");
    }

    const authorizationServerMetadata = await this.loadAuthorizationServerMetadata({
      authorizationServerIssuer,
      fetchImpl,
    });

    return {
      authorizationServerIssuer,
      authorizationServerMetadata,
      resourceMetadataUrl,
      protectedResourceMetadata,
    };
  }

  private async loadAuthorizationServerMetadata(params: {
    authorizationServerIssuer: string;
    fetchImpl: typeof fetch;
  }): Promise<OAuthAuthorizationServerMetadata> {
    const oauthMetadataUrl = buildOauthAuthorizationServerMetadataUrl(params.authorizationServerIssuer);

    try {
      return await readJsonResponse(
        await params.fetchImpl(oauthMetadataUrl, { method: "GET" }),
        "Failed to load authorization server metadata",
      ) as OAuthAuthorizationServerMetadata;
    } catch (oauthMetadataError) {
      const oidcMetadataUrl = buildOidcConfigurationUrl(params.authorizationServerIssuer);

      try {
        return await readJsonResponse(
          await params.fetchImpl(oidcMetadataUrl, { method: "GET" }),
          "Failed to load OIDC discovery metadata",
        ) as OAuthAuthorizationServerMetadata;
      } catch {
        throw oauthMetadataError;
      }
    }
  }
}
