import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, test } from "vitest";
import { resetOAuthProviders } from "@mariozechner/pi-ai/oauth";
import { LlmOauthCredentialRefreshService } from "../src/services/ai_providers/llm_oauth_credential_refresh_service.ts";

afterEach(() => {
  resetOAuthProviders();
});


test("LlmOauthCredentialRefreshService rejects removed Google Gemini CLI OAuth credentials", async () => {
  await assert.rejects(
    () =>
      new LlmOauthCredentialRefreshService().refreshCredential({
        id: "credential-1",
        modelProvider: "google-gemini-cli",
        encryptedApiKey: JSON.stringify({
          token: "old-access-token",
          projectId: "project-1",
        }),
        refreshToken: "old-refresh-token",
        accessTokenExpiresAtMilliseconds: 1776321678238,
      }),
    /Unsupported OAuth model provider: google-gemini-cli/,
  );
});
