import "reflect-metadata";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "vitest";
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
    start: () => {},
    stop: () => {},
  } as never, {
    start: () => {},
    stop: async () => {},
  } as never);

  await server.start();

  const app = Reflect.get(server, "app");
  const address = app.server.address() as AddressInfo;
  const response = await fetch(`http://127.0.0.1:${address.port}/`);

  assert.equal(response.status, 404);

  await app.close();
});

