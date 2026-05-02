# CompanyHelm local run guide

This file explains how to run CompanyHelm locally without CORS issues, and how to expose the local web app through port forwarding when you are working inside the CompanyHelm agent runtime.

## The short version

- Preferred one-command local dev auth setup: `npm run local-dev`.
- Preferred one-command E2B setup after exposing ports: `COMPANYHELM_API_PUBLIC_URL=<api-url> COMPANYHELM_WEB_PUBLIC_URL=<web-url> npm run local-e2b`.
- Both commands seed `andrea.local@companyhelm.dev`, `CompanyHelm Local`, and an onboarding `Operator` agent using the CompanyHelm provider.
- `npm run local-dev` does not require an OpenAI key; set `COMPANYHELM_LOCAL_OPENAI_API_KEY` only when you want real local agent execution.
- Local OpenAI keys are validated against the OpenAI models API before the seed script activates a local platform route.
- For a normal local setup, keep everything on localhost:
  - web: `http://localhost:5173`
  - api: `http://localhost:4000`
- The default local API CORS config already allows:
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`
- If you open the web app through a forwarded URL instead of localhost, that forwarded origin is a different browser origin and must be allowed by the API CORS config.
- When using CompanyHelm tools, use `get_e2b_port_url` to expose ports. Open the returned URL with `computer_open` or in a browser.

## Files involved

- `apps/api/config/local.yaml`
  - API host/port
  - API CORS allowlist
  - Clerk authorized parties for local browser origins
- `apps/api/.env.local`
  - API secrets and keys
- `apps/web/.env.local`
  - browser-side configuration, especially `VITE_GRAPHQL_URL`

## Standard local setup without port forwarding

This is the easiest way to avoid CORS problems.

### 1. Copy the env files

```bash
cp apps/api/.env.example apps/api/.env.local
cp apps/web/.env.example apps/web/.env.local
```

### 2. Set the web GraphQL URL to the local API

In `apps/web/.env.local`:

```bash
VITE_GRAPHQL_URL=http://localhost:4000/graphql
```

That must match how you are opening the API locally.

### 3. Start the database and Redis

```bash
npm run db:up
```

### Optional: enable real local agent model execution

Local development starts without a model key so UI work does not depend on LLM credentials.
If you want local agents to execute against OpenAI, provide an explicit local-only shell environment variable:

```bash
COMPANYHELM_LOCAL_OPENAI_API_KEY=sk-... npm run local-dev
```

The local seed script validates that key with OpenAI before it writes/updates the local
platform credential and routes default platform models to it. Ambient `OPENAI_API_KEY` and
`COMPANYHELM_OPENAI_API_KEY` values are intentionally ignored by the local seed flow to avoid
accidentally activating stale or placeholder credentials.

### 4. Start the API

```bash
npm run dev:api
```

### 5. Start the web app

```bash
npm run dev:web
```

### 6. Open the app locally

Use:

- `http://localhost:5173`, or
- `http://127.0.0.1:5173`

With the checked-in local config, those origins already match the API CORS allowlist in `apps/api/config/local.yaml`.

## Why CORS breaks when port forwarding is involved

The local API config allows localhost browser origins by default:

```yaml
cors:
  origin:
    - "http://127.0.0.1:5173"
    - "http://localhost:5173"
```

If you open the web app via a forwarded URL such as:

```text
https://5173-<sandbox>.e2b.app
```

then the browser origin is no longer `http://localhost:5173`. It is now that `https://...e2b.app` hostname.

From the API point of view, this is a different origin, so the API will reject browser requests unless that forwarded origin is added to the CORS allowlist.

There is also a second issue: if the forwarded web app still points at `http://localhost:4000/graphql`, that `localhost` resolves in the remote browser context, not on your laptop. In that case you must expose the API too and point the web app at the forwarded API URL.

## Correct setup when you want forwarded URLs

The easiest E2B path is now `npm run local-e2b` after retrieving the API and web forwarded URLs with `get_e2b_port_url`. The command uses `apps/api/config/local-e2b.yaml` so forwarded CORS is injected by environment variables instead of editing `local.yaml` manually. Add `COMPANYHELM_LOCAL_OPENAI_API_KEY=sk-...` only when you want the E2B local run to validate and seed a real local OpenAI route.


If you want to open the app through a forwarded URL, do all of the following.

### 1. Expose the API port first

Use the CompanyHelm tool:

- `get_e2b_port_url` with port `4000`

This returns a public URL for the local API, for example:

```text
https://4000-<sandbox>.e2b.app
```

Your GraphQL endpoint becomes:

```text
https://4000-<sandbox>.e2b.app/graphql
```

### 2. Expose the web port

Use:

- `get_e2b_port_url` with port `5173`

This returns the public URL for the local Vite app.

### 3. Point the web app at the forwarded API

Before starting the web app, set `VITE_GRAPHQL_URL` to the forwarded API URL.

Example:

```bash
VITE_GRAPHQL_URL=https://4000-<sandbox>.e2b.app/graphql npm run dev:web
```

Or write the same value into `apps/web/.env.local` before starting the web app.

### 4. Allow the forwarded web origin in API CORS

Add the forwarded web URL origin to `apps/api/config/local.yaml`.

Example:

```yaml
cors:
  origin:
    - "http://127.0.0.1:5173"
    - "http://localhost:5173"
    - "https://5173-<sandbox>.e2b.app"
```

If you are testing authenticated flows, also add that same forwarded web origin to Clerk authorized parties in the same file:

```yaml
auth:
  provider: "clerk"
  clerk:
    authorized_parties:
      - "http://localhost:5173"
      - "http://localhost:4000"
      - "https://5173-<sandbox>.e2b.app"
```

After changing `local.yaml`, restart the API.

## Which CompanyHelm tools to use

When you are running inside the CompanyHelm agent runtime and want to show a real local app:

### Expose a local port

Use:

- `get_e2b_port_url`

Examples:

- port `5173` for the Vite web app
- port `4000` for the API

### Open the forwarded app in the desktop browser

Use either:

- `computer_open`, or
- `computer_launch` with Chrome or Firefox

Typical flow:

1. start API on `4000`
2. call `get_e2b_port_url(4000)`
3. start web with `VITE_GRAPHQL_URL=<forwarded-api-url>/graphql`
4. call `get_e2b_port_url(5173)`
5. open the returned web URL with `computer_open`

## Recommended flows

### Best flow for day-to-day local development

Use localhost only, and omit model credentials unless you are testing real agent execution:

- keep `VITE_GRAPHQL_URL=http://localhost:4000/graphql`
- open `http://localhost:5173`
- do not use port forwarding unless you specifically need to share or demo the app
- optionally set `COMPANYHELM_LOCAL_OPENAI_API_KEY` if you need local agents to call OpenAI

### Best flow for demos from the CompanyHelm runtime

- run the real API locally on `4000`
- run the real web app locally on `5173`
- expose both ports with `get_e2b_port_url`
- point `VITE_GRAPHQL_URL` at the forwarded API URL
- add the forwarded web origin to API CORS if the browser will load the web app from that forwarded URL

## Troubleshooting checklist

If the browser shows a CORS error, check these in order:

1. **What origin is the browser actually on?**
   - `http://localhost:5173` is different from `https://5173-<sandbox>.e2b.app`

2. **Does `apps/api/config/local.yaml` allow that exact web origin?**
   - update `cors.origin`
   - restart the API

3. **What is `VITE_GRAPHQL_URL` set to?**
   - local browser + local API: `http://localhost:4000/graphql`
   - forwarded browser + forwarded API: `https://4000-<sandbox>.e2b.app/graphql`

4. **Did you restart the web app after changing `VITE_GRAPHQL_URL`?**
   - Vite reads the env at startup

5. **Are you testing Clerk auth through a forwarded origin?**
   - add that origin to `auth.clerk.authorized_parties`

6. **Are both API and web ports actually running?**
   - web alone is not enough if the browser needs to call the API remotely

7. **Did an agent run fail with local model access not configured?**
   - rerun local dev with `COMPANYHELM_LOCAL_OPENAI_API_KEY=sk-... npm run local-dev`
   - the seed script validates the key before activating the local OpenAI platform route

## Safe default

If you are not explicitly demoing or sharing the app, the safest setup is still:

- API on `http://localhost:4000`
- web on `http://localhost:5173`
- `VITE_GRAPHQL_URL=http://localhost:4000/graphql`
- no OpenAI key is needed unless you are testing real agent execution

That path matches the checked-in local CORS settings and avoids almost all local browser CORS issues.
