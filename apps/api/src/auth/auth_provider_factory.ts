import type { Config } from "../config/schema.ts";
import { AppRuntimeDatabase } from "../db/app_runtime_database.ts";
import { ClerkAuthProvider } from "./clerk/clerk_auth_provider.ts";
import { AuthProvider } from "./auth_provider.ts";

/**
 * Centralizes auth-provider construction and header parsing so transport code keeps a tiny surface.
 */
export class AuthProviderFactory {
  static createAuthProvider(
    config: Config,
    dependencies: {
      appRuntimeDatabase?: Pick<AppRuntimeDatabase, "applyCompanyContext">;
      clerkClient?: ConstructorParameters<typeof ClerkAuthProvider>[1]["clerkClient"];
    } = {},
  ): AuthProvider {
    const clerkConfig = config.auth.clerk;
    return new ClerkAuthProvider(clerkConfig, {
      appRuntimeDatabase: dependencies.appRuntimeDatabase,
      clerkClient: dependencies.clerkClient,
    });
  }

  static extractBearerToken(authorizationHeader: unknown): string | null {
    const normalizedAuthorizationHeader = AuthProviderFactory.normalizeAuthorizationHeader(authorizationHeader).trim();
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
