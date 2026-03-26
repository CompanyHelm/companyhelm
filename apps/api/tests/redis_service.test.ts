import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";
import type { Config } from "../src/config/schema.ts";
import { RedisCompanyScopedService } from "../src/services/redis/company_scoped_service.ts";
import { RedisService } from "../src/services/redis/service.ts";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("redis", () => ({
  createClient: createClientMock,
}));

afterEach(() => {
  createClientMock.mockReset();
});

test("RedisService creates one client from config and reuses it after connect", async () => {
  const client = {
    connect: vi.fn(async () => {
      client.isOpen = true;
    }),
    isOpen: false,
  };
  createClientMock.mockReturnValue(client);

  const service = new RedisService({
    redis: {
      host: "127.0.0.1",
      port: 6379,
      username: "redis-user",
      password: "redis-password",
    },
  } as Config);

  const connectedClient = await service.getClient();
  const reusedClient = await service.getClient();

  assert.equal(connectedClient, client);
  assert.equal(reusedClient, client);
  assert.equal(createClientMock.mock.calls.length, 1);
  assert.equal(client.connect.mock.calls.length, 1);
  assert.deepEqual(createClientMock.mock.calls[0]?.[0], {
    socket: {
      host: "127.0.0.1",
      port: 6379,
    },
    username: "redis-user",
    password: "redis-password",
  });
});

test("RedisCompanyScopedService subscribes on the company-prefixed key", async () => {
  const subscribe = vi.fn(async () => undefined);
  const unsubscribe = vi.fn(async () => undefined);
  const subscriber = {
    connect: vi.fn(async () => undefined),
    subscribe,
    unsubscribe,
  };
  const baseClient = {
    duplicate: vi.fn(() => subscriber),
  };
  const redisService = {
    getClient: vi.fn(async () => baseClient),
  };
  const service = new RedisCompanyScopedService("company-123", redisService as never);
  const listener = vi.fn();

  const subscriptionHandle = await service.subscribe("events", listener);

  assert.equal(redisService.getClient.mock.calls.length, 1);
  assert.equal(baseClient.duplicate.mock.calls.length, 1);
  assert.equal(subscriber.connect.mock.calls.length, 1);
  assert.equal(subscribe.mock.calls[0]?.[0], "company:company-123:events");

  await subscriptionHandle.unsubscribe();

  assert.equal(unsubscribe.mock.calls[0]?.[0], "company:company-123:events");
});

test("RedisCompanyScopedService publishes on the company-prefixed key with an empty payload", async () => {
  const publish = vi.fn(async () => 1);
  const baseClient = {
    publish,
  };
  const redisService = {
    getClient: vi.fn(async () => baseClient),
  };
  const service = new RedisCompanyScopedService("company-123", redisService as never);

  await service.publish("session:session-1:update");

  assert.equal(redisService.getClient.mock.calls.length, 1);
  assert.deepEqual(publish.mock.calls[0], [
    "company:company-123:session:session-1:update",
    "",
  ]);
});

test("RedisCompanyScopedService reuses one subscriber client across multiple subscriptions", async () => {
  const subscribe = vi.fn(async () => undefined);
  const pSubscribe = vi.fn(async () => undefined);
  const pUnsubscribe = vi.fn(async () => undefined);
  const subscriber = {
    connect: vi.fn(async () => {
      subscriber.isOpen = true;
    }),
    isOpen: false,
    pSubscribe,
    pUnsubscribe,
    subscribe,
    unsubscribe: vi.fn(async () => undefined),
  };
  const baseClient = {
    duplicate: vi.fn(() => subscriber),
  };
  const redisService = {
    getClient: vi.fn(async () => baseClient),
  };
  const service = new RedisCompanyScopedService("company-123", redisService as never);

  const firstHandle = await service.subscribe("events", vi.fn());
  const secondHandle = await service.subscribePattern("session:*:update", vi.fn());

  assert.equal(baseClient.duplicate.mock.calls.length, 1);
  assert.equal(subscriber.connect.mock.calls.length, 1);
  assert.equal(subscribe.mock.calls[0]?.[0], "company:company-123:events");
  assert.equal(pSubscribe.mock.calls[0]?.[0], "company:company-123:session:*:update");

  await firstHandle.unsubscribe();
  await secondHandle.unsubscribe();

  assert.equal(pUnsubscribe.mock.calls[0]?.[0], "company:company-123:session:*:update");
});
