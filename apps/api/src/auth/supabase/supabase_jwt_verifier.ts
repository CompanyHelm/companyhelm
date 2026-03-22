import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

export type SupabaseJwtClaims = JWTPayload & {
  email?: string;
  user_metadata?: Record<string, unknown>;
};

/**
 * Verifies Supabase access tokens against the project's JWKS endpoint and normalizes auth claims.
 */
export class SupabaseJwtVerifier {
  private readonly audience: string;
  private readonly getKey: JWTVerifyGetKey;
  private readonly issuer: string;

  constructor(config: {
    projectUrl: string;
    getKey?: JWTVerifyGetKey;
    issuer?: string;
    audience?: string;
  }) {
    const projectUrl = SupabaseJwtVerifier.normalizeProjectUrl(config.projectUrl);
    this.issuer = String(config.issuer || new URL("/auth/v1", projectUrl).href).trim();
    this.audience = String(config.audience || "authenticated").trim() || "authenticated";
    this.getKey = config.getKey
      ?? createRemoteJWKSet(new URL("/auth/v1/.well-known/jwks.json", projectUrl));
  }

  async verify(token: string): Promise<SupabaseJwtClaims> {
    const normalizedToken = String(token || "").trim();
    if (!normalizedToken) {
      throw new Error("Supabase bearer token is required.");
    }

    const { payload } = await jwtVerify(normalizedToken, this.getKey, {
      issuer: this.issuer,
      audience: this.audience,
    });

    return {
      ...payload,
      user_metadata: SupabaseJwtVerifier.normalizeClaimObject(payload.user_metadata),
    };
  }

  private static normalizeClaimObject(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  }

  private static normalizeProjectUrl(rawProjectUrl: string): URL {
    try {
      return new URL(String(rawProjectUrl || "").trim());
    } catch {
      throw new Error("Supabase JWT verification requires a valid project URL.");
    }
  }
}
