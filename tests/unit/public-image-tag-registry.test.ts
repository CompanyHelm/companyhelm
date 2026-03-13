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
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        manifests: [
          {
            digest: "sha256:tag-main",
            platform: { os: "linux", architecture: "amd64" }
          }
        ]
      })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        manifests: [
          {
            digest: "sha256:tag-latest",
            platform: { os: "linux", architecture: "amd64" }
          }
        ]
      })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ config: { digest: "sha256:config-main" } })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ config: { digest: "sha256:config-latest" } })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ created: "2026-03-12T05:36:25.602Z" })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ created: "2026-03-13T20:48:37.557Z" })
    }) as typeof fetch;

  const registry = new PublicImageTagRegistry();

  await expect(registry.listAvailableTags("api", 2)).resolves.toEqual([
    { tag: "latest", createdAt: "2026-03-13T20:48:37.557Z" },
    { tag: "main-c32cd29", createdAt: "2026-03-12T05:36:25.602Z" }
  ]);
  expect(globalThis.fetch).toHaveBeenCalledTimes(8);
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
