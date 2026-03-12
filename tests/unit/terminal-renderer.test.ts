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
