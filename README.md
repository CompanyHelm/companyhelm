# CompanyHelm

CompanyHelm is an open-source control plane for running AI-agent companies in your own infrastructure.
It gives teams a way to organize agents by role, keep humans in the loop for approvals and clarification, and run agent workloads in isolated environments instead of opaque hosted black boxes. Each agent can run its own app infra for testing and create PRs in full autonomy. Spin up container-isolated agent threads in a click.

[https://www.companyhelm.com/](https://www.companyhelm.com/)

## What CompanyHelm is

From the product perspective, CompanyHelm is built around a few core ideas:

- your infrastructure, not a vendor-controlled runtime
- model-agnostic agent execution through open runners and protocols
- easy agent customization: from UI add skills, MCP servers and custom instructions to the agents
- human-in-the-loop workflows: tasks can be steered at any moment throught he built in chat, approvals and questions are WIP
- isolated execution so agents can work in parallel with minimal interference. Each runner can spin up the full app infra within docker and test in isolation
- remote repo as source of truth. Agents automatically clone and submit PRs.

This package is the local entry point for that system.
Instead of asking you to clone multiple repos and stand up each service separately, the CLI starts a packaged local deployment for you.

## What the CLI boots locally

`npx @companyhelm/cli up` brings up a local CompanyHelm stack with:

- Postgres
- CompanyHelm API
- CompanyHelm frontend
- a host-managed CompanyHelm runner

The deployment is intended to feel like a product install, not a source-based developer workflow.
On startup, the CLI prepares runtime state, starts the services, configures the runner, and prints the local URLs and login credentials.

## Requirements

- Node.js `>=24`
- Docker with Docker Compose support available locally
- network access to pull the packaged runtime images

## Quick start

```bash
npx @companyhelm/cli up
```

After startup, the CLI prints:

- the local UI URL
- the local GraphQL API URL
- the generated username and password
- the resolved package and image versions

## Command reference

Start or reconcile the local deployment:

```bash
npx @companyhelm/cli up
```

Start with a specific log level:

```bash
npx @companyhelm/cli up --log-level debug
```

Inspect deployment status:

```bash
npx @companyhelm/cli status
```

Stream logs for a managed service:

```bash
npx @companyhelm/cli logs api
npx @companyhelm/cli logs frontend
npx @companyhelm/cli logs postgres
npx @companyhelm/cli logs runner
```

Stop the local deployment while keeping runtime state:

```bash
npx @companyhelm/cli down
```

Destroy the local deployment and runtime state:

```bash
npx @companyhelm/cli reset
```

Skip the reset confirmation prompt:

```bash
npx @companyhelm/cli reset --yes
```

For the full CLI help:

```bash
npx @companyhelm/cli --help
```

## Authentication

On first `up`, CompanyHelm generates a local admin login and stores it in the runtime state directory.

- username: `admin@local`
- password: randomly generated on first boot

The password is printed during startup and reused on later `up` runs.
If you want a fresh local environment and a new password, run `npx @companyhelm/cli reset --yes` and start again.

## Local runtime state

By default, CompanyHelm stores local state under:

```bash
~/.companyhelm
```

You can override that location with:

```bash
COMPANYHELM_HOME=/custom/path
```

That runtime directory contains the generated deployment state, rendered configs, compose file, seed data, and runner logs used by the local install.

## Why this repo exists

The hosted landing page describes CompanyHelm as the operating layer for AI-agent companies.
This repository is the fastest way to experience that locally:

- bring up the control plane on your machine
- inspect how the local runtime is configured
- validate the runner integration
- explore the product with a real UI and API instead of mocked examples

If you want to evaluate CompanyHelm as a self-hosted system, this CLI is the starting point.
