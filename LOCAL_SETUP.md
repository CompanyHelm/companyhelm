# Local Setup

This guide covers local API and web development, plus the optional GitHub webhook setup for testing real GitHub App deliveries.

## Requirements

- Node.js `20.20.0`
- npm `11.6.2`
- Docker with Docker Compose
- GitHub App config values because the API local config expects them
- An E2B API key because the API local config expects it
- An Exa API key because the API local config expects it

Use the exact Node and npm versions to avoid lockfile drift:

```bash
nvm install
nvm use
npm install -g npm@11.6.2
```

## First-Time Setup

1. Copy the local environment files.

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

The API loads `apps/api/.env.local` automatically when started with `--config-path ./config/local.yaml`, which is what `npm run dev:api` does.

2. Fill in the required API variables in `apps/api/.env.local`.

Required by `apps/api/config/local.yaml`:

- `EXA_API_KEY`
- `E2B_API_KEY`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_PRIVATE_KEY_PEM`
- `GITHUB_APP_URL`
- `LOCAL_AUTH_SESSION_SECRET`
- `LOCAL_AUTH_PASSWORD_PEPPER`

Use real `GITHUB_*` values when testing GitHub install flows, GitHub API calls, or webhooks. Placeholder values are enough only for local work that does not touch GitHub features.

`DATABASE_URL` is required by Drizzle commands. The API runtime itself reads database role credentials from `apps/api/config/local.yaml`.

3. Fill in the web variables in `apps/web/.env.local`.

Useful defaults are already present:

- `VITE_GRAPHQL_URL=http://localhost:4000/graphql`
- `VITE_AUTH_PROVIDER=local`
- `VITE_AMPLITUDE_ENABLED=false`

4. Install dependencies.

```bash
npm install
```

5. Start local Postgres, Redis, and pgAdmin.

```bash
npm run db:up
```

6. Start the API.

```bash
npm run dev:api
```

7. Start the web app in another terminal.

```bash
npm run dev:web
```

## Local URLs

- Web app: `http://localhost:5173`
- API GraphQL: `http://localhost:4000/graphql`
- API health: `http://localhost:4000/health`
- GitHub webhook endpoint, if enabled: `http://localhost:4000/webhooks/github`
- pgAdmin: `http://localhost:5050`
- Redis: `localhost:6379`

## Optional Local Environment Variables

`COMPANYHELM_OPENAI_API_KEY`

Seeds the managed CompanyHelm OpenAI provider when present. If omitted, users can still add their own model provider credentials from the UI.

`GITHUB_WEBHOOK_SECRET`

Enables `POST /webhooks/github` and verifies GitHub webhook signatures. If omitted, the API does not register the webhook route and local requests to `/webhooks/github` return `404`. This is the normal local setup when localhost is not exposed to GitHub.

`VITE_TERMS_OF_SERVICE_URL` and `VITE_PRIVACY_POLICY_URL`

Used by the web app for sign-up legal links. Keep placeholders locally unless you need to test the exact legal URLs.

`VITE_AMPLITUDE_ENABLED` and `VITE_AMPLITUDE_ID`

Controls browser analytics. Leave disabled locally unless you explicitly want local telemetry.

## GitHub Webhook Testing With Ngrok

You only need this if you want GitHub to deliver real webhook events to your local API. Normal local development does not need ngrok or `GITHUB_WEBHOOK_SECRET`.

1. Create a local webhook secret and add it to `apps/api/.env.local`.

```bash
openssl rand -hex 32
```

```bash
GITHUB_WEBHOOK_SECRET=replace-with-generated-secret
```

Restart `npm run dev:api` after changing the env file. With the secret set, the API registers `POST /webhooks/github`.

2. Start ngrok for the API port.

```bash
ngrok http 4000
```

Copy the HTTPS forwarding URL, for example `https://example.ngrok-free.app`.

3. Configure the GitHub App webhook.

In the GitHub App settings:

- Webhook URL: `https://example.ngrok-free.app/webhooks/github`
- Webhook secret: the same value as `GITHUB_WEBHOOK_SECRET`
- Content type: `application/json`

Subscribe to the events this API currently processes:

- `installation`
- `installation_repositories`
- `repository`
- `pull_request`
- `pull_request_review`
- `pull_request_review_comment`
- `issue_comment`

4. Trigger or redeliver a webhook from GitHub.

Useful local checks:

- No `GITHUB_WEBHOOK_SECRET`: `POST /webhooks/github` returns `404`.
- `GITHUB_WEBHOOK_SECRET` set, but unsigned curl request: returns `401`.
- Valid GitHub delivery through ngrok: returns `202` and enqueues a BullMQ job.

The worker processes the job from Redis and updates cached GitHub installation/repository rows for linked installations.

## Common Commands

```bash
npm run db:up
npm run db:down
npm run db:reset
npm run dev:api
npm run dev:web
npm run test:api
npm run test:web
```

Run migrations explicitly when you need to apply Drizzle migrations outside API startup:

```bash
npm run db:migrate
```

## One-command dev-auth boot

For day-to-day local development, prefer the dev-auth boot command:

```bash
npm run local-dev
```

This command starts Postgres, Redis, and pgAdmin when they are not already reachable, runs the local seed, then starts the API and web app. It uses `apps/api/config/local-dev.yaml` and `apps/web/.env.local-dev`. The local seed creates the deterministic dev user `andrea.local@companyhelm.dev`, the `CompanyHelm Local` company, and the `CEO` agent backed by the CompanyHelm-managed model provider.

The command still expects the product integrations that power normal agent work:

- `EXA_API_KEY`
- `E2B_API_KEY`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_PRIVATE_KEY_PEM`
- `GITHUB_APP_URL`
- `COMPANYHELM_OPENAI_API_KEY` or `OPENAI_API_KEY`

For the CompanyHelm E2B runtime, expose both ports first and inject the forwarded URLs:

```bash
COMPANYHELM_API_PUBLIC_URL=https://4000-<sandbox>.e2b.app \
COMPANYHELM_WEB_PUBLIC_URL=https://5173-<sandbox>.e2b.app \
npm run local-e2b
```

`local-e2b` uses `apps/api/config/local-e2b.yaml`, injects the forwarded web origin into CORS, and starts Vite on `0.0.0.0:5173` with a strict port so the forwarded web URL always points at the actual app.
