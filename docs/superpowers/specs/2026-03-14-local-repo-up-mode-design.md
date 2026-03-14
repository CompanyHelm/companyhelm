# Local Repo Up Mode Design

## Goal

Allow `companyhelm up` to start `companyhelm-api` and `companyhelm-web` from sibling local repositories instead of Docker images, while keeping Postgres and the runner on the existing runtime path.

## Scope

- add `--api-repo-path [path]` to `companyhelm up`
- add `--web-repo-path [path]` to `companyhelm up`
- if an option is present without a value, resolve to sibling defaults relative to the current `companyhelm` repo:
  - `../companyhelm-api`
  - `../companyhelm-web`
- if only one option is present, only that service switches to local-repo mode
- keep runtime state under `~/.companyhelm` by default
- store runtime state in YAML

## Non-Goals

- persistent machine config for repo paths
- changing Docker image selection behavior
- moving Postgres or runner out of their current startup path
- changing `companyhelm-api` or `companyhelm-web`

## Current Constraints

- `companyhelm up` currently routes service startup through `DockerStackManager`
- `down`, `status`, and `logs` assume `api` and `frontend` are Docker-managed
- runtime state is currently persisted as JSON

## Proposed Design

### CLI Surface

`companyhelm up` accepts two new optional-value options:

- `--api-repo-path [path]`
- `--web-repo-path [path]`

Presence of either option selects local-repo mode for that service. Omitted options keep the service on Docker.

### Source Resolution

Add a dedicated resolver that normalizes `up` options into per-service source definitions:

- `docker`
- `local`, with a resolved repo path

If a local-repo option is present without a value, resolve the repo path relative to the current working directory:

- API: `../companyhelm-api`
- frontend: `../companyhelm-web`

The resolver fails fast if a selected local repo directory does not exist.

### Runtime State

Replace `state.json` with `state.yaml` under the runtime root and add service runtime metadata:

- source mode for `api` and `frontend`
- resolved repo path for local services
- pid file path and log file path for local services

This allows `down`, `status`, and `logs` to act on the same startup decision that `up` made.

### Local Process Management

Keep the new behavior modular:

- `LocalRepoSourceResolver`
- `LocalServiceProcessManager`
- `ApiLocalService`
- `WebLocalService`

`ApiLocalService` should:

- ensure dependencies are installed
- reuse generated API config and project `.companyhelm/api/.env`
- start the API process from `companyhelm-api`
- wait for the GraphQL endpoint to respond

`WebLocalService` should:

- ensure dependencies are installed
- run frontend config generation against the CLI-generated config
- start the Vite dev server from `companyhelm-web`
- wait for the UI URL to respond

### Shared Bootstrap

`up` still:

- initializes runtime state
- writes seed SQL
- writes generated API and frontend config files
- starts Postgres in Docker
- applies seed SQL
- configures and starts the runner

Only service-specific startup for `api` and `frontend` changes.

### Mixed-Mode Lifecycle

- `down` stops any local service process recorded in runtime state, then tears down Docker services
- `status` reports local services as running when their pid is alive, otherwise falls back to Docker service state
- `logs` reads local log files for local services and keeps Docker logs for Docker services

## Error Handling

- fail before startup if a selected repo path does not exist
- if a local service exits during startup, stop newly started sibling local services, stop the runner, and tear down Docker resources
- stale pid metadata should be cleared during `down` and `status` instead of failing the command

## Testing

- CLI parsing tests for optional-value repo-path options
- source-resolution tests for explicit and sibling-default paths
- runtime-state tests for YAML persistence and new service metadata
- dependency tests for mixed Docker/local startup, logs, status, and teardown behavior
- integration tests for `up` with API local mode, frontend local mode, and both together
- validate that `companyhelm-common` local-deployment and e2e helpers do not require changes
