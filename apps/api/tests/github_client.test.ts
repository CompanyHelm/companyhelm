import { generateKeyPairSync } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "vitest";
import { GithubClient } from "../src/github/client.ts";

const TEST_PRIVATE_KEY_PEM = (() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return privateKey.export({ type: "pkcs1", format: "pem" }).toString();
})();

test("GithubClient validates installation ids", () => {
  assert.equal(GithubClient.validateInstallationId("110600868"), 110600868);
  assert.equal(GithubClient.validateInstallationId(110600868), 110600868);
  assert.equal(GithubClient.validateInstallationId(110600868n), 110600868);
  assert.throws(
    () => GithubClient.validateInstallationId("abc"),
    /installationId must be a positive integer\./,
  );
});

test("GithubClient parses GitHub installation callback search params", () => {
  assert.deepEqual(
    GithubClient.parseAuthorizationCallback(
      "installation_id=110600868&setup_action=install&code=abc123&state=company-1",
    ),
    {
      installationId: 110600868,
      setupAction: "install",
      authorizationCode: "abc123",
      state: "company-1",
    },
  );
});

test("GithubClient generates a GitHub App JWT with the expected claims", () => {
  const result = GithubClient.generateAppJwt({
    clientId: "Iv-test-local",
    privateKeyPem: TEST_PRIVATE_KEY_PEM,
  });
  const [, payloadRaw] = result.token.split(".");
  const payload = JSON.parse(Buffer.from(payloadRaw, "base64url").toString("utf8")) as {
    iss: string;
    iat: number;
    exp: number;
  };

  assert.equal(payload.iss, "Iv-test-local");
  assert.ok(payload.iat < payload.exp);
  assert.ok(payload.exp - payload.iat >= 540);
});
