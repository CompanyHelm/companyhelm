import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";

import { DeploymentBootstrapper } from "../../src/core/bootstrap/DeploymentBootstrapper.js";
import type { RuntimeState } from "../../src/core/runtime/RuntimeState.js";

function createRuntimeState(): RuntimeState {
  return {
    version: 1,
    company: {
      id: "company-id",
      name: "Local CompanyHelm"
    },
    auth: {
      username: "admin@local",
      password: "secret",
      jwtPrivateKeyPem: "private",
      jwtPublicKeyPem: "public"
    },
    runner: {
      name: "local-runner",
      secret: "runner-secret"
    },
    ports: {
      apiHttp: 4000,
      ui: 4173,
      runnerGrpc: 50051,
      agentCliGrpc: 50052
    },
    services: {
      api: {
        source: "docker"
      },
      frontend: {
        source: "docker"
      }
    }
  };
}

test("writes disabled github config when github auth is skipped", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-bootstrap-"));
  const bootstrapper = new DeploymentBootstrapper();

  const outputPath = bootstrapper.writeApiConfig(root, createRuntimeState(), "debug", {
    githubAppConfig: null
  });

  const config = fs.readFileSync(outputPath, "utf8");
  expect(config).toContain("  workers:");
  expect(config).toContain("    agentHeartbeats:");
  expect(config).toContain("    taskWorker:");
  expect(config).toContain("agent:");
  expect(config).toContain('    host: "0.0.0.0"');
  expect(config).toContain("    port: 50052");
  expect(config).toContain('app_client_id: "companyhelm-local-github-disabled"');
  expect(config).toContain('app_private_key_pem: "companyhelm-local-github-disabled"');
  expect(config).toContain('app_link: "https://github.com/apps/companyhelm-local-disabled"');
  expect(config).not.toContain("${GITHUB_APP_CLIENT_ID}");
});

test("keeps env placeholders when github auth is configured", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companyhelm-bootstrap-"));
  const bootstrapper = new DeploymentBootstrapper();

  const outputPath = bootstrapper.writeApiConfig(root, createRuntimeState(), "debug", {
    githubAppConfig: {
      appUrl: "https://github.com/apps/example-local",
      appClientId: "Iv123",
      appPrivateKeyPem: "private-key"
    }
  });

  const config = fs.readFileSync(outputPath, "utf8");
  expect(config).toContain('${GITHUB_APP_CLIENT_ID}');
  expect(config).toContain('${GITHUB_APP_PRIVATE_KEY_PEM}');
  expect(config).toContain('${GITHUB_APP_URL}');
});
