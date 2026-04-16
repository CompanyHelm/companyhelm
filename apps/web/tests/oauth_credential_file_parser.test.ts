import assert from "node:assert/strict";
import { test } from "node:test";
import { OauthCredentialFileParser } from "../src/pages/model-provider-credentials/oauth_credential_file_parser";

test("parses OpenAI Codex OAuth auth files as raw access tokens", () => {
  const parser = new OauthCredentialFileParser();

  assert.deepEqual(
    parser.parse({
      providerId: "openai-codex",
      authFileContents: JSON.stringify({
        "openai-codex": {
          type: "oauth",
          access: "access-token",
          refresh: "refresh-token",
          expires: 1775358352922,
        },
      }),
    }),
    {
      accessToken: "access-token",
      accessTokenExpiresAtMilliseconds: "1775358352922",
      refreshToken: "refresh-token",
    },
  );
});

test("parses Google Gemini CLI OAuth auth files into PI runtime credentials", () => {
  const parser = new OauthCredentialFileParser();

  const parsedCredential = parser.parse({
    providerId: "google-gemini-cli",
    authFileContents: JSON.stringify({
      "google-gemini-cli": {
        type: "oauth",
        access: "google-access-token",
        refresh: "google-refresh-token",
        expires: 1776321678238,
        projectId: "ferrous-env-vn1t7",
      },
    }),
  });

  assert.deepEqual(parsedCredential, {
    accessToken: JSON.stringify({
      token: "google-access-token",
      projectId: "ferrous-env-vn1t7",
    }),
    accessTokenExpiresAtMilliseconds: "1776321678238",
    refreshToken: "google-refresh-token",
  });
});

test("rejects Google Gemini CLI auth files without projectId", () => {
  const parser = new OauthCredentialFileParser();

  assert.throws(
    () =>
      parser.parse({
        providerId: "google-gemini-cli",
        authFileContents: JSON.stringify({
          "google-gemini-cli": {
            type: "oauth",
            access: "google-access-token",
            refresh: "google-refresh-token",
            expires: 1776321678238,
          },
        }),
      }),
    /missing projectId/,
  );
});
