# CompanyHelm - Distributed Coding Agent Orchestrator

<a href="https://discord.gg/YueY3dQM9Q"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a>

CompanyHelm is an open-source control plane for running AI coding agent in dedicated environments. Each agent session is completely isolated and allows to run coding tasks in a distributed fashion.
Agents are model agnostic and multiple model providers are supported (OpenAi, Anthropic, OpenRouter). Agents can be customized with MCP, Skills and custom instructions.

A few things it can do today:

- **Isolation**: every agent session runs in a fresh E2B VM
- **E2E testing**: agents can spin up your app and run end-to-end tests in isolation
- **Feature videos**: agents can generate demo videos for new features and attach them to PRs
- **Live demos**: you can open a remote desktop and interact with the feature before merging
- **Multi-repo workflows**: agents can operate across multiple repos in the same session
- **Collaboration**: you can invite other users into the same company workspace

[CompanyHelm Cloud](https://www.companyhelm.com/) · [Discord](https://discord.gg/YueY3dQM9Q)

<img width="1695" height="874" alt="companyHelm-screenshot" src="https://github.com/user-attachments/assets/9f3c6f3f-5e1f-4065-989d-44cfad587e5f" />


Monorepo with:

- `apps/api`: API
- `apps/web`: Web app

## Toolchain

Use the exact local toolchain versions below to avoid lockfile drift and inconsistent installs:

- Node.js `20.20.0`
- npm `11.6.2`

If you use `nvm`:

```bash
nvm install
nvm use
npm install -g npm@11.6.2
```

## Requirements

- Node.js `20.20.0`
- npm `11.6.2`
- Docker with Docker Compose

## Local quick start

1. Install the correct Node.js version and npm version.

```bash
nvm install
nvm use
npm install -g npm@11.6.2
```

2. Copy the web app example environment file.

```bash
cp apps/web/.env.example apps/web/.env.local
```

For local API development, export the required Clerk, GitHub, Exa, and E2B variables in your shell
before starting `npm run dev:api`. `apps/api/config/local.yaml` reads those values directly from the
environment.

3. Install dependencies.

```bash
npm install
```

4. Start Postgres, Redis, and pgAdmin.

```bash
npm run db:up
```

5. Start the API.

```bash
npm run dev:api
```

6. Start the web app in a second terminal.

```bash
npm run dev:web
```

## Local URLs

- Web app: `http://localhost:5173`
- Web health: `http://localhost:5173/health`
- API GraphQL: `http://localhost:4000/graphql`
- API health: `http://localhost:4000/health`
- pgAdmin: `http://localhost:5050`
- Redis: `localhost:6379`

Local development defaults to HTTP for both the web app and API. Keep `VITE_GRAPHQL_URL` pointed at
`http://localhost:4000/graphql` unless you also choose to proxy the API over HTTPS locally.

## Environment variables

`apps/web/.env.example` contains the Vite variables used by local web development.

A few notes:

- Copy it to `apps/web/.env.local` so Vite picks it up automatically.
- `apps/api/config/local.yaml` reads Clerk, GitHub, and CompanyHelm E2B values from environment variables.
- The placeholder values in `apps/web/.env.example` are enough to boot the web shell locally.
- Replace the placeholders with real secrets before using auth, GitHub install flows, or CompanyHelm-backed compute.

### API runtime config

The API image defaults to `apps/api/config/container.yaml`. That config expects these runtime environment variables:

- `COMPANYHELM_API_PUBLIC_URL`
- `COMPANYHELM_WEB_PUBLIC_URL`
- `DATABASE_NAME`
- `DATABASE_HOST`
- `DATABASE_APP_RUNTIME_USERNAME`
- `DATABASE_APP_RUNTIME_PASSWORD`
- `DATABASE_ADMIN_USERNAME`
- `DATABASE_ADMIN_PASSWORD`
- `REDIS_HOST`
- `EXA_API_KEY`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_PRIVATE_KEY_PEM`
- `GITHUB_APP_URL`
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_JWKS_URL`
- `COMPANYHELM_ENCRYPTION_KEY`
- `COMPANYHELM_ENCRYPTION_KEY_ID`

If you want to source the full API config from S3 instead, set `COMPANYHELM_CONFIG_S3_URI`.
The entrypoint uses the `--config-path` argument as the destination path for that download.
If you do not pass `--config-path`, the image defaults to `apps/api/config/container.yaml`.

### Web runtime config

Local Vite development uses `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_GRAPHQL_URL` from your
local environment. To show Clerk's terms/privacy consent during sign-up, also set
`VITE_CLERK_TERMS_OF_SERVICE_URL` and `VITE_CLERK_PRIVACY_POLICY_URL`. The web Docker image
uses the same `VITE_*` variables to generate `/runtime-config.js` at startup, so local `.env`
files and deployed runtime YAML share the same schema. Amplitude runtime config follows the
same pattern with `VITE_AMPLITUDE_ENABLED` and `VITE_AMPLITUDE_ID`.

## Common commands

### Development

Start both apps with Turbo:

```bash
npm run dev
```

### Databases

Start local services:

```bash
npm run db:up
```

Stop local services:

```bash
npm run db:down
```

Reset local services and volumes:

```bash
npm run db:reset
```

Run database migrations:

```bash
npm run db:migrate
```

Generate Drizzle files:

```bash
npm run db:generate
```

### Before committing

Run everything you need before committing:

```bash
npm run test:all
```

That command runs the API and web checks, and it also runs the API test suite.
