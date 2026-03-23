import assert from "node:assert/strict";
import { test } from "vitest";
import type { Sql } from "postgres";
import type { Config } from "../src/config/schema.ts";
import { AppRuntimeRoleBootstrapModule } from "../src/db/bootstrap/modules/app-runtime-role.ts";

/**
 * Creates the smallest callable SQL client surface needed to exercise the runtime-role bootstrap
 * module without opening a real Postgres connection.
 */
class AppRuntimeRoleBootstrapModuleTestSqlClientFactory {
  static create(params: {
    roleExists: boolean;
    executedStatements: string[];
  }): Sql {
    const sqlClient = Object.assign(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.reduce((statement, segment, index) => {
          const value = index < values.length ? String(values[index]) : "";
          return `${statement}${segment}${value}`;
        }, "");

        if (query.includes("SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname =")) {
          return [{
            exists: params.roleExists,
          }];
        }

        throw new Error(`Unexpected SQL query: ${query}`);
      },
      {
        async unsafe(statement: string) {
          params.executedStatements.push(statement);
          return [];
        },
      },
    );

    return sqlClient as unknown as Sql;
  }
}

/**
 * Builds a minimal runtime config document with only the fields used by the bootstrap module.
 */
class AppRuntimeRoleBootstrapModuleTestConfigFactory {
  static create(): Config {
    return {
      database: {
        roles: {
          app_runtime: {
            username: "app-runtime",
            password: "secret",
          },
        },
      },
    } as Config;
  }
}

test("app runtime role bootstrap module reconciles grants for an existing runtime role", async () => {
  const executedStatements: string[] = [];
  const sqlClient = AppRuntimeRoleBootstrapModuleTestSqlClientFactory.create({
    roleExists: true,
    executedStatements,
  });
  const bootstrapModule = new AppRuntimeRoleBootstrapModule(
    {
      getSqlClient() {
        return sqlClient;
      },
    } as never,
    AppRuntimeRoleBootstrapModuleTestConfigFactory.create(),
  );

  await bootstrapModule.run();

  assert.equal(
    executedStatements.some((statement) => statement.startsWith("CREATE ROLE ")),
    false,
  );
  assert.equal(
    executedStatements.includes("GRANT USAGE ON SCHEMA public TO \"app-runtime\""),
    true,
  );
  assert.equal(
    executedStatements.includes(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"app-runtime\"",
    ),
    true,
  );
});
