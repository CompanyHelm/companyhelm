import { expect, test } from "vitest";

import { LogsService } from "../../src/core/logs/LogsService.js";

test("rejects unknown services", async () => {
  const service = new LogsService(async () => undefined);

  await expect(service.stream("unknown")).rejects.toThrow("Unknown service");
});
