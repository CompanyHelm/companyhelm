import { expect, test } from "vitest";

import { PortAllocator } from "../../src/core/runtime/PortAllocator.js";

test("allocates unique ports for the managed services", () => {
  const allocator = new PortAllocator(4173);

  const ports = allocator.allocate();

  expect(new Set(Object.values(ports)).size).toBe(3);
  expect(ports.ui).toBe(4173);
});
