import { getOAuthProvider, type OAuthCredentials, type OAuthProviderId } from "@mariozechner/pi-ai/oauth";
import { injectable } from "inversify";

export type LlmOauthCredentialRecord = {
  id: string;
  modelProvider: "openai-codex";
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

    return oauthProvider.refreshToken({
      access: credential.encryptedApiKey,
      refresh: refreshToken,
      expires,
    });
  }

  private resolveOAuthProviderId(modelProvider: LlmOauthCredentialRecord["modelProvider"]): OAuthProviderId {
    if (modelProvider === "openai-codex") {
      return "openai-codex";
    }

    throw new Error(`Unsupported OAuth model provider: ${modelProvider}`);
  }
}
