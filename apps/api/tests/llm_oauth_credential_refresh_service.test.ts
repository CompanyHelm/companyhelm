import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import {
  registerOAuthProvider,
  resetOAuthProviders,
  type OAuthCredentials,
  type OAuthProviderInterface,
} from "@mariozechner/pi-ai/oauth";
import { LlmOauthCredentialRefreshService } from "../src/services/ai_providers/llm_oauth_credential_refresh_service.ts";

afterEach(() => {
  resetOAuthProviders();
});

test("LlmOauthCredentialRefreshService refreshes google-gemini-cli with projectId from the stored runtime key", async () => {
  const refreshCalls: OAuthCredentials[] = [];
  const provider: OAuthProviderInterface = {
    id: "google-gemini-cli",
    name: "Test Gemini CLI",
    async login(): Promise<OAuthCredentials> {
      throw new Error("login should not be called");
    },
    async refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
      refreshCalls.push(credentials);
      return {
        access: "new-access-token",
        refresh: "new-refresh-token",
        expires: 1776325278238,
        projectId: credentials.projectId,
      };
    },
    getApiKey(credentials: OAuthCredentials): string {
      return JSON.stringify({
        token: credentials.access,
        projectId: credentials.projectId,
      });
    },
  };
  registerOAuthProvider(provider);

  const refreshedCredential = await new LlmOauthCredentialRefreshService().refreshCredential({
    id: "credential-1",
    modelProvider: "google-gemini-cli",
    encryptedApiKey: JSON.stringify({
      token: "old-access-token",
      projectId: "project-1",
    }),
    refreshToken: "old-refresh-token",
    accessTokenExpiresAtMilliseconds: 1776321678238,
  });

  assert.deepEqual(refreshCalls, [{
    access: "old-access-token",
    refresh: "old-refresh-token",
    expires: 1776321678238,
    projectId: "project-1",
  }]);
  assert.deepEqual(refreshedCredential, {
    access: JSON.stringify({
      token: "new-access-token",
      projectId: "project-1",
    }),
    refresh: "new-refresh-token",
    expires: 1776325278238,
    projectId: "project-1",
  });
});

test("LlmOauthCredentialRefreshService rejects google-gemini-cli credentials without projectId", async () => {
  await assert.rejects(
    () =>
      new LlmOauthCredentialRefreshService().refreshCredential({
        id: "credential-1",
        modelProvider: "google-gemini-cli",
        encryptedApiKey: JSON.stringify({
          token: "old-access-token",
        }),
        refreshToken: "old-refresh-token",
        accessTokenExpiresAtMilliseconds: 1776321678238,
      }),
    /token and projectId/,
  );
});
