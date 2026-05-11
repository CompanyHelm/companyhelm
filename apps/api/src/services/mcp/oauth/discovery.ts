import { injectable } from "inversify";
import type { McpOauthDiscoveryResult, OAuthAuthorizationServerMetadata } from "./types.ts";
import {
  normalizeNonEmptyString,
  type McpProtectedResourceMetadata,
} from "./types.ts";

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return "";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function buildPathScopedWellKnownUrl(issuer: string, prefix: string): string | null {
  const parsedIssuer = new URL(issuer);
  const normalizedPathname = normalizePathname(parsedIssuer.pathname);
  if (!normalizedPathname) {
    return null;
  }

  return new URL(`${prefix}${normalizedPathname}`, parsedIssuer.origin).toString();
}

function buildOauthAuthorizationServerMetadataUrls(issuer: string): string[] {
  const candidateUrls = [
    buildPathScopedWellKnownUrl(issuer, "/.well-known/oauth-authorization-server"),
    new URL("/.well-known/oauth-authorization-server", issuer).toString(),
  ];
  return [...new Set(candidateUrls.filter((candidateUrl): candidateUrl is string => Boolean(candidateUrl)))];
}

function buildOidcConfigurationUrls(issuer: string): string[] {
  const candidateUrls = [
    buildPathScopedWellKnownUrl(issuer, "/.well-known/openid-configuration"),
    new URL("/.well-known/openid-configuration", issuer).toString(),
  ];
  return [...new Set(candidateUrls.filter((candidateUrl): candidateUrl is string => Boolean(candidateUrl)))];
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

function buildChallengeRequestHeaders(): HeadersInit {
  return {
    Accept: "application/json, text/event-stream",
  };
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
      headers: buildChallengeRequestHeaders(),
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
    const oauthMetadataError = await this.loadMetadataFromCandidateUrls({
      candidateUrls: buildOauthAuthorizationServerMetadataUrls(params.authorizationServerIssuer),
      errorPrefix: "Failed to load authorization server metadata",
      fetchImpl: params.fetchImpl,
    });
    if (!(oauthMetadataError instanceof Error)) {
      return oauthMetadataError;
    }

    const oidcMetadataResult = await this.loadMetadataFromCandidateUrls({
      candidateUrls: buildOidcConfigurationUrls(params.authorizationServerIssuer),
      errorPrefix: "Failed to load OIDC discovery metadata",
      fetchImpl: params.fetchImpl,
    });
    if (!(oidcMetadataResult instanceof Error)) {
      return oidcMetadataResult;
    }

    throw oauthMetadataError;
  }

  private async loadMetadataFromCandidateUrls(params: {
    candidateUrls: string[];
    errorPrefix: string;
    fetchImpl: typeof fetch;
  }): Promise<OAuthAuthorizationServerMetadata | Error> {
    let lastError: Error | null = null;

    for (const candidateUrl of params.candidateUrls) {
      try {
        return await readJsonResponse(
          await params.fetchImpl(candidateUrl, { method: "GET" }),
          params.errorPrefix,
        ) as OAuthAuthorizationServerMetadata;
      } catch (error) {
        lastError = error instanceof Error
          ? error
          : new Error(params.errorPrefix);
      }
    }

    return lastError ?? new Error(params.errorPrefix);
  }
}
