/**
 * Extracts the selected provider OAuth payload from the pasted auth file so the dialog can send
 * only the normalized tokens that the API persists instead of forwarding the whole document.
 */
export class OauthCredentialFileParser {
  parse(input: { authFileContents: string; providerId: string }): {
    accessToken: string;
    accessTokenExpiresAtMilliseconds: string;
    refreshToken: string;
  } {
    const normalizedProviderId = String(input.providerId || "").trim();
    if (!normalizedProviderId) {
      throw new Error("Provider is required.");
    }

    const payload = this.parseJsonDocument(input.authFileContents);
    const providerPayload = payload[normalizedProviderId];
    if (!this.isRecord(providerPayload)) {
      throw new Error(`Auth file does not contain credentials for ${normalizedProviderId}.`);
    }

    const authorizationType = String(providerPayload.type || "").trim();
    if (authorizationType !== "oauth") {
      throw new Error(`Auth file entry for ${normalizedProviderId} must be type oauth.`);
    }

    const accessToken = String(providerPayload.access || "").trim();
    if (!accessToken) {
      throw new Error(`Auth file entry for ${normalizedProviderId} is missing access token.`);
    }

    const refreshToken = String(providerPayload.refresh || "").trim();
    if (!refreshToken) {
      throw new Error(`Auth file entry for ${normalizedProviderId} is missing refresh token.`);
    }

    const expires = Number(providerPayload.expires);
    if (!Number.isFinite(expires) || expires <= 0) {
      throw new Error(`Auth file entry for ${normalizedProviderId} is missing a valid expires timestamp.`);
    }

    return {
      accessToken: this.resolveAccessToken({
        accessToken,
        providerId: normalizedProviderId,
        providerPayload,
      }),
      accessTokenExpiresAtMilliseconds: String(expires),
      refreshToken,
    };
  }

  private resolveAccessToken(input: {
    accessToken: string;
    providerId: string;
    providerPayload: Record<string, unknown>;
  }): string {
    if (input.providerId !== "google-gemini-cli") {
      return input.accessToken;
    }

    const projectId = String(input.providerPayload.projectId || "").trim();
    if (!projectId) {
      throw new Error("Auth file entry for google-gemini-cli is missing projectId.");
    }

    return JSON.stringify({
      token: input.accessToken,
      projectId,
    });
  }

  private parseJsonDocument(rawDocument: string): Record<string, unknown> {
    const normalizedDocument = String(rawDocument || "").trim();
    if (!normalizedDocument) {
      throw new Error("Auth file is required.");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(normalizedDocument);
    } catch {
      throw new Error("Auth file must be valid JSON.");
    }

    if (!this.isRecord(payload)) {
      throw new Error("Auth file must be a JSON object.");
    }

    return payload;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
