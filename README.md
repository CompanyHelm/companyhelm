# CompanyHelm

Bootstrap and manage a local CompanyHelm deployment.

## Quick start

```bash
npx @companyhelm/cli up
```

For more commands:
```bash
npx @companyhelm/cli --help
```

## Dependencies

Docker and docker compose

### macOS


## Authentication

On first `npx @companyhelm/cli up`, the CLI generates a local `admin` account and a random password. The password is printed at startup and persisted in the local runtime state until `npx @companyhelm/cli reset` is run.
