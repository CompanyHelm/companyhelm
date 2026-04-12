import { injectable } from "inversify";
import type { RefreshedMcpOauthTokenSet } from "./types.ts";
import {
  normalizeNonEmptyString,
  normalizePositiveNumber,
  normalizeScopeList,
} from "./types.ts";

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
export class McpOauthTokenRefreshService {
  async refreshTokens(params: {
    clientId: string;
    clientSecret?: string | null;
    fetchImpl?: typeof fetch;
    now?: Date;
    refreshToken: string;
    resource: string;
    tokenEndpoint: string;
  }): Promise<RefreshedMcpOauthTokenSet> {
    const tokenEndpoint = normalizeNonEmptyString(params.tokenEndpoint);
    const clientId = normalizeNonEmptyString(params.clientId);
    const refreshToken = normalizeNonEmptyString(params.refreshToken);
    const resource = normalizeNonEmptyString(params.resource);
    if (!tokenEndpoint) {
      throw new Error("Token endpoint is required.");
    }
    if (!clientId) {
      throw new Error("Client ID is required.");
    }
    if (!refreshToken) {
      throw new Error("Refresh token is required.");
    }
    if (!resource) {
      throw new Error("OAuth resource indicator is required.");
    }

    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      resource,
    });
    const clientSecret = normalizeNonEmptyString(params.clientSecret);
    if (clientSecret) {
      body.set("client_secret", clientSecret);
    }

    const fetchImpl = params.fetchImpl ?? fetch;
    const payload = await readJsonResponse(
      await fetchImpl(tokenEndpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body,
      }),
      "Failed to refresh OAuth token",
    );

    const accessToken = normalizeNonEmptyString(payload.access_token);
    if (!accessToken) {
      throw new Error("OAuth refresh response is missing access_token.");
    }

    const expiresInSeconds = normalizePositiveNumber(payload.expires_in);
    if (!expiresInSeconds) {
      throw new Error("OAuth refresh response is missing expires_in.");
    }

    const now = params.now ?? new Date();

    return {
      accessToken,
      expiresAt: new Date(now.getTime() + (expiresInSeconds * 1000)),
      rawResponse: payload,
      refreshToken: normalizeNonEmptyString(payload.refresh_token) ?? refreshToken,
      scope: normalizeScopeList(payload.scope),
      tokenType: normalizeNonEmptyString(payload.token_type) ?? "Bearer",
    };
  }
}
