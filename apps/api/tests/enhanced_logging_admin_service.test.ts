import assert from "node:assert/strict";
import { test } from "vitest";
import { EnhancedLoggingAdminService } from "../src/log/enhanced_logging_admin_service.ts";
import { EnhancedLoggingNames } from "../src/log/enhanced_logging_names.ts";

class EnhancedLoggingAdminServiceTestRedisClient {
  readonly deletedKeys: string[] = [];
  readonly publishedMessages: Array<{ channel: string; message: string }> = [];
  readonly setOperations: Array<{ key: string; options: unknown; value: string }> = [];
  readonly ttlSecondsByKey = new Map<string, number>();
  readonly valuesByKey = new Map<string, string>();

  async del(key: string): Promise<number> {
    this.deletedKeys.push(key);
    this.valuesByKey.delete(key);
    this.ttlSecondsByKey.delete(key);

    return 1;
  }

  async get(key: string): Promise<string | null> {
    return this.valuesByKey.get(key) ?? null;
  }

  async publish(channel: string, message: string): Promise<number> {
    this.publishedMessages.push({ channel, message });

    return 1;
  }

  async set(key: string, value: string, options: unknown): Promise<string> {
    this.setOperations.push({ key, value, options });
    this.valuesByKey.set(key, value);
    if (typeof options === "object" && options && "EX" in options && typeof options.EX === "number") {
      this.ttlSecondsByKey.set(key, options.EX);
    }

    return "OK";
  }

  async ttl(key: string): Promise<number> {
    if (!this.valuesByKey.has(key)) {
      return -2;
    }

    return this.ttlSecondsByKey.get(key) ?? -1;
  }
}

class EnhancedLoggingAdminServiceTestHarness {
  readonly client = new EnhancedLoggingAdminServiceTestRedisClient();
  readonly errorLogs: unknown[] = [];
  readonly names = new EnhancedLoggingNames();
  readonly service = new EnhancedLoggingAdminService(
    {
      async getClient() {
        return this.client;
      },
      client: this.client,
    } as never,
    {
      child: () => ({
        error: (payload: unknown) => {
          this.errorLogs.push(payload);
        },
      }),
    } as never,
    this.names,
  );
}

test("EnhancedLoggingAdminService enables company logging with a Redis TTL and invalidates readers", async () => {
  const harness = new EnhancedLoggingAdminServiceTestHarness();
  const key = harness.names.getCompanyConfigKey("company-1");

  const state = await harness.service.enableCompany({
    companyId: "company-1",
    components: ["session_process_cleanup"],
    sessionIds: ["session-1"],
    ttlSeconds: 3_600,
  });
  const storedConfig = JSON.parse(harness.client.valuesByKey.get(key) ?? "{}");

  assert.equal(state.enabled, true);
  assert.equal(state.ttlSeconds, 3_600);
  assert.equal(storedConfig.enabled, true);
  assert.deepEqual(storedConfig.components, ["session_process_cleanup"]);
  assert.deepEqual(storedConfig.sessionIds, ["session-1"]);
  assert.equal(harness.client.setOperations[0]?.key, key);
  assert.deepEqual(harness.client.setOperations[0]?.options, { EX: 3_600 });
  assert.deepEqual(harness.client.publishedMessages, [{
    channel: harness.names.getInvalidationChannel(),
    message: "company-1",
  }]);
  assert.ok(typeof storedConfig.expiresAt === "string");
  assert.ok(Date.parse(storedConfig.expiresAt) > Date.now());
});

test("EnhancedLoggingAdminService disables company logging by deleting Redis config and publishing invalidation", async () => {
  const harness = new EnhancedLoggingAdminServiceTestHarness();
  const key = harness.names.getCompanyConfigKey("company-1");
  harness.client.valuesByKey.set(key, JSON.stringify({ enabled: true }));
  harness.client.ttlSecondsByKey.set(key, 600);

  const state = await harness.service.disableCompany("company-1");

  assert.deepEqual(state, {
    components: [],
    enabled: false,
    expiresAt: null,
    sessionIds: [],
    ttlSeconds: null,
  });
  assert.deepEqual(harness.client.deletedKeys, [key]);
  assert.equal(harness.client.valuesByKey.has(key), false);
  assert.deepEqual(harness.client.publishedMessages, [{
    channel: harness.names.getInvalidationChannel(),
    message: "company-1",
  }]);
});

test("EnhancedLoggingAdminService reads malformed and expired config as disabled", async () => {
  const harness = new EnhancedLoggingAdminServiceTestHarness();
  const malformedKey = harness.names.getCompanyConfigKey("malformed-company");
  const expiredKey = harness.names.getCompanyConfigKey("expired-company");
  harness.client.valuesByKey.set(malformedKey, "not-json");
  harness.client.valuesByKey.set(expiredKey, JSON.stringify({
    enabled: true,
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  }));

  assert.deepEqual(await harness.service.getCompanyState("missing-company"), {
    components: [],
    enabled: false,
    expiresAt: null,
    sessionIds: [],
    ttlSeconds: null,
  });
  assert.deepEqual(await harness.service.getCompanyState("malformed-company"), {
    components: [],
    enabled: false,
    expiresAt: null,
    sessionIds: [],
    ttlSeconds: null,
  });
  assert.deepEqual(await harness.service.getCompanyState("expired-company"), {
    components: [],
    enabled: false,
    expiresAt: null,
    sessionIds: [],
    ttlSeconds: null,
  });
  assert.equal(harness.errorLogs.length, 1);
});
