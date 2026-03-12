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
    username: "admin@local"
  })).toContain("Postgres: [ok] running");
});
