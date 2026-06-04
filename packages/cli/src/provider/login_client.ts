export type ProviderLoginResolvedRequest = {
  companyName: string;
  credentialName: string;
  expiresAt: string;
  modelProvider: string;
  piOauthProviderId: string;
  providerName: string;
  requestId: string;
  requestedBy: string;
};

export type ProviderLoginCredentials = {
  access: string;
  expires: number;
  refresh: string;
  [key: string]: unknown;
};

/**
 * Calls the CompanyHelm provider credential login endpoints using only the short-lived code as the
 * bearer capability. The CLI intentionally does not need a browser session or a long-lived API key.
 */
export class ProviderLoginClient {
  private readonly apiUrl: string;

  constructor(apiUrl: string) {
    this.apiUrl = ProviderLoginClient.normalizeApiUrl(apiUrl);
  }

  async resolve(code: string): Promise<ProviderLoginResolvedRequest> {
    const url = new URL("/model-provider-credential-login/resolve", this.apiUrl);
    url.searchParams.set("code", code);
    const response = await fetch(url);
    return this.parseResponse<ProviderLoginResolvedRequest>(response);
  }

  async complete(input: {
    code: string;
    credentials: ProviderLoginCredentials;
  }): Promise<{ credentialId: string; status: string }> {
    const response = await fetch(new URL("/model-provider-credential-login/complete", this.apiUrl), {
      body: JSON.stringify(input),
      headers: {
        "content-type": "application/json",
      },
      method: "POST",
    });

    return this.parseResponse(response);
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload?.error || `CompanyHelm API request failed with status ${response.status}.`);
    }

    return payload as T;
  }

  private static normalizeApiUrl(apiUrl: string): string {
    const parsedUrl = new URL(apiUrl);
    parsedUrl.pathname = parsedUrl.pathname.replace(/\/$/u, "");
    parsedUrl.search = "";
    parsedUrl.hash = "";
    return parsedUrl.toString();
  }
}
