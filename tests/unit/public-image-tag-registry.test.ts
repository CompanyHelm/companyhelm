import { afterEach, expect, test, vi } from "vitest";

import { PublicImageTagRegistry } from "../../src/core/runtime/PublicImageTagRegistry.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

test("loads public image tags through the anonymous token flow", async () => {
  globalThis.fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "token-123" })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tags: ["main-c32cd29", "latest", "latest"] })
    }) as typeof fetch;

  const registry = new PublicImageTagRegistry();

  await expect(registry.listAvailableTags("api", 2)).resolves.toEqual(["main-c32cd29", "latest"]);
  expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  expect(globalThis.fetch).toHaveBeenNthCalledWith(
    1,
    "https://public.ecr.aws/token/?service=public.ecr.aws&scope=repository%3Ax6n0f2k4%2Fcompanyhelm-api%3Apull"
  );
});

test("builds full image references from selected tags", () => {
  const registry = new PublicImageTagRegistry();

  expect(registry.buildImageReference("frontend", "main-8fc7844")).toBe(
    "public.ecr.aws/x6n0f2k4/companyhelm-web:main-8fc7844"
  );
});
