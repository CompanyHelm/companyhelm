import type { AuthenticateBearerTokenHeaders } from "../auth_provider.ts";

export type DevAuthHeaderSelection = {
  companyId: string;
  userId: string;
};

/**
 * Parses the explicit dev-only impersonation headers so the API can authenticate requests without
 * JWTs or cookies when the runtime auth provider is `dev`.
 */
export class DevAuthHeaders {
  static readonly COMPANY_HEADER_NAME = "x-dev-company-id";
  static readonly USER_HEADER_NAME = "x-dev-user-id";

  static hasAny(headers: AuthenticateBearerTokenHeaders): boolean {
    return Boolean(
      this.readHeader(headers, DevAuthHeaders.USER_HEADER_NAME)
      || this.readHeader(headers, DevAuthHeaders.COMPANY_HEADER_NAME),
    );
  }

  static requireSelection(headers: AuthenticateBearerTokenHeaders): DevAuthHeaderSelection {
    const userId = this.readHeader(headers, DevAuthHeaders.USER_HEADER_NAME);
    const companyId = this.readHeader(headers, DevAuthHeaders.COMPANY_HEADER_NAME);
    if (!userId && !companyId) {
      throw new Error("Dev auth headers are required.");
    }
    if (!userId || !companyId) {
      throw new Error("Both X-Dev-User-Id and X-Dev-Company-Id are required.");
    }

    return {
      companyId,
      userId,
    };
  }

  private static readHeader(headers: AuthenticateBearerTokenHeaders, name: string): string {
    const rawValue = headers[name] ?? headers[name.toLowerCase()] ?? headers[name.toUpperCase()];
    if (typeof rawValue === "string") {
      return rawValue.trim();
    }

    if (Array.isArray(rawValue)) {
      return String(rawValue[0] || "").trim();
    }

    return "";
  }
}
