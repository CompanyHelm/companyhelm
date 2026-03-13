# Local GitHub App Config Design

Date: 2026-03-13
Coordination repo: `CompanyHelm/companyhelm`
Affected repos:

- `CompanyHelm/companyhelm`
- `CompanyHelm/companyhelm-api`
- `CompanyHelm/companyhelm-common`
- `CompanyHelm/companyhelm-web`

## Goal

Move local GitHub App configuration from hardcoded/project-static values to a machine-configured, env-backed flow with these properties:

- the user enters GitHub App details once per machine
- local deploy preparation generates project-local API env state when needed
- the API reads `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_PRIVATE_KEY_PEM`, and `GITHUB_APP_URL` from env-backed config
- local startup fails fast when any required GitHub App value is missing
- the web app does not hardcode or fall back to `apps/companyhelm` anywhere
- `companyhelm reset` explicitly removes the generated API `.env` file and says so in the prompt

## Current Problems

Today the local flow is split across incompatible assumptions:

- `companyhelm` hardcodes both the local GitHub App client id and app URL in generated API YAML
- `companyhelm-api/config/local.yaml` already expects env expansion for all three GitHub App values
- `companyhelm-common` local deployment helpers still inject only the private key and assume static values for the rest
- `companyhelm-web` falls back to a hardcoded GitHub App install URL when API config is absent or loading fails
- `companyhelm reset` currently treats the CLI runtime root as disposable state, so machine-level config cannot safely live there

That combination makes local GitHub App behavior inconsistent and hides configuration mistakes instead of failing at bootstrap time.

## Configuration Ownership

Separate non-disposable machine config from disposable runtime artifacts.

### Machine-wide config

Store the canonical local GitHub App config once on the machine at:

```text
~/.config/companyhelm/github-app.yaml
```

Contents:

- `app_url`
- `app_client_id`
- `app_private_key_pem`

This file is owned by the CLI setup/bootstrap experience. It is not deleted by `companyhelm reset`.

### Project-local generated config

When preparing a local deployment, generate:

```text
.companyhelm/api/.env
```

in the target project workspace.

Contents:

- `GITHUB_APP_URL=...`
- `GITHUB_APP_CLIENT_ID=...`
- `GITHUB_APP_PRIVATE_KEY_PEM=...`

This file is derived state generated from the machine-wide config. It is deleted by `companyhelm reset`.

### Why this split

- machine-level setup is done once
- project-local state remains explicit and inspectable
- reset can stay destructive for generated local runtime files without wiping the user’s machine-wide GitHub App setup
- API startup stays aligned with its existing env-expansion model

## CLI Design

### New setup/bootstrap flow

Add an interactive CLI flow to capture machine-wide GitHub App config.

Requirements:

- runs only in a TTY
- instructs the user to create a GitHub App first
- prompts for:
  - GitHub App URL
  - GitHub App client id
  - pasted PEM private key
- validates that:
  - URL parses as a URL
  - client id is non-empty
  - PEM is non-empty and preserves multiline content exactly
- writes `~/.config/companyhelm/github-app.yaml`
- overwrites the machine file only after validation succeeds

This flow should be explicit and user-facing rather than hidden inside `up`.

### Local deploy preparation

Before a local deploy starts, `companyhelm` should:

1. load the machine-wide GitHub App config
2. fail fast with a concrete instruction if the machine file is missing or invalid
3. create `.companyhelm/api` in the project workspace if needed
4. generate `.companyhelm/api/.env`
5. continue startup using generated local files only

The generation step should be idempotent and should rewrite the file on each `up` so changes to machine config take effect without manual cleanup.

### Reset semantics

`companyhelm reset` should:

- continue removing disposable local deployment state
- remove generated `.companyhelm/api/.env`
- mention that file in the confirmation prompt

The prompt should make the destructive scope concrete, for example by naming:

- CompanyHelm containers
- Postgres data
- local runtime state
- generated `.companyhelm/api/.env`

Machine-wide GitHub App config must not be deleted by reset.

## API Design

`companyhelm-api` should continue using env-backed `config/local.yaml` for GitHub App config:

- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_PRIVATE_KEY_PEM`
- `GITHUB_APP_URL`

Requirements:

- `config/local.yaml` remains the source of truth for local mode
- config loading fails immediately if any required env placeholder is missing
- schema validation continues requiring all three GitHub values
- no hardcoded local default GitHub App values remain in API code or test fixtures except where tests intentionally provide explicit values

Fail-fast behavior should happen during config/bootstrap, before the server starts serving traffic.

## Shared Local Deployment Design

`companyhelm-common` local deployment helpers must stop assuming only the private key is dynamic.

Requirements:

- pass all three GitHub App env vars into local API startup
- remove hardcoded local client id and local app URL assumptions from generated local deployment config fixtures
- keep generated JWT auth values for CompanyHelm auth as they work today

This keeps shared local deployment tooling aligned with the API’s real config contract.

## Frontend Design

The web app must not hardcode or fall back to any GitHub App install URL.

Requirements:

- remove the `apps/companyhelm` fallback constant and any derived fallback behavior
- when GitHub App config is loaded successfully, use the API-provided URL
- when API bootstrap/config is broken, do not mask it with a frontend default

This applies to local and non-local flows alike. GitHub App install URL is configuration, not a frontend constant.

## Data Flow

End-to-end local flow:

1. user runs CLI setup flow once and saves machine config
2. user runs local deploy
3. CLI reads machine config and generates project `.companyhelm/api/.env`
4. API starts with `config/local.yaml`
5. config loader expands `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_PRIVATE_KEY_PEM`, and `GITHUB_APP_URL`
6. API GraphQL exposes GitHub App config
7. web app uses only API-provided config to build install URLs

Any missing or invalid GitHub App config should fail at step 3 or 5, not later in the UI.

## Testing Strategy

### `companyhelm`

Add or update tests for:

- machine config load/save behavior
- setup prompt capture and PEM serialization
- generated `.companyhelm/api/.env` contents
- `up` failing with a clear message when machine config is absent or invalid
- `reset` prompt text mentioning generated `.companyhelm/api/.env`
- `reset` deleting generated `.companyhelm/api/.env`

### `companyhelm-api`

Add or update tests for:

- local config expansion of all three GitHub env vars
- bootstrap/config failure when any one of the required variables is missing
- runtime config values returned through GraphQL/resolvers without relying on hardcoded defaults

### `companyhelm-common`

Add or update tests for:

- local API startup passing all three GitHub env vars
- generated local deployment config fixtures no longer embedding static `app_client_id` or `app_link`

Also inspect e2e helpers in this repo for any setup/docs that still assume the old local GitHub App behavior.

### `companyhelm-web`

Add or update tests for:

- no default GitHub App install URL fallback
- install URL generation using only API-provided config
- load-error behavior preserving the absence of config rather than substituting a hardcoded URL

## Non-goals

- changing managed/prod GitHub App configuration architecture
- adding multiple stored GitHub App profiles per machine
- preserving backward compatibility with the hardcoded local app values
- hiding missing config behind web or API fallbacks

## Implementation Notes

- Prefer focused classes/files in the CLI for machine config persistence and generated env file rendering.
- Generated env output should be deterministic and newline-safe for multiline PEM values.
- Avoid placing machine config under the existing CLI runtime root because that root is intentionally disposable during reset.
