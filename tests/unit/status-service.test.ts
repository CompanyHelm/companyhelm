import { expect, test } from "vitest";

import { StatusService } from "../../src/core/status/StatusService.js";

test("reports each managed service independently", async () => {
  const service = new StatusService(async () => "postgres\napi\nfrontend\n");

  const snapshot = await service.read();

  expect(snapshot.postgres).toBe("running");
  expect(snapshot.api).toBe("running");
  expect(snapshot.frontend).toBe("running");
  expect(snapshot.runner).toBe("stopped");
});

test("uses explicit frontend and runner overrides when provided", async () => {
  const service = new StatusService(async () => "postgres\napi\n", {
    frontend: () => true,
    runner: () => true
  });

  const snapshot = await service.read();

  expect(snapshot.frontend).toBe("running");
  expect(snapshot.runner).toBe("running");
});
