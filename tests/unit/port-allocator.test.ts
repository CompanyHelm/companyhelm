import { expect, test } from "vitest";

import { PortAllocator } from "../../src/core/runtime/PortAllocator.js";

test("allocates unique ports for the managed services", () => {
  const allocator = new PortAllocator();

  const ports = allocator.allocate();

  expect(new Set(Object.values(ports)).size).toBe(4);
  expect(ports.apiHttp).toBe(4000);
  expect(ports.ui).toBe(4173);
  expect(ports.runnerGrpc).toBe(50051);
  expect(ports.agentCliGrpc).toBe(50052);
});
