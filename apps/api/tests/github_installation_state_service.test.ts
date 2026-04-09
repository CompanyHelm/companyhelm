import assert from "node:assert/strict";
import { test } from "vitest";
import { GithubInstallationStateService } from "../src/github/installation_state_service.ts";

test("GithubInstallationStateService round-trips state with the configured github key id", () => {
  const service = new GithubInstallationStateService({
    github: {
      key_id: "github-state-key",
    },
    security: {
      encryption: {
        key: "companyhelm-encryption-key",
        key_id: "companyhelm-security-key",
      },
    },
  } as never);

  const state = service.createState({
    companyId: "company-123",
    organizationSlug: "acme",
    userId: "user-123",
  });
  const decodedState = service.readState(state);

  assert.equal(decodedState.companyId, "company-123");
  assert.equal(decodedState.organizationSlug, "acme");
  assert.equal(decodedState.userId, "user-123");
  assert.equal(decodedState.keyId, "github-state-key");
  assert.match(decodedState.issuedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("GithubInstallationStateService rejects states encrypted with a different github key id", () => {
  const issuingService = new GithubInstallationStateService({
    github: {
      key_id: "github-state-key-a",
    },
    security: {
      encryption: {
        key: "companyhelm-encryption-key",
        key_id: "companyhelm-security-key",
      },
    },
  } as never);
  const readingService = new GithubInstallationStateService({
    github: {
      key_id: "github-state-key-b",
    },
    security: {
      encryption: {
        key: "companyhelm-encryption-key",
        key_id: "companyhelm-security-key",
      },
    },
  } as never);
  const state = issuingService.createState({
    companyId: "company-123",
    organizationSlug: "acme",
    userId: "user-123",
  });

  assert.throws(
    () => readingService.readState(state),
    /Unknown GitHub installation state key id/,
  );
});
