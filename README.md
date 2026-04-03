# CompanyHelm NG

Monorepo with:

- `apps/api`: Fastify API
- `apps/web`: Vite web app

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

2. Copy the example environment file.

```bash
cp .env.example .env
```

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

## Environment variables

The root `.env.example` file contains the variables used by local development.

A few notes:

- `apps/api/config/local.yaml` reads Clerk, GitHub, and CompanyHelm E2B values from environment variables.
- The placeholder values in `.env.example` are enough to boot the app locally.
- Replace the placeholders with real secrets before using auth, GitHub install flows, or CompanyHelm-backed compute.
- `DATABASE_URL` is used by Drizzle tooling. The API runtime itself reads database credentials from `apps/api/config/local.yaml`.

## Container images

`companyhelm-ng` now ships separate Docker builds for the API and web apps:

- API image: `docker/api/Dockerfile`
- Web image: `docker/web/Dockerfile`

Build them from the repository root:

```bash
docker build -f docker/api/Dockerfile -t companyhelm-ng-api .
docker build -f docker/web/Dockerfile -t companyhelm-ng-web .
```

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

If you want to source the full API config from S3 instead, set `COMPANYHELM_API_CONFIG_S3_URI`. The entrypoint will download that file before starting the server.

### Web runtime config

The web image is now environment-agnostic. It builds the static assets once, and the container
entrypoint writes `/runtime-config.js` before Caddy starts. That file is loaded by
`apps/web/index.html`, and `apps/web/src/config.ts` reads the injected values before falling back
to local Vite variables.

Provide these public runtime environment variables when you run the web container:

- `COMPANYHELM_WEB_CLERK_PUBLISHABLE_KEY`
- `COMPANYHELM_WEB_GRAPHQL_URL`

Optional:

- `COMPANYHELM_WEB_RUNTIME_CONFIG_PATH`

Example:

```bash
docker run --rm -p 4173:4173 \
  -e COMPANYHELM_WEB_CLERK_PUBLISHABLE_KEY=pk_live_example \
  -e COMPANYHELM_WEB_GRAPHQL_URL=https://api.example.com/graphql \
  companyhelm-ng-web
```

Local Vite development still uses `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_GRAPHQL_URL` from your
local environment.

### GitHub Actions publish flow

`.github/workflows/publish_app_images.yml` publishes both images to private ECR when a `v*` tag is pushed. Before using it, configure these repository variables:

- `COMPANYHELM_NG_API_IMAGE_PUBLISHER_ROLE_ARN`
- `COMPANYHELM_NG_WEB_IMAGE_PUBLISHER_ROLE_ARN`

The workflow expects these private ECR repositories to already exist in `us-west-2`:

- `companyhelm-ng-api`
- `companyhelm-ng-web`

## Common commands

### Development

Start the API:

```bash
npm run dev:api
```

Start the web app:

```bash
npm run dev:web
```

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
