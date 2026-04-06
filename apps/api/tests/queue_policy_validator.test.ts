import assert from "node:assert/strict";
import { test, vi } from "vitest";
import { QueuePolicyValidator } from "../src/services/redis/queue_policy_validator.ts";

test("QueuePolicyValidator accepts Redis instances configured with noeviction", async () => {
  const error = vi.fn();
  const validator = new QueuePolicyValidator(
    {
      redis: {
        host: "127.0.0.1",
        port: 6379,
      },
    } as never,
    {
      child() {
        return {
          error,
        };
      },
    } as never,
    {
      async getClient() {
        return {
          async sendCommand() {
            return "# Memory\r\nmaxmemory_policy:noeviction\r\n";
          },
        };
      },
    } as never,
  );

  await validator.validateNoEvictionPolicy();

  assert.equal(error.mock.calls.length, 0);
});

test("QueuePolicyValidator logs and fails when Redis uses an eviction policy BullMQ cannot trust", async () => {
  const error = vi.fn();
  const validator = new QueuePolicyValidator(
    {
      redis: {
        host: "127.0.0.1",
        port: 6379,
      },
    } as never,
    {
      child() {
        return {
          error,
        };
      },
    } as never,
    {
      async getClient() {
        return {
          async sendCommand() {
            return "# Memory\r\nmaxmemory_policy:volatile-lru\r\n";
          },
        };
      },
    } as never,
  );

  await assert.rejects(
    () => validator.validateNoEvictionPolicy(),
    /Redis maxmemory policy must be "noeviction" for BullMQ, got "volatile-lru"\./u,
  );

  assert.equal(error.mock.calls.length, 1);
  assert.equal(error.mock.calls[0]?.[1], "redis queue backend requires noeviction policy");
  assert.equal(error.mock.calls[0]?.[0]?.maxmemoryPolicy, "volatile-lru");
});
