# CompanyHelm CLI

Bootstrap and manage a local CompanyHelm deployment.

## Commands

Start or reconcile the local deployment:

```bash
npx @companyhelm/cli up
```

Stop the local deployment:

```bash
npx @companyhelm/cli down
```

Show the current service status:

```bash
npx @companyhelm/cli status
```

Show logs for one managed service:

```bash
npx @companyhelm/cli logs <service>
```

Supported services:

- `postgres`
- `api`
- `frontend`
- `runner`

Destroy the local deployment and generated state:

```bash
npx @companyhelm/cli reset --force
```

## Authentication

On first `npx @companyhelm/cli up`, the CLI generates a local `admin` account and a random password. The password is printed at startup and persisted in the local runtime state until `npx @companyhelm/cli reset --force` is run.

## Image Overrides

By default the CLI pulls the published public images from Amazon ECR Public:

- `public.ecr.aws/x6n0f2k4/companyhelm-api:latest`
- `public.ecr.aws/x6n0f2k4/companyhelm-web:latest`
- `postgres:16-alpine`

The published API and frontend images are currently `linux/amd64`, so the generated
compose file pins those services to `linux/amd64` for Apple Silicon compatibility.
On `arm64` hosts with the sibling [`frontend`](../frontend) repo available, the CLI
starts the API from the public image and serves the frontend from the local repo to
avoid the current `companyhelm-web` container build crash under emulation.

The packaged stack can be overridden with environment variables:

- `COMPANYHELM_API_IMAGE`
- `COMPANYHELM_WEB_IMAGE`
- `COMPANYHELM_POSTGRES_IMAGE`
