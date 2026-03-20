# CompanyHelm NG

Minimal monorepo skeleton with:

- `apps/api`: Fastify API
- `apps/web`: Vite web app

## Requirements

- Node.js 18+
- npm

## Install

```bash
npm install
```

## Run

Start the API:

```bash
npm run dev:api
```

The API listens on `http://127.0.0.1:3001` and exposes:

- `GET /` -> `{"message":"hello world"}`

Start the web app:

```bash
npm run dev:web
```

By default Vite serves the app on `http://localhost:5173`.

Start both apps with Turbo:

```bash
npm run dev
```
