# CompanyHelm - Distributed AI Agent Orchestration

CompanyHelm is an open-source control plane for running AI-agent companies in your own infrastructure.
It gives teams a way to organize agents by role, keep humans in the loop for approvals and clarification, and run agent workloads in isolated environments instead of opaque hosted black boxes. Each agent can run its own app infrastructure for testing and create PRs autonomously. Spin up container-isolated agent threads with a click.

[Website](https://www.companyhelm.com/)

## Quick start

Dependecies:
- Docker
- Node.js `>=24`
- Codex subscription or api key
- Github account

```bash
npx @companyhelm/cli up
```

After startup, the CLI prints:

- the local dashboard UI URL
- the generated username and password

## What CompanyHelm is

From the product perspective, CompanyHelm is built around a few core ideas:

- Your infrastructure, not a vendor-controlled runtime
- Model-agnostic agent execution through open runners and protocols
- Easy agent customization: add skills, MCP servers, and custom instructions to agents from the UI
- Human-in-the-loop workflows: tasks can be steered at any moment through the built-in chat; approvals and questions are still a work in progress
- Isolated execution so agents can work in parallel with minimal interference. Each runner can spin up the full app infrastructure within Docker and test in isolation
- YOLO mode by default: agents run commands without pausing for trivial confirmations
- Remote repository as the source of truth: agents clone the repo and submit PRs automatically
- Parallel task execution: multiple agents can execute tasks independently in isolated environments

## What the CLI boots locally

`npx @companyhelm/cli up` brings up a local CompanyHelm stack with:

- CompanyHelm API
- Postgres
- CompanyHelm frontend
- CompanyHelm agent runner


## Command reference

For the full CLI help:

```bash
npx @companyhelm/cli --help
```

Common commands:

```bash
npx @companyhelm/cli setup-github-app
npx @companyhelm/cli set-image-version
npx @companyhelm/cli logs api
npx @companyhelm/cli reset --yes
npm run set-image-version
```
