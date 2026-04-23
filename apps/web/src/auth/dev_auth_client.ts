import { config } from "@/config";
import type { LocalAuthSessionDocument } from "./local_auth_client";

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
 * error parsing in one place.
 */
export class DevAuthClient {
  async loadSession(token: string): Promise<LocalAuthSessionDocument> {
    return this.request("/auth/dev/session", {
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "GET",
    });
  }

  async listUsers(): Promise<DevAuthUserSummaryDocument[]> {
    const response = await this.request<{
      users: DevAuthUserSummaryDocument[];
    }>("/auth/dev/users", {
      method: "GET",
    });

    return response.users;
  }

  async signIn(input: {
    email?: string;
    userId?: string;
  }): Promise<LocalAuthSessionDocument> {
    return this.request("/auth/dev/sign-in", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  }

  async signUp(input: {
    companyName: string;
    email: string;
    firstName: string;
    lastName?: string;
  }): Promise<LocalAuthSessionDocument> {
    return this.request("/auth/dev/sign-up", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  }

  async createCompany(input: {
    companyName: string;
    email?: string;
    userId?: string;
  }): Promise<LocalAuthSessionDocument> {
    return this.request("/auth/dev/create-company", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  }

  async signOut(token: string): Promise<void> {
    await this.request("/auth/dev/sign-out", {
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "POST",
    });
  }

  private async request<TResponse>(
    path: string,
    init: RequestInit,
  ): Promise<TResponse> {
    const response = await fetch(this.resolveUrl(path), init);
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
