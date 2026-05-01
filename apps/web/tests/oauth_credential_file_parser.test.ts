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
