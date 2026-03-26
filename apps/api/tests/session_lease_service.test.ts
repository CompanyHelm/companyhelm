import assert from "node:assert/strict";
import { test } from "vitest";
import { SessionLeaseService } from "../src/services/agent/session/process/lease.ts";

class SessionLeaseServiceTestHarness {
  static create() {
    const keyStore = new Map<string, string>();
    const client = {
      async eval(script: string, input: { arguments: string[]; keys: string[] }) {
        const key = input.keys[0]!;
        const token = input.arguments[0]!;
        if (script.includes("PEXPIRE")) {
          return keyStore.get(key) === token ? 1 : 0;
        }
        if (script.includes("DEL")) {
          if (keyStore.get(key) !== token) {
            return 0;
          }
          keyStore.delete(key);
          return 1;
        }

        throw new Error("Unexpected script.");
      },
      async set(key: string, value: string, options: { NX: boolean; PX: number }) {
        assert.equal(options.NX, true);
        assert.equal(options.PX, SessionLeaseService.LEASE_TTL_MILLISECONDS);
        if (keyStore.has(key)) {
          return null;
        }
        keyStore.set(key, value);
        return "OK";
      },
    };

    return {
      client,
      keyStore,
      redisService: {
        async getClient() {
          return client;
        },
      },
    };
  }
}

test("SessionLeaseService acquires, heartbeats, and releases one token-scoped lease", async () => {
  const harness = SessionLeaseServiceTestHarness.create();
  const service = new SessionLeaseService(harness.redisService as never);

  const lease = await service.acquire("company-1", "session-1");

  assert.ok(lease);
  assert.equal(harness.keyStore.size, 1);
  assert.equal(await service.heartbeat(lease!), true);

  const secondLease = await service.acquire("company-1", "session-1");
  assert.equal(secondLease, null);

  await service.release(lease!);
  assert.equal(harness.keyStore.size, 0);
});

test("SessionLeaseService does not heartbeat or release when the token no longer matches", async () => {
  const harness = SessionLeaseServiceTestHarness.create();
  const service = new SessionLeaseService(harness.redisService as never);
  const lease = await service.acquire("company-1", "session-1");
  assert.ok(lease);

  harness.keyStore.set("company:company-1:session:session-1:lease", "other-token");

  assert.equal(await service.heartbeat(lease!), false);
  await service.release(lease!);
  assert.equal(harness.keyStore.get("company:company-1:session:session-1:lease"), "other-token");
});
