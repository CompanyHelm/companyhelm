# CompanyHelm CLI

Bootstrap and manage a local CompanyHelm deployment.

## Install

```bash
npm install -g @companyhelm/cli
```

## Commands

Start or reconcile the local deployment:

```bash
companyhelm up
```

Stop the local deployment:

```bash
companyhelm down
```

Show the current service status:

```bash
companyhelm status
```

Show logs for one managed service:

```bash
companyhelm logs <service>
```

Supported services:

- `postgres`
- `api`
- `frontend`
- `runner`

Destroy the local deployment and generated state:

```bash
companyhelm reset --force
```

## Authentication

On first `companyhelm up`, the CLI generates a local `admin` account and a random password. The password is printed at startup and persisted in the local runtime state until `companyhelm reset --force` is run.

## Image Overrides

The packaged stack can be overridden with environment variables:

- `COMPANYHELM_API_IMAGE`
- `COMPANYHELM_WEB_IMAGE`
- `COMPANYHELM_POSTGRES_IMAGE`
