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

- `apps/api/config/local.yaml` reads Clerk, GitHub, and Daytona values from environment variables.
- The placeholder values in `.env.example` are enough to boot the app locally.
- Replace the placeholders with real secrets before using auth, GitHub install flows, or Daytona-backed features.
- `DATABASE_URL` is used by Drizzle tooling. The API runtime itself reads database credentials from `apps/api/config/local.yaml`.

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
