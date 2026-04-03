# CompanyHelm Daytona image

This image extends `daytonaio/sandbox:0.6.0` with the minimum tools CompanyHelm agents repeatedly need in remote sandboxes.

## Why it exists

The upstream Daytona sandbox image was missing a working CA bundle path for our GitHub workflows in this environment, which caused failures like:

- `x509: certificate signed by unknown authority`

This image bakes in the CA certificate update and adds common tooling so agents do not need to bootstrap every sandbox by hand.

## Included additions

- `ca-certificates`
- `git`
- `curl`
- `openssl`
- `gh`
- `jq`
- `python3`
- `python3-pip`
- `openssh-client`
- `procps`
- `less`
- `unzip`
- `xz-utils`
- `zip`

## User behavior

This Dockerfile does not set a custom `USER`. It keeps the default user from `daytonaio/sandbox:0.6.0` and uses `sudo` during build only when elevated package installation is needed.

## Build

From the repository root:

```bash
docker build -t companyhelm/daytona:latest docker/daytona
```

## Intended image name

```text
companyhelm/daytona:latest
```

## Suggested follow-up

After this image is built and pushed somewhere Daytona can pull from, update the Daytona compute provider provisioning flow to use `companyhelm/daytona:latest` instead of the current default image.
