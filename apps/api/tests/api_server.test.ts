import "reflect-metadata";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test, vi } from "vitest";
import pino from "pino";
import { ApiServer } from "../src/server/api_server.ts";

test("ApiServer uses pino-pretty transport when log.json is disabled", () => {
  const loggerOptions = ApiServer.createLoggerOptions({
    log: {
      level: "debug",
      json: false,
    },
  });

  assert.deepEqual(loggerOptions, {
    level: "debug",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    },
  });
});

test("ApiServer uses standard structured logging when log.json is enabled", () => {
  const loggerOptions = ApiServer.createLoggerOptions({
    log: {
      level: "info",
      json: true,
    },
  });

  assert.deepEqual(loggerOptions, {
    level: "info",
  });
});

test("ApiServer does not expose a default root endpoint", async () => {
  const server = new ApiServer({
    host: "127.0.0.1",
    port: 0,
    cors: {
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowed_headers: ["content-type", "authorization"],
    },
  } as never, {
    close: async () => {},
  } as never, {
    close: async () => {},
  } as never, {
    register: async () => {},
  } as never, {
    getLogger: () => pino({ level: "silent" }),
  } as never, {
    validateNoEvictionPolicy: async () => {},
  } as never, {
    start: () => {},
    stop: () => {},
  } as never, {
    start: () => {},
    stop: async () => {},
  } as never, {
    syncEnabledCronTriggers: async () => {},
  } as never);

  await server.start();

  const app = Reflect.get(server, "app");
  const address = app.server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/`);

  assert.equal(response.status, 404);

  await app.close();
});

test("ApiServer exposes a health endpoint", async () => {
  const server = new ApiServer({
    host: "127.0.0.1",
    port: 0,
    cors: {
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowed_headers: ["content-type", "authorization"],
    },
  } as never, {
    close: async () => {},
  } as never, {
    close: async () => {},
  } as never, {
    register: async () => {},
  } as never, {
    getLogger: () => pino({ level: "silent" }),
  } as never, {
    validateNoEvictionPolicy: async () => {},
  } as never, {
    start: () => {},
    stop: () => {},
  } as never, {
    start: () => {},
    stop: async () => {},
  } as never, {
    syncEnabledCronTriggers: async () => {},
  } as never);

  await server.start();

  const app = Reflect.get(server, "app");
  const address = app.server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });

  await app.close();
});

test("ApiServer health endpoint reports draining state", async () => {
  const server = new ApiServer({
    host: "127.0.0.1",
    port: 0,
    cors: {
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowed_headers: ["content-type", "authorization"],
    },
  } as never, {
    close: async () => {},
  } as never, {
    close: async () => {},
  } as never, {
    register: async () => {},
  } as never, {
    getLogger: () => pino({ level: "silent" }),
  } as never, {
    validateNoEvictionPolicy: async () => {},
  } as never, {
    start: () => {},
    stop: () => {},
  } as never, {
    start: () => {},
    stop: async () => {},
  } as never, {
    syncEnabledCronTriggers: async () => {},
  } as never);

  await server.start();

  Reflect.set(server, "isDraining", true);
  const app = Reflect.get(server, "app");
  const address = app.server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/health`);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: "draining" });

  await app.close();
});

test("ApiServer stop is idempotent and closes runtime dependencies once", async () => {
  const adminClose = vi.fn(async () => {});
  const databaseClose = vi.fn(async () => {});
  const environmentMetricsStop = vi.fn();
  const githubQueueClose = vi.fn(async () => {});
  const githubWorkerStop = vi.fn(async () => {});
  const llmOauthStop = vi.fn();
  const sessionStop = vi.fn(async () => {});
  const sessionTurnUsageQueueClose = vi.fn(async () => {});
  const sessionTurnUsageWorkerStop = vi.fn(async () => {});
  const scheduleQueueClose = vi.fn(async () => {});
  const scheduleStop = vi.fn(async () => {});
  const server = new ApiServer({
    host: "127.0.0.1",
    port: 0,
    cors: {
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowed_headers: ["content-type", "authorization"],
    },
  } as never, {
    close: adminClose,
  } as never, {
    close: databaseClose,
  } as never, {
    register: async () => {},
  } as never, {
    getLogger: () => pino({ level: "silent" }),
  } as never, {
    validateNoEvictionPolicy: async () => {},
  } as never, {
    start: () => {},
    stop: llmOauthStop,
  } as never, {
    start: () => {},
    stop: sessionStop,
  } as never, {
    syncEnabledCronTriggers: async () => {},
  } as never, {
    syncEnabledSchedules: async () => {},
  } as never, {
    close: scheduleQueueClose,
  } as never, {
    start: () => {},
    stop: scheduleStop,
  } as never, {
    register: () => {},
  } as never, {
    close: githubQueueClose,
  } as never, {
    register: () => {},
  } as never, {
    start: () => {},
    stop: githubWorkerStop,
  } as never, {
    register: () => {},
  } as never, {
    register: () => {},
  } as never, {
    start: () => {},
    stop: () => {},
  } as never, {
    async dispatchDueRequests() {
      return 0;
    },
  } as never, {
    async close() {},
  } as never, {
    start: () => {},
    stop: async () => {},
  } as never, {
    start: () => {},
    stop: () => {},
  } as never, {
    start: () => {},
    stop: environmentMetricsStop,
  } as never, {
    close: sessionTurnUsageQueueClose,
  } as never, {
    start: () => {},
    stop: sessionTurnUsageWorkerStop,
  } as never);

  await server.start();
  await Promise.all([server.stop(), server.stop()]);

  assert.equal(llmOauthStop.mock.calls.length, 1);
  assert.equal(githubWorkerStop.mock.calls.length, 1);
  assert.equal(sessionStop.mock.calls.length, 1);
  assert.equal(scheduleStop.mock.calls.length, 1);
  assert.equal(environmentMetricsStop.mock.calls.length, 1);
  assert.equal(sessionTurnUsageWorkerStop.mock.calls.length, 1);
  assert.equal(sessionTurnUsageQueueClose.mock.calls.length, 1);
  assert.equal(scheduleQueueClose.mock.calls.length, 1);
  assert.equal(githubQueueClose.mock.calls.length, 1);
  assert.equal(databaseClose.mock.calls.length, 1);
  assert.equal(adminClose.mock.calls.length, 1);
});

test("ApiServer fails startup before listening when the Redis queue policy is unsafe", async () => {
  const llmOauthRefreshWorker = {
    start: () => {},
    stop: () => {},
  };
  const sessionProcessWorker = {
    start: () => {},
    stop: async () => {},
  };
  const server = new ApiServer({
    host: "127.0.0.1",
    port: 0,
    cors: {
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      allowed_headers: ["content-type", "authorization"],
    },
  } as never, {
    close: async () => {},
  } as never, {
    close: async () => {},
  } as never, {
    register: async () => {},
  } as never, {
    getLogger: () => pino({ level: "silent" }),
  } as never, {
    validateNoEvictionPolicy: async () => {
      throw new Error('Redis maxmemory policy must be "noeviction" for BullMQ, got "volatile-lru".');
    },
  } as never,
    llmOauthRefreshWorker as never,
    sessionProcessWorker as never);

  await assert.rejects(
    () => server.start(),
    /Redis maxmemory policy must be "noeviction" for BullMQ/u,
  );
});
