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

test("RedisService creates one command client from config and reuses it after connect", async () => {
  const client = {
    connect: vi.fn(async () => {
      client.isOpen = true;
    }),
    isOpen: false,
    on: vi.fn(),
  };
  createClientMock.mockReturnValue(client);

  const service = new RedisService({
    redis: {
      host: "127.0.0.1",
      port: 6379,
      username: "redis-user",
      password: "redis-password",
    },
  } as Config, {
    child() {
      return {
        error() {},
      };
    },
  } as never);

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

test("RedisService reuses one shared subscriber client across repeated subscriber requests", async () => {
  const subscriber = {
    connect: vi.fn(async () => {
      subscriber.isOpen = true;
    }),
    isOpen: false,
    on: vi.fn(),
  };
  const client = {
    connect: vi.fn(async () => {
      client.isOpen = true;
    }),
    duplicate: vi.fn(() => subscriber),
    isOpen: false,
    on: vi.fn(),
  };
  createClientMock.mockReturnValue(client);

  const service = new RedisService({
    redis: {
      host: "127.0.0.1",
      port: 6379,
      username: "redis-user",
      password: "redis-password",
    },
  } as Config, {
    child() {
      return {
        error() {},
      };
    },
  } as never);

  const firstSubscriber = await service.getSubscriberClient();
  const secondSubscriber = await service.getSubscriberClient();

  assert.equal(firstSubscriber, subscriber);
  assert.equal(secondSubscriber, subscriber);
  assert.equal(createClientMock.mock.calls.length, 1);
  assert.equal(client.connect.mock.calls.length, 1);
  assert.equal(client.duplicate.mock.calls.length, 1);
  assert.equal(subscriber.connect.mock.calls.length, 1);
});

test("RedisCompanyScopedService subscribes on the company-prefixed key", async () => {
  const subscribe = vi.fn(async () => undefined);
  const unsubscribe = vi.fn(async () => undefined);
  const subscriber = {
    subscribe,
    unsubscribe,
  };
  const redisService = {
    getSubscriberClient: vi.fn(async () => subscriber),
  };
  const service = new RedisCompanyScopedService("company-123", redisService as never);
  const listener = vi.fn();

  const subscriptionHandle = await service.subscribe("events", listener);
  const subscribeCall = subscribe.mock.calls.at(0) as Array<unknown> | undefined;

  assert.equal(redisService.getSubscriberClient.mock.calls.length, 1);
  assert.equal(subscribeCall?.[0], "company:company-123:events");

  await subscriptionHandle.unsubscribe();
  const unsubscribeCall = unsubscribe.mock.calls.at(0) as Array<unknown> | undefined;

  assert.equal(unsubscribeCall?.[0], "company:company-123:events");
});

test("RedisCompanyScopedService publishes on the company-prefixed key with an empty payload", async () => {
  const publish = vi.fn(async () => 1);
  const client = {
    publish,
  };
  const redisService = {
    getClient: vi.fn(async () => client),
  };
  const service = new RedisCompanyScopedService("company-123", redisService as never);

  await service.publish("session:session-1:update");
  const publishCall = publish.mock.calls.at(0) as Array<unknown> | undefined;

  assert.equal(redisService.getClient.mock.calls.length, 1);
  assert.deepEqual(publishCall, [
    "company:company-123:session:session-1:update",
    "",
  ]);
});

test("RedisCompanyScopedService reuses the shared subscriber client across subscriptions", async () => {
  const subscribe = vi.fn(async () => undefined);
  const pSubscribe = vi.fn(async () => undefined);
  const pUnsubscribe = vi.fn(async () => undefined);
  const subscriber = {
    pSubscribe,
    pUnsubscribe,
    subscribe,
    unsubscribe: vi.fn(async () => undefined),
  };
  const redisService = {
    getSubscriberClient: vi.fn(async () => subscriber),
  };
  const service = new RedisCompanyScopedService("company-123", redisService as never);

  const firstHandle = await service.subscribe("events", vi.fn());
  const secondHandle = await service.subscribePattern("session:*:update", vi.fn());
  const subscribeCall = subscribe.mock.calls.at(0) as Array<unknown> | undefined;
  const pSubscribeCall = pSubscribe.mock.calls.at(0) as Array<unknown> | undefined;

  assert.equal(redisService.getSubscriberClient.mock.calls.length, 2);
  assert.equal(subscribeCall?.[0], "company:company-123:events");
  assert.equal(pSubscribeCall?.[0], "company:company-123:session:*:update");

  await firstHandle.unsubscribe();
  await secondHandle.unsubscribe();
  const pUnsubscribeCall = pUnsubscribe.mock.calls.at(0) as Array<unknown> | undefined;

  assert.equal(pUnsubscribeCall?.[0], "company:company-123:session:*:update");
});

test("RedisService logs a dedicated error when Redis rejects a subscriber connection due to client limits", async () => {
  const error = vi.fn();
  const subscriberError = new Error("ERR max number of clients reached");
  const subscriber = {
    connect: vi.fn(async () => {
      throw subscriberError;
    }),
    isOpen: false,
    on: vi.fn(),
  };
  const client = {
    connect: vi.fn(async () => {
      client.isOpen = true;
    }),
    duplicate: vi.fn(() => subscriber),
    isOpen: false,
    on: vi.fn(),
  };
  createClientMock.mockReturnValue(client);

  const service = new RedisService({
    redis: {
      host: "127.0.0.1",
      port: 6379,
      username: "redis-user",
      password: "redis-password",
    },
  } as Config, {
    child() {
      return {
        error,
      };
    },
  } as never);

  await assert.rejects(service.getSubscriberClient(), /ERR max number of clients reached/);

  assert.equal(error.mock.calls.length, 1);
  assert.equal(error.mock.calls[0]?.[1], "redis client limit reached");
  assert.equal(error.mock.calls[0]?.[0]?.connectionType, "subscriber");
  assert.equal(error.mock.calls[0]?.[0]?.redisHost, "127.0.0.1");
  assert.equal(error.mock.calls[0]?.[0]?.redisPort, 6379);
});
