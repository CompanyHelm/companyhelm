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

The packaged stack can be overridden with environment variables:

- `COMPANYHELM_API_IMAGE`
- `COMPANYHELM_WEB_IMAGE`
- `COMPANYHELM_POSTGRES_IMAGE`
