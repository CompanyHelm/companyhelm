import { Buffer } from "node:buffer";
import { injectable } from "inversify";
import type { RefreshedMcpOauthTokenSet } from "./types.ts";
import {
  normalizeNonEmptyString,
  normalizePositiveNumber,
  normalizeScopeList,
} from "./types.ts";

type SupportedTokenEndpointAuthMethod = "client_secret_basic" | "client_secret_post" | "none";

/**
 * Centralizes OAuth token endpoint exchanges so every MCP OAuth flow uses the same auth-method
 * handling for authorization-code, refresh-token, and client-credentials grants.
 */
@injectable()
export class McpOauthTokenService {
  async exchangeAuthorizationCode(params: {
    clientId: string;
    clientSecret?: string | null;
    code: string;
    codeVerifier: string;
    fetchImpl?: typeof fetch;
    now?: Date;
    redirectUri: string;
    resource: string;
    tokenEndpoint: string;
    tokenEndpointAuthMethod?: string | null;
  }): Promise<RefreshedMcpOauthTokenSet> {
    const code = normalizeNonEmptyString(params.code);
    const codeVerifier = normalizeNonEmptyString(params.codeVerifier);
    const redirectUri = normalizeNonEmptyString(params.redirectUri);
    if (!code) {
      throw new Error("OAuth authorization code is required.");
    }
    if (!codeVerifier) {
      throw new Error("OAuth PKCE code verifier is required.");
    }
    if (!redirectUri) {
      throw new Error("OAuth redirect URI is required.");
    }

    const payload = await this.requestToken({
      bodyEntries: {
        code,
        code_verifier: codeVerifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      },
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      fetchImpl: params.fetchImpl,
      resource: params.resource,
      tokenEndpoint: params.tokenEndpoint,
      tokenEndpointAuthMethod: params.tokenEndpointAuthMethod,
    });

    return this.presentTokenResponse(payload, params.now);
  }

  async refreshTokens(params: {
    clientId: string;
    clientSecret?: string | null;
    fetchImpl?: typeof fetch;
    now?: Date;
    refreshToken: string;
    resource: string;
    tokenEndpoint: string;
    tokenEndpointAuthMethod?: string | null;
  }): Promise<RefreshedMcpOauthTokenSet> {
    const refreshToken = normalizeNonEmptyString(params.refreshToken);
    if (!refreshToken) {
      throw new Error("Refresh token is required.");
    }

    const payload = await this.requestToken({
      bodyEntries: {
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      },
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      fetchImpl: params.fetchImpl,
      resource: params.resource,
      tokenEndpoint: params.tokenEndpoint,
      tokenEndpointAuthMethod: params.tokenEndpointAuthMethod,
    });

    return this.presentTokenResponse(payload, params.now, refreshToken);
  }

  async requestClientCredentialsToken(params: {
    clientId: string;
    clientSecret?: string | null;
    fetchImpl?: typeof fetch;
    now?: Date;
    requestedScopes?: string[] | null;
    resource: string;
    tokenEndpoint: string;
    tokenEndpointAuthMethod?: string | null;
  }): Promise<RefreshedMcpOauthTokenSet> {
    const requestedScopes = normalizeScopeList(params.requestedScopes);
    const payload = await this.requestToken({
      bodyEntries: {
        grant_type: "client_credentials",
        scope: requestedScopes.length > 0 ? requestedScopes.join(" ") : null,
      },
      clientId: params.clientId,
      clientSecret: params.clientSecret,
      fetchImpl: params.fetchImpl,
      resource: params.resource,
      tokenEndpoint: params.tokenEndpoint,
      tokenEndpointAuthMethod: params.tokenEndpointAuthMethod,
    });

    return this.presentTokenResponse(payload, params.now, null, requestedScopes);
  }

  private async requestToken(params: {
    bodyEntries: Record<string, string | null>;
    clientId: string;
    clientSecret?: string | null;
    fetchImpl?: typeof fetch;
    resource: string;
    tokenEndpoint: string;
    tokenEndpointAuthMethod?: string | null;
  }): Promise<Record<string, unknown>> {
    const tokenEndpoint = normalizeNonEmptyString(params.tokenEndpoint);
    const clientId = normalizeNonEmptyString(params.clientId);
    const resource = normalizeNonEmptyString(params.resource);
    if (!tokenEndpoint) {
      throw new Error("Token endpoint is required.");
    }
    if (!clientId) {
      throw new Error("Client ID is required.");
    }
    if (!resource) {
      throw new Error("OAuth resource indicator is required.");
    }

    const tokenEndpointAuthMethod = this.resolveTokenEndpointAuthMethod(params.tokenEndpointAuthMethod);
    const clientSecret = normalizeNonEmptyString(params.clientSecret);
    if (tokenEndpointAuthMethod === "client_secret_basic" && !clientSecret) {
      throw new Error("OAuth client secret is required for client_secret_basic.");
    }
    if (tokenEndpointAuthMethod === "client_secret_post" && !clientSecret) {
      throw new Error("OAuth client secret is required for client_secret_post.");
    }

    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params.bodyEntries)) {
      const normalizedValue = normalizeNonEmptyString(value);
      if (normalizedValue) {
        body.set(key, normalizedValue);
      }
    }
    body.set("resource", resource);

    const headers: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
    };
    if (tokenEndpointAuthMethod === "client_secret_basic" && clientSecret) {
      headers.Authorization = `Basic ${Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64")}`;
    } else {
      body.set("client_id", clientId);
      if (tokenEndpointAuthMethod === "client_secret_post" && clientSecret) {
        body.set("client_secret", clientSecret);
      }
    }

    const fetchImpl = params.fetchImpl ?? fetch;
    return this.readJsonResponse(
      await fetchImpl(tokenEndpoint, {
        method: "POST",
        headers,
        body,
      }),
      "Failed to exchange OAuth token",
    );
  }

  private presentTokenResponse(
    payload: Record<string, unknown>,
    nowValue: Date | null | undefined,
    fallbackRefreshToken?: string | null,
    fallbackScopes?: string[] | null,
  ): RefreshedMcpOauthTokenSet {
    const accessToken = normalizeNonEmptyString(payload.access_token);
    if (!accessToken) {
      throw new Error("OAuth token response is missing access_token.");
    }

    const expiresInSeconds = normalizePositiveNumber(payload.expires_in);
    const now = nowValue ?? new Date();

    return {
      accessToken,
      expiresAt: expiresInSeconds ? new Date(now.getTime() + (expiresInSeconds * 1000)) : null,
      rawResponse: payload,
      refreshToken: normalizeNonEmptyString(payload.refresh_token) ?? normalizeNonEmptyString(fallbackRefreshToken),
      scope: normalizeScopeList(payload.scope).length > 0
        ? normalizeScopeList(payload.scope)
        : normalizeScopeList(fallbackScopes),
      tokenType: normalizeNonEmptyString(payload.token_type) ?? "Bearer",
    };
  }

  private resolveTokenEndpointAuthMethod(value: string | null | undefined): SupportedTokenEndpointAuthMethod {
    const normalizedValue = normalizeNonEmptyString(value) ?? "client_secret_basic";
    if (
      normalizedValue === "client_secret_basic"
      || normalizedValue === "client_secret_post"
      || normalizedValue === "none"
    ) {
      return normalizedValue;
    }

    throw new Error(`Unsupported token endpoint auth method: ${normalizedValue}.`);
  }

  private async readJsonResponse(
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
}
