import assert from "node:assert/strict";
import { test } from "node:test";
import { EnvFileParser } from "../src/pages/secrets/env_file_parser";

test("parses quoted multiline values and escaped newlines", () => {
  const parser = new EnvFileParser();
  const parsedEnvFile = parser.parseFileContents(`PRIVATE_KEY="-----BEGIN KEY-----
line-two
-----END KEY-----"
API_TOKEN="first\\nsecond"
`);

  assert.deepEqual(parsedEnvFile.rejectedEntries, []);
  assert.deepEqual(parsedEnvFile.secretDrafts, [
    {
      envVarName: "PRIVATE_KEY",
      name: "PRIVATE_KEY",
      sourceEnvVarName: "PRIVATE_KEY",
      value: "-----BEGIN KEY-----\nline-two\n-----END KEY-----",
    },
    {
      envVarName: "API_TOKEN",
      name: "API_TOKEN",
      sourceEnvVarName: "API_TOKEN",
      value: "first\nsecond",
    },
  ]);
});

test("normalizes imported keys and keeps the last duplicate", () => {
  const parser = new EnvFileParser();
  const parsedEnvFile = parser.parseFileContents(`github_token=first
GITHUB_TOKEN=second
`);

  assert.equal(parsedEnvFile.rejectedEntries.length, 0);
  assert.deepEqual(parsedEnvFile.secretDrafts, [
    {
      envVarName: "GITHUB_TOKEN",
      name: "GITHUB_TOKEN",
      sourceEnvVarName: "GITHUB_TOKEN",
      value: "second",
    },
  ]);
});

test("reports entries that cannot become valid secret env vars", () => {
  const parser = new EnvFileParser();
  const parsedEnvFile = parser.parseFileContents(`1INVALID=value
VALID_KEY=ok
`);

  assert.deepEqual(parsedEnvFile.secretDrafts, [
    {
      envVarName: "VALID_KEY",
      name: "VALID_KEY",
      sourceEnvVarName: "VALID_KEY",
      value: "ok",
    },
  ]);
  assert.deepEqual(parsedEnvFile.rejectedEntries, [
    {
      reason: "Cannot be converted into a valid secret environment variable name.",
      sourceEnvVarName: "1INVALID",
    },
  ]);
});
