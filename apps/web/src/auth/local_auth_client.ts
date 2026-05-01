import { config } from "@/config";

export type LocalAuthSessionDocument = {
  activeOrganizationId: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  token: string;
  user: {
    email: string;
    firstName: string;
    id: string;
    lastName: string | null;
  };
};

/**
 * Wraps the local auth HTTP endpoints so the React provider can keep all request construction and
 * error parsing in one place.
 */
export class LocalAuthClient {
  async loadSession(token: string): Promise<LocalAuthSessionDocument> {
    return this.request("/auth/local/session", {
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "GET",
    });
  }

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<LocalAuthSessionDocument> {
    return this.request("/auth/local/sign-in", {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });
  }

  async signOut(token: string): Promise<void> {
    await this.request("/auth/local/sign-out", {
      headers: {
        authorization: `Bearer ${token}`,
      },
      method: "POST",
    });
  }

  async signUp(input: {
    companyName: string;
    email: string;
    firstName: string;
    lastName?: string;
    password: string;
  }): Promise<LocalAuthSessionDocument> {
    return this.request("/auth/local/sign-up", {
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
