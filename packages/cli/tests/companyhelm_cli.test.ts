import assert from "node:assert/strict";
import { test } from "node:test";
import {
  registerOAuthProvider,
  resetOAuthProviders,
  type OAuthCredentials,
  type OAuthLoginCallbacks,
} from "@mariozechner/pi-ai/oauth";
import { CompanyHelmCli } from "../src/companyhelm_cli.js";
import type { CliIo } from "../src/cli_io_interface.js";

class CapturingCliIo implements CliIo {
  readonly errors: string[] = [];
  readonly lines: string[] = [];
  private readonly inputs: string[];

  constructor(inputs: string[] = []) {
    this.inputs = inputs;
  }

  async readLine(): Promise<string> {
    return this.inputs.shift() ?? "";
  }

  writeLine(message: string): void {
    this.lines.push(message);
  }

  writeError(message: string): void {
    this.errors.push(message);
  }
}

class ProviderLoginFetchStub {
  readonly requests: Array<{ body: unknown; method: string; url: string }> = [];
  private readonly originalFetch = globalThis.fetch;

  install(): void {
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      this.requests.push({
        body: init?.body ? JSON.parse(String(init.body)) as unknown : null,
        method: init?.method ?? "GET",
        url,
      });

      if (url === "https://api.companyhelm.com/model-provider-credential-login/resolve?code=chpl_test") {
        return Response.json({
          companyName: "CompanyHelm Local",
          credentialName: "Codex Subscription",
          expiresAt: "2026-06-04T12:00:00.000Z",
          modelProvider: "openai-codex",
          piOauthProviderId: "openai-codex",
          providerName: "OpenAI Codex",
          requestId: "request-1",
          requestedBy: "Andrea",
        });
      }

      if (url === "https://api.companyhelm.com/model-provider-credential-login/complete") {
        return Response.json({
          credentialId: "credential-1",
          status: "completed",
        });
      }

      return Response.json({ error: `Unexpected request: ${url}` }, { status: 500 });
    }) as typeof fetch;
  }

  restore(): void {
    globalThis.fetch = this.originalFetch;
  }
}

class CustomApiFetchStub extends ProviderLoginFetchStub {
  install(): void {
    const originalFetch = globalThis.fetch;
    super.install();
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url === "http://localhost:4000/model-provider-credential-login/resolve?code=chpl_custom") {
        return Response.json({
          companyName: "CompanyHelm Local",
          credentialName: "Codex Local",
          expiresAt: "2026-06-04T12:00:00.000Z",
          modelProvider: "openai-codex",
          piOauthProviderId: "openai-codex",
          providerName: "OpenAI Codex",
          requestId: "request-2",
          requestedBy: "Andrea",
        });
      }

      if (url === "http://localhost:4000/model-provider-credential-login/complete") {
        return Response.json({
          credentialId: "credential-2",
          status: "completed",
        });
      }

      return originalFetch(input, init);
    }) as typeof fetch;
  }
}

class TestOAuthProviderRegistry {
  readonly callbackSnapshots: OAuthLoginCallbacks[] = [];

  install(credentials: OAuthCredentials = {
    access: "access-token",
    expires: 1775358352922,
    refresh: "refresh-token",
  }): void {
    const callbackSnapshots = this.callbackSnapshots;
    registerOAuthProvider({
      id: "openai-codex",
      name: "OpenAI Codex",
      async login(callbacks) {
        callbacks.onAuth({
          instructions: "A browser window should open. Complete login to finish.",
          url: "https://auth.example.test/oauth",
        });
        callbacks.onProgress?.("Exchanging authorization code for tokens...");
        callbackSnapshots.push(callbacks);
        return credentials;
      },
      async refreshToken() {
        return credentials;
      },
      getApiKey() {
        return credentials.access;
      },
    });
  }

  restore(): void {
    resetOAuthProviders();
  }
}

test("status command describes the npm package layout", async () => {
  const io = new CapturingCliIo();
  await new CompanyHelmCli(io).run(["node", "companyhelm", "status"]);

  assert.equal(io.errors.length, 0);
  assert.deepEqual(io.lines, [
    "CompanyHelm CLI is installed.",
    "Main CLI package: @companyhelm/cli",
    "Runner package: @companyhelm/runner",
    "Server workspace package: @companyhelm/server",
  ]);
});

test("runner command points users at the standalone runner package", async () => {
  const io = new CapturingCliIo();
  await new CompanyHelmCli(io).run(["node", "companyhelm", "runner", "start"]);

  assert.equal(io.errors.length, 0);
  assert.match(io.lines.join("\n"), /companyhelm-runner start/);
});

test("provider login defaults to the production API URL and completes the request", async () => {
  const io = new CapturingCliIo();
  const fetchStub = new ProviderLoginFetchStub();
  const oauthProviders = new TestOAuthProviderRegistry();
  fetchStub.install();
  oauthProviders.install();

  try {
    await new CompanyHelmCli(io).run(["node", "companyhelm", "provider", "login", "--code", "chpl_test"]);
  } finally {
    fetchStub.restore();
    oauthProviders.restore();
  }

  const output = io.lines.join("\n");
  assert.equal(io.errors.length, 0);
  assert.match(output, /ℹ.*Adding OpenAI Codex credential to CompanyHelm/);
  assert.match(output, /•.*Credential: Codex Subscription/);
  assert.match(output, /✅.*Credential "Codex Subscription" added to CompanyHelm Local/);
  assert.doesNotMatch(output, /credential-1/);
  assert.doesNotMatch(output, /Paste the authorization code or redirect URL/);
  assert.equal(oauthProviders.callbackSnapshots[0]?.onManualCodeInput, undefined);
  assert.equal(fetchStub.requests[0]?.url, "https://api.companyhelm.com/model-provider-credential-login/resolve?code=chpl_test");
  assert.deepEqual(fetchStub.requests[1]?.body, {
    code: "chpl_test",
    credentials: {
      access: "access-token",
      expires: 1775358352922,
      refresh: "refresh-token",
    },
  });
});

test("provider login accepts a custom API URL", async () => {
  const io = new CapturingCliIo();
  const fetchStub = new CustomApiFetchStub();
  const oauthProviders = new TestOAuthProviderRegistry();
  fetchStub.install();
  oauthProviders.install();

  try {
    await new CompanyHelmCli(io).run([
      "node",
      "companyhelm",
      "provider",
      "login",
      "--code",
      "chpl_custom",
      "--api-url",
      "http://localhost:4000",
    ]);
  } finally {
    fetchStub.restore();
    oauthProviders.restore();
  }

  const output = io.lines.join("\n");
  assert.equal(io.errors.length, 0);
  assert.match(output, /✅.*Credential "Codex Local" added to CompanyHelm Local/);
  assert.doesNotMatch(output, /credential-2/);
});
