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
 * Verifies the bootstrap coordinator wraps migrations with runtime-role reconciliation so migrated
 * tables receive request-serving privileges before the API starts listening.
 */
test("DbBootstrap reconciles runtime role grants after migrations", async () => {
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

  assert.deepEqual(runOrder, ["app_runtime_role", "migration", "app_runtime_role"]);
  assert.deepEqual(
    loggedEntries
      .filter((entry) => entry.message === "running db bootstrap module")
      .map((entry) => entry.payload.module),
    ["app_runtime_role", "migration", "app_runtime_role_post_migration"],
  );
  assert.equal(
    loggedEntries.every((entry) => entry.bindings.component === "db_bootstrap"),
    true,
  );
});
