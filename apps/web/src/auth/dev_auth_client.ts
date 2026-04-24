import { config } from "@/config";
import type { DevAuthUserDetailDocument, DevCreateCompanyInput, DevSignUpInput } from "./companyhelm_auth";

export type DevAuthUserSummaryDocument = {
  email: string;
  firstName: string;
  hasActiveCompany: boolean;
  id: string;
  lastName: string | null;
  primaryCompanyName: string | null;
  primaryCompanySlug: string | null;
};

/**
 * Wraps the dev auth HTTP endpoints so the React provider can keep all request construction and
 * error parsing in one place while GraphQL auth itself stays header-based.
 */
export class DevAuthClient {
  async listUsers(): Promise<DevAuthUserSummaryDocument[]> {
    const response = await this.request<{
      users: DevAuthUserSummaryDocument[];
    }>("/auth/dev/users", {
      method: "GET",
    });

    return response.users;
  }

  async loadUser(input: {
    email?: string;
    userId?: string;
  }): Promise<DevAuthUserDetailDocument> {
    const url = new URL(this.resolveUrl("/auth/dev/user"));
    if (input.email) {
      url.searchParams.set("email", input.email);
    }
    if (input.userId) {
      url.searchParams.set("userId", input.userId);
    }

    return this.requestAbsolute(url.toString(), {
      method: "GET",
    });
  }

  async signUp(input: DevSignUpInput): Promise<DevAuthUserDetailDocument> {
    return this.request("/auth/dev/sign-up", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  }

  async createCompany(input: DevCreateCompanyInput): Promise<DevAuthUserDetailDocument> {
    return this.request("/auth/dev/create-company", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  }

  private async request<TResponse>(
    path: string,
    init: RequestInit,
  ): Promise<TResponse> {
    return this.requestAbsolute(this.resolveUrl(path), init);
  }

  private async requestAbsolute<TResponse>(
    url: string,
    init: RequestInit,
  ): Promise<TResponse> {
    const response = await fetch(url, init);
    const payload = await response.json().catch(() => null) as {
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(String(payload?.error || `Request failed with status ${response.status}.`));
    }

    return payload as TResponse;
  }

  private resolveUrl(path: string): string {
    const url = new URL(config.graphqlUrl);
    url.pathname = path;
    url.search = "";
    url.hash = "";
    return url.toString();
  }
}
