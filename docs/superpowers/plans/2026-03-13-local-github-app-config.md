# Local GitHub App Config Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded local GitHub App defaults with machine-configured, generated env-backed local config across CLI, API, shared local deployment tooling, and web.

**Architecture:** Add a CLI-owned machine config store outside the disposable runtime root, then generate project-local `.companyhelm/api/.env` from that machine config during local bootstrap. Keep `companyhelm-api/config/local.yaml` env-backed, remove frontend fallback behavior, and align shared local-deployment helpers/tests with the same three required GitHub App env vars.

**Tech Stack:** TypeScript, Vitest, Node test runner, YAML, Clack prompts, Playwright helper scripts

---

## Chunk 1: `companyhelm` machine config and generated env flow

### Task 1: Add machine GitHub App config persistence

**Files:**
- Create: `src/core/config/GithubAppConfig.ts`
- Create: `src/core/config/GithubAppConfigStore.ts`
- Test: `tests/unit/github-app-config-store.test.ts`

- [ ] **Step 1: Write the failing store tests**

```ts
test("saves and loads machine github app config", () => {
  const store = new GithubAppConfigStore(configRoot);
  store.save({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });

  expect(store.load()).toEqual({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----\n",
  });
});

test("throws a clear error when machine config is missing", () => {
  const store = new GithubAppConfigStore(configRoot);
  expect(() => store.loadOrThrow()).toThrow(/companyhelm.*setup/i);
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `npm test -- tests/unit/github-app-config-store.test.ts`
Expected: FAIL because the new config classes do not exist yet.

- [ ] **Step 3: Implement the config model and store**

```ts
export class GithubAppConfigStore {
  public save(config: GithubAppConfig): void {
    // Validate before writing, then atomically replace github-app.yaml.
  }

  public loadOrThrow(): GithubAppConfig {
    // Throw with a setup hint if the machine config file is absent or invalid.
  }
}
```

- [ ] **Step 4: Run the store tests to verify they pass**

Run: `npm test -- tests/unit/github-app-config-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/config/GithubAppConfig.ts src/core/config/GithubAppConfigStore.ts tests/unit/github-app-config-store.test.ts
git commit -m "feat: add machine github app config store"
```

### Task 2: Add generated project `.companyhelm/api/.env` rendering

**Files:**
- Modify: `src/core/runtime/RuntimePaths.ts`
- Create: `src/core/config/ApiEnvFileWriter.ts`
- Test: `tests/unit/api-env-file-writer.test.ts`

- [ ] **Step 1: Write the failing env-file tests**

```ts
test("writes the generated api env file with all github app variables", () => {
  const writer = new ApiEnvFileWriter(projectRoot);
  const envPath = writer.write({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: "line-1\nline-2\n",
  });

  expect(envPath).toMatch(/\.companyhelm\/api\/\.env$/);
  expect(readFileSync(envPath, "utf8")).toContain("GITHUB_APP_URL=https://github.com/apps/example-local");
  expect(readFileSync(envPath, "utf8")).toContain("GITHUB_APP_CLIENT_ID=Iv123");
  expect(readFileSync(envPath, "utf8")).toContain("GITHUB_APP_PRIVATE_KEY_PEM=");
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `npm test -- tests/unit/api-env-file-writer.test.ts`
Expected: FAIL because the writer and path helpers do not exist yet.

- [ ] **Step 3: Implement the generated env writer and runtime path**

```ts
export class ApiEnvFileWriter {
  public write(config: GithubAppConfig): string {
    // mkdir -p .companyhelm/api and render deterministic env lines.
  }
}
```

- [ ] **Step 4: Run the env-file tests to verify they pass**

Run: `npm test -- tests/unit/api-env-file-writer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/runtime/RuntimePaths.ts src/core/config/ApiEnvFileWriter.ts tests/unit/api-env-file-writer.test.ts
git commit -m "feat: generate local api github env file"
```

## Chunk 2: `companyhelm` command flow and reset semantics

### Task 3: Add interactive machine setup command

**Files:**
- Create: `src/commands/setup-github-app.ts`
- Modify: `src/commands/register-commands.ts`
- Test: `tests/integration/setup-github-app-command.test.ts`
- Test: `tests/unit/register-commands.test.ts`

- [ ] **Step 1: Write the failing command tests**

```ts
test("registers the setup-github-app command", () => {
  expect(program.commands.map((command) => command.name())).toContain("setup-github-app");
});

test("setup-github-app saves the machine config from interactive prompts", async () => {
  promptState.text.mockResolvedValueOnce("https://github.com/apps/example-local");
  promptState.text.mockResolvedValueOnce("Iv123");
  promptState.text.mockResolvedValueOnce("-----BEGIN PRIVATE KEY-----\nkey\n-----END PRIVATE KEY-----");

  await program.parseAsync(["node", "companyhelm", "setup-github-app"]);

  expect(savedConfig).toEqual({
    appUrl: "https://github.com/apps/example-local",
    appClientId: "Iv123",
    appPrivateKeyPem: expect.stringContaining("BEGIN PRIVATE KEY"),
  });
});
```

- [ ] **Step 2: Run the command tests to verify they fail**

Run: `npm test -- tests/unit/register-commands.test.ts tests/integration/setup-github-app-command.test.ts`
Expected: FAIL because the command is not registered.

- [ ] **Step 3: Implement the setup command**

```ts
program
  .command("setup-github-app")
  .description("Save machine-wide GitHub App config for local deploys.")
  .action(async () => {
    // Require TTY, prompt for URL/client ID/PEM, validate, then save.
  });
```

- [ ] **Step 4: Run the command tests to verify they pass**

Run: `npm test -- tests/unit/register-commands.test.ts tests/integration/setup-github-app-command.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/setup-github-app.ts src/commands/register-commands.ts tests/integration/setup-github-app-command.test.ts tests/unit/register-commands.test.ts
git commit -m "feat: add github app setup command"
```

### Task 4: Wire `up` to machine config and generated env file

**Files:**
- Modify: `src/commands/dependencies.ts`
- Modify: `src/core/bootstrap/DeploymentBootstrapper.ts`
- Test: `tests/unit/dependencies.test.ts`

- [ ] **Step 1: Write the failing dependency tests**

```ts
test("up fails with a setup hint when machine github app config is missing", async () => {
  vi.spyOn(GithubAppConfigStore.prototype, "loadOrThrow").mockImplementation(() => {
    throw new Error("GitHub App config missing. Run `companyhelm setup-github-app`.");
  });

  await expect(createDefaultDependencies().up()).rejects.toThrow(/setup-github-app/);
});

test("up writes the generated api env file before starting the stack", async () => {
  const writeEnv = vi.spyOn(ApiEnvFileWriter.prototype, "write").mockReturnValue("/tmp/project/.companyhelm/api/.env");

  await createDefaultDependencies().up();

  expect(writeEnv).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Run the dependency tests to verify they fail**

Run: `npm test -- tests/unit/dependencies.test.ts`
Expected: FAIL because `up` still hardcodes GitHub App values in generated API YAML.

- [ ] **Step 3: Implement the new `up` flow**

```ts
const githubAppConfig = githubAppConfigStore.loadOrThrow();
apiEnvFileWriter.write(githubAppConfig);
bootstrapper.writeApiConfig(root, state, logLevel);
```

Implementation notes:
- stop embedding `app_client_id`, `app_private_key_pem`, and `app_link` in the generated API YAML
- keep JWT and other bootstrap-generated values in YAML/runtime state as they work today
- make sure the generated `.companyhelm/api/.env` path is project-local (`process.cwd()`-based), not runtime-root-based

- [ ] **Step 4: Run the dependency tests to verify they pass**

Run: `npm test -- tests/unit/dependencies.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/dependencies.ts src/core/bootstrap/DeploymentBootstrapper.ts tests/unit/dependencies.test.ts
git commit -m "feat: source local github app config from machine setup"
```

### Task 5: Update reset prompt and cleanup

**Files:**
- Modify: `src/commands/reset.ts`
- Modify: `src/commands/dependencies.ts`
- Test: `tests/integration/down-status-reset.test.ts`

- [ ] **Step 1: Write the failing reset tests**

```ts
test("confirmReset mentions the generated api env file", async () => {
  promptState.confirm.mockResolvedValueOnce(true);
  await confirmReset(input, output);
  expect(promptState.confirm).toHaveBeenCalledWith(
    expect.objectContaining({
      message: expect.stringContaining(".companyhelm/api/.env"),
    }),
  );
});

test("reset deletes the generated api env file", async () => {
  writeFileSync(path.join(projectRoot, ".companyhelm", "api", ".env"), "GITHUB_APP_URL=value\n");
  await dependencies.reset();
  expect(existsSync(path.join(projectRoot, ".companyhelm", "api", ".env"))).toBe(false);
});
```

- [ ] **Step 2: Run the reset tests to verify they fail**

Run: `npm test -- tests/integration/down-status-reset.test.ts tests/unit/dependencies.test.ts`
Expected: FAIL because reset does not mention or remove the generated file.

- [ ] **Step 3: Implement reset cleanup**

```ts
fs.rmSync(runtimePaths.generatedApiEnvPathForProject(process.cwd()), { force: true });
```

- [ ] **Step 4: Run the reset tests to verify they pass**

Run: `npm test -- tests/integration/down-status-reset.test.ts tests/unit/dependencies.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/commands/reset.ts src/commands/dependencies.ts tests/integration/down-status-reset.test.ts tests/unit/dependencies.test.ts
git commit -m "feat: remove generated api env on reset"
```

## Chunk 3: `companyhelm-api` env-backed local config enforcement

### Task 6: Align config tests with required GitHub env vars

**Files:**
- Modify: `tests/config.test.ts`
- Modify: `tests/graphql.github-installation.resolver.test.ts`
- Modify: `tests/server.subscription-context.test.ts`
- Modify: `tests/server.startup.test.ts`
- Modify: `tests/system/lib/service-harness.ts`

- [ ] **Step 1: Write the failing/updated expectations**

```ts
process.env.GITHUB_APP_CLIENT_ID = "Iv-local";
process.env.GITHUB_APP_URL = "https://github.com/apps/example-local";
process.env.GITHUB_APP_PRIVATE_KEY_PEM = "test-local-private-key";

expect(config.github.app_client_id).toBe("Iv-local");
expect(config.github.app_link).toBe("https://github.com/apps/example-local");
```

Also add explicit missing-env cases:

```ts
delete process.env.GITHUB_APP_URL;
expect(() => loadConfig()).toThrow(/GITHUB_APP_URL/);
```

- [ ] **Step 2: Run the targeted API tests to verify they fail**

Run: `npm test -- tests/config.test.ts tests/graphql.github-installation.resolver.test.ts tests/server.subscription-context.test.ts tests/server.startup.test.ts`
Expected: FAIL because tests still assume hardcoded local defaults.

- [ ] **Step 3: Update fixtures and assertions**

Implementation notes:
- keep `config/local.yaml` env-backed
- remove test assertions that expect `Iv23...` or `companyhelm-local`
- make local-mode tests always provide all three required env vars

- [ ] **Step 4: Run the targeted API tests to verify they pass**

Run: `npm test -- tests/config.test.ts tests/graphql.github-installation.resolver.test.ts tests/server.subscription-context.test.ts tests/server.startup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/config.test.ts tests/graphql.github-installation.resolver.test.ts tests/server.subscription-context.test.ts tests/server.startup.test.ts tests/system/lib/service-harness.ts
git commit -m "test: require explicit github app env in local api config"
```

## Chunk 4: `companyhelm-common` shared local deployment alignment

### Task 7: Pass all required GitHub env vars into local API startup

**Files:**
- Modify: `local-deployment/src/services/api/start.ts`
- Modify: `local-deployment/tests/api-start.test.ts`

- [ ] **Step 1: Write the failing local-deployment tests**

```ts
test("startApiService passes all github app env vars to the api process", () => {
  process.env.GITHUB_APP_CLIENT_ID = "Iv-local";
  process.env.GITHUB_APP_URL = "https://github.com/apps/example-local";
  process.env.GITHUB_APP_PRIVATE_KEY_PEM = "pem";

  startApiService(config);

  expect(startManagedProcess).toHaveBeenCalledWith(
    expect.objectContaining({
      env: expect.objectContaining({
        GITHUB_APP_CLIENT_ID: "Iv-local",
        GITHUB_APP_URL: "https://github.com/apps/example-local",
        GITHUB_APP_PRIVATE_KEY_PEM: "pem",
      }),
    }),
  );
});
```

- [ ] **Step 2: Run the local-deployment tests to verify they fail**

Run: `npm test -- tests/api-start.test.ts`
Expected: FAIL because only `GITHUB_APP_PRIVATE_KEY_PEM` is passed today.

- [ ] **Step 3: Update local API startup env wiring**

Implementation notes:
- require all three vars instead of inventing local defaults
- update generated `local.yaml` fixture content in tests to use env placeholders for all three values

- [ ] **Step 4: Run the local-deployment tests to verify they pass**

Run: `npm test -- tests/api-start.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add local-deployment/src/services/api/start.ts local-deployment/tests/api-start.test.ts
git commit -m "fix: align local deployment api github env"
```

### Task 8: Inspect and update e2e helpers/docs if they still assume old local GitHub App defaults

**Files:**
- Modify as needed: `README.md`
- Modify as needed: `scripts/e2e-debug-up.sh`
- Modify as needed: `scripts/e2e-chat-realtime-regression.sh`
- Modify as needed: `tests/**`

- [ ] **Step 1: Search for old local GitHub App assumptions**

Run: `rg -n "companyhelm-local|GITHUB_APP_URL|GITHUB_APP_CLIENT_ID|apps/companyhelm" README.md scripts tests`
Expected: identify any stale helper assumptions before changing behavior.

- [ ] **Step 2: Add or update the minimal failing test or doc assertion if needed**

If no stale assumptions exist beyond `local-deployment`, record that and skip code changes.

- [ ] **Step 3: Apply the minimal required updates**

Keep this chunk small. Only change helpers or docs that actually reference the old local GitHub App defaults.

- [ ] **Step 4: Run the relevant verification**

Run: `npm run test:system -- --list`
Expected: PASS and confirms the system-test package still resolves after the helper/doc changes.

- [ ] **Step 5: Commit**

```bash
git add README.md scripts tests
git commit -m "docs: update e2e helpers for local github app config"
```

## Chunk 5: `companyhelm-web` remove GitHub App URL fallback

### Task 9: Remove frontend fallback constants and align tests

**Files:**
- Modify: `src/utils/constants.ts`
- Modify: `src/utils/path.ts`
- Modify: `src/App.tsx`
- Modify: `tests/utils/path.test.ts`
- Modify: `tests/utils/constants.test.ts`
- Add or modify: `tests/components/settings-page.test.ts`

- [ ] **Step 1: Write the failing frontend tests**

```ts
test("buildGithubAppInstallUrl returns the configured URL without falling back to apps/companyhelm", () => {
  assert.equal(
    buildGithubAppInstallUrl({
      appLink: "",
      companyId: "company-1",
    }),
    "",
  );
});

test("loading github app config preserves an empty appLink when the api config is unavailable", async () => {
  // Assert state remains empty rather than substituting a hardcoded default.
});
```

- [ ] **Step 2: Run the targeted frontend tests to verify they fail**

Run: `npm test -- tests/utils/path.test.ts tests/utils/constants.test.ts tests/components/settings-page.test.ts`
Expected: FAIL because fallback constants and error-path substitutions still exist.

- [ ] **Step 3: Remove fallback behavior**

Implementation notes:
- delete `DEFAULT_GITHUB_APP_INSTALL_URL`
- make `buildGithubAppInstallUrl` return the provided link or an empty string
- update `App.tsx` state initialization and error handling so it does not substitute a default URL

- [ ] **Step 4: Run the targeted frontend tests to verify they pass**

Run: `npm test -- tests/utils/path.test.ts tests/utils/constants.test.ts tests/components/settings-page.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/utils/constants.ts src/utils/path.ts src/App.tsx tests/utils/path.test.ts tests/utils/constants.test.ts tests/components/settings-page.test.ts
git commit -m "fix: remove frontend github app url fallback"
```

## Chunk 6: Cross-repo verification and delivery

### Task 10: Run repo-level verification

**Files:**
- No code changes expected unless verification fails

- [ ] **Step 1: Run CLI tests**

Run: `npm test`
Working directory: `/workspace/companyhelm`
Expected: PASS

- [ ] **Step 2: Run API tests**

Run: `npm test`
Working directory: `/workspace/companyhelm-api`
Expected: PASS

- [ ] **Step 3: Run shared local-deployment tests**

Run: `npm test`
Working directory: `/workspace/companyhelm-common/local-deployment`
Expected: PASS

- [ ] **Step 4: Run frontend tests**

Run: `npm test`
Working directory: `/workspace/companyhelm-web`
Expected: PASS

- [ ] **Step 5: Run the relevant shared e2e/system helper verification**

Run: `npm run test:system -- --list`
Working directory: `/workspace/companyhelm-common/tests`
Expected: PASS

- [ ] **Step 6: If changes touched CLI + API + web + common behavior together, run the companyhelm-common e2e helper script appropriate for local stack validation**

Run: `bash scripts/e2e-debug-up.sh --smoke`
Working directory: `/workspace/companyhelm-common`
Expected: PASS local stack smoke for frontend, API, CLI runner, and database

- [ ] **Step 7: Fix any failures and rerun affected verification**

Only change files required to resolve observed failures.

- [ ] **Step 8: Prepare branches and PRs**

For each changed repo:

```bash
git fetch origin
git rebase origin/main
git push -u origin <branch-name>
```

Then create PRs with body files:

```bash
gh pr create --title "<title>" --body-file /tmp/<repo>-pr.md
```

- [ ] **Step 9: Wait for PR checks and address any failures**

Use:

```bash
gh pr checks <pr-number> --watch
```

If checks fail, fix the issue, push again, and re-check until green.
