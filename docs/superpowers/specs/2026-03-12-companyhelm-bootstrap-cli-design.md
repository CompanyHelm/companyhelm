# CompanyHelm Bootstrap CLI Design

Date: 2026-03-12
Repo: `CompanyHelm/companyhelm`
Package: `@companyhelm/cli`
Bin: `companyhelm`

## Goal

Build a new product-facing bootstrap CLI that gives users a working local CompanyHelm deployment with a single command:

```bash
companyhelm up
```

The deployment is not a source-based developer workflow. It is a packaged local install that brings up:

- `postgres`
- `api`
- `frontend`
- `runner`

The user authenticates through CompanyHelm auth using a generated local `admin` account.

## User Experience

The CLI should feel polished and intentional in the terminal:

- ASCII art banner on startup and major lifecycle commands
- colored terminal output for status, warnings, errors, URLs, and generated credentials
- clear phase-based progress output during `up`
- concise summaries at the end of `up`, `down`, `status`, and `reset`

Terminal presentation is part of the product requirement, not an afterthought.

## Command Surface

Initial commands:

- `companyhelm up`
- `companyhelm down`
- `companyhelm status`
- `companyhelm logs <service>`
- `companyhelm reset --force`

### `companyhelm up`

- fully non-interactive
- initializes runtime state on first run
- reconciles existing deployment state on later runs
- starts or repairs the local deployment
- prints the UI URL
- prints generated credentials on first run

### `companyhelm down`

- stops all managed services
- preserves runtime state

### `companyhelm status`

- reports service health for `postgres`, `api`, `frontend`, and `runner`
- shows exposed ports and UI URL
- shows whether credentials are initialized

### `companyhelm logs <service>`

Valid services:

- `postgres`
- `api`
- `frontend`
- `runner`

Behavior:

- prints logs only for the requested service
- reads Docker logs for containerized services
- reads host-managed logs for the runner

### `companyhelm reset --force`

- destructive command
- requires `--force`
- stops all services
- removes runtime state, generated credentials, runner secret, and local deployment data

No interactive confirmation prompt is required if `--force` is present.

## Runtime Model

Use a hybrid deployment model.

Containerized services:

- `postgres`
- `api`
- `frontend`

Host-managed service:

- `runner`

### Why this split

- API, frontend, and database should behave like packaged product services
- the runner should stay on the host to avoid unnecessary complexity around host auth material and host Docker access
- the CLI still owns the full lifecycle, so users still experience `companyhelm up` as one deployment command

## Networking

Create a private Docker network for the deployment.

Expose only these ports on the host:

- UI HTTP port
- runner gRPC port
- agent CLI gRPC port

Do not expose by default:

- API HTTP/GraphQL port
- Postgres port

### Connectivity model

- frontend reaches API over the private Docker network
- runner reaches API via the host-exposed runner gRPC port
- local agent CLI reaches API via the host-exposed agent CLI gRPC port

## Bootstrap and Auth

The system uses CompanyHelm auth by default.

On first `companyhelm up`, the CLI generates and persists:

- deployment metadata
- company id
- company name
- username `admin`
- random password
- runner secret
- selected host ports
- service/container identifiers

Bootstrap flow:

1. create runtime state directory
2. start `postgres`
3. start `api`
4. run DB bootstrap and migrations
5. seed a default local company
6. seed a local `admin` user
7. seed company membership
8. seed a runner row with the hashed runner secret
9. start the host runner using the stored plaintext secret
10. start `frontend` configured for `companyhelm` auth
11. print the UI URL and generated credentials

Credential behavior:

- username is always `admin`
- password is randomly generated on first run
- credentials are persisted in local runtime state
- later `up` runs reuse them
- `reset --force` deletes them and causes regeneration on the next `up`

## State Management

The CLI owns runtime state. Users should not need to author config files for the default path.

Persist:

- runtime schema version
- deployment metadata
- company id and name
- admin credentials
- runner secret
- chosen ports
- service/container names
- local log locations

Suggested internal state should support future migrations cleanly.

## Structure

Implementation should be split by responsibility and prefer classes over loose utility files.

Suggested modules:

- `src/commands`
- `src/core/runtime`
- `src/core/bootstrap`
- `src/core/docker`
- `src/core/runner`
- `src/core/status`
- `src/core/logs`
- `src/core/ui`
- `src/templates`

Suggested classes:

- `RuntimeStateStore`
- `DeploymentBootstrapper`
- `DockerStackManager`
- `RunnerSupervisor`
- `StatusService`
- `LogsService`
- `TerminalRenderer`

## Operational Semantics

### `up`

- idempotent
- reuses existing runtime state
- repairs drift where practical
- fails fast on port conflicts

### `down`

- stops runner first
- stops containers second
- preserves persisted state

### `status`

- reports each service independently
- includes the UI URL and exposed ports
- indicates whether credentials are already initialized

### `logs <service>`

- rejects unknown services with a clear error
- scopes output to exactly one service

### `reset --force`

- tears down the deployment
- removes persistent local state and deployment data
- is the only supported path for rotating bootstrap-generated credentials and runner secrets

## Error Handling

Requirements:

- clear error if Docker is unavailable
- clear error if required ports are occupied
- clear error if runner cannot connect after bootstrap
- best-effort cleanup for partial startup failures
- preserve readable logs and consistent runtime state after failure

## Packaging Assumptions

This repo should not depend on local source checkouts of `frontend` or `companyhelm-api`.

The CLI should orchestrate packaged runtime artifacts for:

- API
- frontend

It is responsible for deployment, bootstrap, lifecycle management, and user-facing terminal UX.

## Verification

Required verification scope:

- unit tests for command parsing, terminal rendering, runtime state generation, bootstrap data generation, status logic, and reset guard behavior
- integration tests for `up`, `down`, `status`, `logs <service>`, and `reset --force`
- smoke test for first-run startup proving:
  - UI is reachable
  - login works with generated `admin` credentials
  - runner reaches connected state

Also review `companyhelm-common` local deployment coverage to determine whether shared end-to-end expectations should be mirrored or updated.
