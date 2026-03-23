/**
 * Centralizes auth-provider construction and header parsing so transport code keeps a tiny surface.
 */
export class AuthProviderFactory {
  static extractBearerToken(authorizationHeader: unknown): string | null {
    const normalizedAuthorizationHeader = AuthProviderFactory.normalizeAuthorizationHeader(
      authorizationHeader,
    ).trim();
    if (!normalizedAuthorizationHeader) {
      return null;
    }

    const [scheme, token] = normalizedAuthorizationHeader.split(/\s+/, 2);
    if (String(scheme || "").toLowerCase() !== "bearer") {
      return null;
    }

    const normalizedToken = String(token || "").trim();
    return normalizedToken || null;
  }

  private static normalizeAuthorizationHeader(authorizationHeader: unknown): string {
    if (typeof authorizationHeader === "string") {
      return authorizationHeader;
    }

    if (Array.isArray(authorizationHeader)) {
      return String(authorizationHeader[0] || "");
    }

    return "";
  }
}
