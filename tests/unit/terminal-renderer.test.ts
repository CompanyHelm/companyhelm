import { expect, test } from "vitest";

import { TerminalRenderer } from "../../src/core/ui/TerminalRenderer.js";

test("renders a branded startup banner", () => {
  const renderer = new TerminalRenderer(false);

  expect(renderer.renderBanner()).toContain("COMPANYHELM");
});

test("formats success output with labels", () => {
  const renderer = new TerminalRenderer(false);

  expect(renderer.success("ready")).toContain("ready");
});

test("returns plain urls when terminal hyperlinks are disabled", () => {
  const renderer = new TerminalRenderer(false);

  expect(renderer.clickableUrl("http://127.0.0.1:3001")).toBe("http://127.0.0.1:3001");
});

test("renders terminal hyperlinks when enabled", () => {
  const renderer = new TerminalRenderer(true);

  expect(renderer.clickableUrl("http://127.0.0.1:3001")).toContain("\u001B]8;;http://127.0.0.1:3001\u0007");
});

test("renders a readable status summary", () => {
  const renderer = new TerminalRenderer(false);

  expect(renderer.renderStatus({
    services: {
      postgres: "running",
      api: "running",
      frontend: "stopped",
      runner: "running"
    },
    apiUrl: "http://127.0.0.1:4000/graphql",
    username: "admin@local",
    versions: {
      cliPackage: "@companyhelm/cli@0.1.2",
      runnerPackage: "@companyhelm/runner@0.0.13",
      images: {
        api: "public.ecr.aws/x6n0f2k4/companyhelm-api:latest",
        frontend: "public.ecr.aws/x6n0f2k4/companyhelm-web:latest",
        postgres: "postgres:16-alpine"
      }
    }
  })).toContain("CompanyHelm CLI: @companyhelm/cli@0.1.2");
});
