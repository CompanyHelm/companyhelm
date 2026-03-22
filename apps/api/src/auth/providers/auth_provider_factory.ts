import type { ConfigDocument } from "../../config/schema.ts";
import { CompanyhelmAuthProvider } from "./companyhelm/companyhelm_auth_provider.ts";
import { SupabaseAuthProvider } from "./supabase/supabase_auth_provider.ts";
import type { AuthProviderInterface } from "./auth_provider_interface.ts";

/**
 * Centralizes auth-provider construction and header parsing so transport code keeps a tiny surface.
 */
export class AuthProviderFactory {
  static createAuthProvider(
    config: ConfigDocument,
    dependencies: {
      supabaseJwtVerifier?: ConstructorParameters<typeof SupabaseAuthProvider>[1]["supabaseJwtVerifier"];
    } = {},
  ): AuthProviderInterface {
    const authConfig = config.auth;
    if (authConfig.provider === "companyhelm") {
      const companyhelmConfig = authConfig.companyhelm;
      if (!companyhelmConfig) {
        throw new Error("CompanyHelm auth provider requires auth.companyhelm configuration.");
      }

      return new CompanyhelmAuthProvider(companyhelmConfig);
    }

    const supabaseConfig = authConfig.supabase;
    if (!supabaseConfig) {
      throw new Error("Supabase auth provider requires auth.supabase configuration.");
    }

    return new SupabaseAuthProvider(supabaseConfig, dependencies);
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
