import { afterEach, expect, test, vi } from "vitest";

import { ApiLocalService } from "../../src/core/local/ApiLocalService.js";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("uses an OPTIONS probe to detect GraphQL readiness", async () => {
  let now = 0;
  vi.spyOn(Date, "now").mockImplementation(() => {
    now += 1000;
    return now;
  });
  vi.spyOn(global, "setTimeout").mockImplementation(((callback: TimerHandler) => {
    if (typeof callback === "function") {
      callback();
    }
    return 0 as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);

  const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
    if (init?.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }

    return new Response(
      JSON.stringify({
        data: null,
        errors: [{ message: "Missing x-company-id header. Provide x-company-id for this request." }]
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  });
  vi.stubGlobal("fetch", fetchMock);

  const service = new ApiLocalService(
    {
      isRunning: vi.fn().mockReturnValue(true)
    } as never,
    {} as never
  );

  await expect(
    (service as ApiLocalService & {
      waitForReadiness: (url: string, runtime: unknown, serviceName: string) => Promise<void>;
    }).waitForReadiness(
      "http://127.0.0.1:4000/graphql",
      {
        source: "local",
        repoPath: "/workspace/companyhelm-api",
        logPath: "/tmp/api.log",
        pid: 1234
      },
      "API"
    )
  ).resolves.toBeUndefined();

  expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:4000/graphql", { method: "OPTIONS" });
});
