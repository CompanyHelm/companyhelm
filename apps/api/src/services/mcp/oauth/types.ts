export type McpServerAuthType =
  | "none"
  | "authorization_header"
  | "oauth_client_credentials"
  | "oauth_authorization_code";

export type McpOauthConnectionStatus = "connected" | "degraded" | "not_connected";

export type McpSupportedOauthAuthType = "oauth_client_credentials" | "oauth_authorization_code";

export type McpProtectedResourceMetadata = {
  authorization_servers?: string[];
  bearer_methods_supported?: string[];
  resource?: string;
  scopes_supported?: string[];
  [key: string]: unknown;
};

export type OAuthAuthorizationServerMetadata = {
  authorization_endpoint?: string;
  code_challenge_methods_supported?: string[];
  grant_types_supported?: string[];
  issuer?: string;
  registration_endpoint?: string;
  scopes_supported?: string[];
  token_endpoint?: string;
  token_endpoint_auth_methods_supported?: string[];
  [key: string]: unknown;
};

export type McpOauthDiscoveryResult = {
  authorizationServerIssuer: string;
  authorizationServerMetadata: OAuthAuthorizationServerMetadata;
  resourceMetadataUrl: string;
  protectedResourceMetadata: McpProtectedResourceMetadata;
};

export type McpOauthRegisteredClient = {
  clientId: string;
  clientSecret: string | null;
  clientRegistrationMetadata: Record<string, unknown> | null;
  tokenEndpointAuthMethod: string;
};

export type StoredMcpOauthToken = {
  accessToken: string;
  expiresAt: string | null;
  rawResponse: Record<string, unknown>;
  refreshToken: string | null;
  scope: string[];
  tokenType: string;
};

export type RefreshedMcpOauthTokenSet = {
  accessToken: string;
  expiresAt: Date | null;
  rawResponse: Record<string, unknown>;
  refreshToken: string | null;
  scope: string[];
  tokenType: string;
};

export function normalizeNonEmptyString(value: unknown): string | null {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

export function normalizePositiveNumber(value: unknown): number | null {
  const parsedValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
}

export function normalizeScopeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value
      .map((scope) => normalizeNonEmptyString(scope))
      .filter((scope): scope is string => Boolean(scope)))];
  }

  const normalizedValue = normalizeNonEmptyString(value);
  if (!normalizedValue) {
    return [];
  }

  return [...new Set(normalizedValue.split(/\s+/u).map((scope) => scope.trim()).filter(Boolean))];
}

export function parseStoredMcpOauthToken(value: string): StoredMcpOauthToken {
  const parsedValue = JSON.parse(value) as Partial<StoredMcpOauthToken>;
  const accessToken = normalizeNonEmptyString(parsedValue.accessToken);
  if (!accessToken) {
    throw new Error("Stored MCP OAuth token is missing an access token.");
  }

  return {
    accessToken,
    expiresAt: normalizeNonEmptyString(parsedValue.expiresAt),
    rawResponse: typeof parsedValue.rawResponse === "object" && parsedValue.rawResponse !== null
      ? parsedValue.rawResponse as Record<string, unknown>
      : {},
    refreshToken: normalizeNonEmptyString(parsedValue.refreshToken),
    scope: normalizeScopeList(parsedValue.scope),
    tokenType: normalizeNonEmptyString(parsedValue.tokenType) ?? "Bearer",
  };
}

export function serializeStoredMcpOauthToken(value: {
  accessToken: string;
  expiresAt: Date | null;
  rawResponse: Record<string, unknown>;
  refreshToken?: string | null;
  scope?: string[] | null;
  tokenType?: string | null;
}): string {
  return JSON.stringify({
    accessToken: normalizeNonEmptyString(value.accessToken),
    expiresAt: value.expiresAt ? value.expiresAt.toISOString() : null,
    rawResponse: value.rawResponse,
    refreshToken: normalizeNonEmptyString(value.refreshToken),
    scope: normalizeScopeList(value.scope),
    tokenType: normalizeNonEmptyString(value.tokenType) ?? "Bearer",
  } satisfies StoredMcpOauthToken);
}
