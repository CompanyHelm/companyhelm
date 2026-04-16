import { getOAuthProvider, type OAuthCredentials, type OAuthProviderId } from "@mariozechner/pi-ai/oauth";
import { injectable } from "inversify";

export type LlmOauthCredentialRecord = {
  id: string;
  modelProvider: string;
  encryptedApiKey: string;
  refreshToken: string | null;
  accessTokenExpiresAtMilliseconds: number | string;
};

@injectable()
export class LlmOauthCredentialRefreshService {
  async refreshCredential(credential: LlmOauthCredentialRecord): Promise<OAuthCredentials> {
    const refreshToken = credential.refreshToken?.trim();
    if (!refreshToken) {
      throw new Error("OAuth credential is missing a refresh token.");
    }

    const expires = Number(credential.accessTokenExpiresAtMilliseconds);
    if (!Number.isFinite(expires) || expires <= 0) {
      throw new Error("OAuth credential is missing a valid access token expiry.");
    }

    const oauthProvider = getOAuthProvider(this.resolveOAuthProviderId(credential.modelProvider));
    if (!oauthProvider) {
      throw new Error(`OAuth provider is not registered for model provider ${credential.modelProvider}.`);
    }

    const refreshedCredential = await oauthProvider.refreshToken(
      this.resolveStoredCredentials(credential, refreshToken, expires),
    );

    return {
      ...refreshedCredential,
      access: oauthProvider.getApiKey(refreshedCredential),
    };
  }

  private resolveOAuthProviderId(modelProvider: string): OAuthProviderId {
    if (modelProvider === "openai-codex") {
      return "openai-codex";
    }
    if (modelProvider === "google-gemini-cli") {
      return "google-gemini-cli";
    }

    throw new Error(`Unsupported OAuth model provider: ${modelProvider}`);
  }

  private resolveStoredCredentials(
    credential: LlmOauthCredentialRecord,
    refreshToken: string,
    expires: number,
  ): OAuthCredentials {
    if (credential.modelProvider === "openai-codex") {
      return {
        access: credential.encryptedApiKey,
        refresh: refreshToken,
        expires,
      };
    }

    const parsedApiKey = this.parseGoogleGeminiCliApiKey(credential.encryptedApiKey);
    return {
      access: parsedApiKey.token,
      refresh: refreshToken,
      expires,
      projectId: parsedApiKey.projectId,
    };
  }

  private parseGoogleGeminiCliApiKey(apiKey: string): { token: string; projectId: string } {
    let payload: unknown;
    try {
      payload = JSON.parse(String(apiKey || "").trim());
    } catch {
      throw new Error("Google Gemini CLI credentials must include a JSON token and projectId.");
    }

    if (!this.isRecord(payload)) {
      throw new Error("Google Gemini CLI credentials must include a JSON token and projectId.");
    }

    const token = String(payload.token || "").trim();
    const projectId = String(payload.projectId || "").trim();
    if (!token || !projectId) {
      throw new Error("Google Gemini CLI credentials must include a token and projectId.");
    }

    return { token, projectId };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
