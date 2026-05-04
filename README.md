# CompanyHelm - Distributed Coding Agent Orchestrator

<a href="https://discord.gg/YueY3dQM9Q"><img src="https://img.shields.io/discord/1456350064065904867?label=Discord&logo=discord&logoColor=white&color=5865F2&style=for-the-badge" alt="Discord"></a> [![SPONSORED BY E2B FOR STARTUPS](https://img.shields.io/badge/SPONSORED%20BY-E2B%20FOR%20STARTUPS-ff8800?style=for-the-badge)](https://e2b.dev/startups)


CompanyHelm is an open-source control plane for running AI coding agent in dedicated environments. Each agent session is completely isolated and allows to run coding tasks in a distributed fashion.
Agents are model agnostic and multiple company-provided model providers are supported (OpenAI, Anthropic, Google, OpenRouter, OpenAI-compatible APIs, and OpenAI Codex OAuth). Agents can be customized with MCP, Skills and custom instructions.

A few things it can do today:

- **Isolation**: every agent session runs in a fresh E2B VM
- **E2E testing**: agents can spin up your app and run end-to-end tests in isolation
- **Feature videos**: agents can generate demo videos for new features and attach them to PRs
- **Live demos**: you can open a remote desktop and interact with the feature before merging
- **Multi-repo workflows**: agents can operate across multiple repos in the same session
- **Collaboration**: you can invite other users into the same company workspace

[CompanyHelm Cloud (Free)](https://www.companyhelm.com/) · [Discord](https://discord.gg/YueY3dQM9Q)

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

Copy `apps/api/.env.example` to `apps/api/.env.local`, then fill in the required GitHub App, Exa,
E2B, local-auth, and encryption-related values before starting `npm run dev:api`.
`apps/api/config/local.yaml` reads those values directly from the environment.

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
- pgAdmin: `http://localhost:15050`
- Redis: `localhost:16379`

Local development defaults to HTTP for both the web app and API. Keep `VITE_GRAPHQL_URL` pointed at
`http://localhost:4000/graphql` unless you also choose to proxy the API over HTTPS locally.

## Environment variables

`apps/web/.env.example` contains the Vite variables used by local web development.

A few notes:

- Copy it to `apps/web/.env.local` so Vite picks it up automatically.
- `apps/api/config/local.yaml` uses local auth by default and reads GitHub App, Exa, and E2B values from environment variables.
- The placeholder values in `apps/web/.env.example` are enough to boot the web shell locally.
- Self-hosters must configure their own GitHub App before using GitHub install flows.
- Replace the placeholders with real secrets before using GitHub install flows, model provider credentials, or CompanyHelm-backed compute.

### Web runtime config

Local Vite development uses `VITE_AUTH_PROVIDER=local` and `VITE_GRAPHQL_URL` from your local
environment by default. Set `VITE_TERMS_OF_SERVICE_URL` and `VITE_PRIVACY_POLICY_URL` when you need
the local app to show deployment-specific legal links.

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
