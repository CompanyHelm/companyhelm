import { expect, test, vi } from "vitest";

import { LogsService } from "../../src/core/logs/LogsService.js";

test("rejects unknown services", async () => {
  const service = new LogsService(async () => undefined);

  await expect(service.stream("unknown")).rejects.toThrow("Unknown service");
});

test("maps repo-style service names to managed service keys", async () => {
  const streamServiceLogs = vi.fn(async () => undefined);
  const service = new LogsService(streamServiceLogs);

  await service.stream("companyhelm-api");

  expect(streamServiceLogs).toHaveBeenCalledWith("api");
});
