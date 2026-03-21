import type { AppConfig } from "../../config/config.ts";
import { CompanyhelmAuthProvider } from "./companyhelm/companyhelm_auth_provider.ts";

/**
 * Centralizes auth-provider construction and header parsing so transport code keeps a tiny surface.
 */
export class AuthProviderFactory {
  static createAuthProvider(config: AppConfig): CompanyhelmAuthProvider {
    if (config.authProvider !== "companyhelm") {
      throw new Error("Only the companyhelm auth provider is implemented.");
    }

    const companyhelmConfig = config.auth.companyhelm;
    if (!companyhelmConfig) {
      throw new Error("CompanyHelm auth provider requires auth.companyhelm configuration.");
    }

    return new CompanyhelmAuthProvider(companyhelmConfig);
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
