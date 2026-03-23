import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
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
