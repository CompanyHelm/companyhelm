import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "vitest";
import { DbBootstrap } from "../src/db/bootstrap/bootstrap.ts";
import { ApiLogger } from "../src/log/api_logger.ts";

type LoggedEntry = {
  bindings: Record<string, unknown>;
  payload: Record<string, unknown>;
  message: string;
};

class DbBootstrapTestHarness {
  static createAdminDatabaseMock() {
    const sqlClient = async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ): Promise<Array<Record<string, unknown>>> => {
      const query = strings.join("?");
      if (query.includes("pg_try_advisory_lock")) {
        return [{
          locked: true,
        }];
      }

      if (query.includes("pg_advisory_unlock")) {
        return [];
      }

      throw new Error(`Unexpected SQL query: ${query} with values ${values.join(",")}`);
    };

    return {
      getSqlClient() {
        return sqlClient;
      },
    };
  }

  static createLoggerMock(loggedEntries: LoggedEntry[]): ApiLogger {
    return {
      child(bindings: Record<string, unknown>) {
        return {
          info(payload: Record<string, unknown>, message: string) {
            loggedEntries.push({
              bindings,
              payload,
              message,
            });
          },
        };
      },
    } as ApiLogger;
  }
}

/**
 * Verifies the bootstrap coordinator emits module lifecycle logs around each startup-only step so
 * local debugging makes progress and stalls obvious.
 */
test("DbBootstrap logs start, run, and completion for each bootstrap module", async () => {
  const loggedEntries: LoggedEntry[] = [];
  const runOrder: string[] = [];
  const dbBootstrap = new DbBootstrap(
    DbBootstrapTestHarness.createAdminDatabaseMock() as never,
    {
      async run() {
        runOrder.push("app_runtime_role");
      },
    },
    {
      async run() {
        runOrder.push("migration");
      },
    },
    DbBootstrapTestHarness.createLoggerMock(loggedEntries),
  );

  await dbBootstrap.run();

  assert.deepEqual(runOrder, ["app_runtime_role", "migration"]);
  assert.deepEqual(loggedEntries, [
    {
      bindings: {
        component: "db_bootstrap",
      },
      payload: {
        module: "app_runtime_role",
      },
      message: "starting db bootstrap module",
    },
    {
      bindings: {
        component: "db_bootstrap",
      },
      payload: {
        module: "app_runtime_role",
      },
      message: "running db bootstrap module",
    },
    {
      bindings: {
        component: "db_bootstrap",
      },
      payload: {
        module: "app_runtime_role",
      },
      message: "completed db bootstrap module",
    },
    {
      bindings: {
        component: "db_bootstrap",
      },
      payload: {
        module: "migration",
      },
      message: "starting db bootstrap module",
    },
    {
      bindings: {
        component: "db_bootstrap",
      },
      payload: {
        module: "migration",
      },
      message: "running db bootstrap module",
    },
    {
      bindings: {
        component: "db_bootstrap",
      },
      payload: {
        module: "migration",
      },
      message: "completed db bootstrap module",
    },
  ]);
});
