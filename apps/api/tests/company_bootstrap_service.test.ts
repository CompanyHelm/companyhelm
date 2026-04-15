import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import {
  computeProviderDefinitions,
  taskStages,
} from "../src/db/schema.ts";
import { CompanyBootstrapService } from "../src/services/bootstrap/company.ts";
import { CompanyHelmComputeProviderService } from "../src/services/compute_provider_definitions/companyhelm_service.ts";

type BaseDefinitionRow = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  provider: "e2b";
  updatedAt: Date;
};

type TaskStageRow = {
  companyId: string;
  createdAt: Date;
  name: string;
  updatedAt: Date;
};

/**
 * Provides the narrow database surface needed to verify company default seeding without a real
 * database connection.
 */
class CompanyBootstrapServiceTestHarness {
  private readonly baseDefinitions: BaseDefinitionRow[];
  private readonly taskStageRows: TaskStageRow[];

  constructor(params?: {
    baseDefinitions?: BaseDefinitionRow[];
    taskStageRows?: TaskStageRow[];
  }) {
    this.baseDefinitions = [...(params?.baseDefinitions ?? [])];
    this.taskStageRows = [...(params?.taskStageRows ?? [])];
  }

  buildService(): CompanyBootstrapService {
    return new CompanyBootstrapService(
      new CompanyHelmComputeProviderService({
        companyhelm: {
          e2b: {
            api_key: "e2b-local-api-key",
          },
        },
      } as Config),
    );
  }

  buildTransaction() {
    const baseDefinitions = this.baseDefinitions;
    const taskStageRows = this.taskStageRows;

    return {
      insert(table: unknown) {
        return {
          values(value: Record<string, unknown>) {
            if (table === computeProviderDefinitions) {
              return {
                onConflictDoNothing() {
                  if (!baseDefinitions.some((row) => row.companyId === value.companyId && row.name === value.name)) {
                    baseDefinitions.push({
                      companyId: value.companyId as string,
                      createdAt: value.createdAt as Date,
                      description: value.description as string | null,
                      id: "companyhelm-definition-1",
                      isDefault: Boolean(value.isDefault),
                      name: value.name as string,
                      provider: value.provider as "e2b",
                      updatedAt: value.updatedAt as Date,
                    });
                  }

                  return this;
                },
              };
            }

            if (table === taskStages) {
              return {
                onConflictDoNothing() {
                  if (!taskStageRows.some((row) => {
                    return row.companyId === value.companyId
                      && row.name.toLowerCase() === String(value.name).toLowerCase();
                  })) {
                    taskStageRows.push({
                      companyId: value.companyId as string,
                      createdAt: value.createdAt as Date,
                      name: value.name as string,
                      updatedAt: value.updatedAt as Date,
                    });
                  }

                  return this;
                },
              };
            }

            throw new Error("Unexpected insert table.");
          },
        };
      },
      select() {
        return {
          from(table: unknown) {
            return {
              where(condition: unknown) {
                void condition;
                return {
                  async limit() {
                    if (table === computeProviderDefinitions) {
                      return [...baseDefinitions].slice(0, 1);
                    }

                    return [];
                  },
                };
              },
            };
          },
        };
      },
    };
  }

  listDefinitionNames(): string[] {
    return this.baseDefinitions.map((row) => row.name);
  }

  listTaskStageNames(): string[] {
    return this.taskStageRows.map((row) => row.name);
  }

  loadDefaultDefinition(): BaseDefinitionRow | null {
    return this.baseDefinitions[0] ?? null;
  }
}

test("CompanyBootstrapService seeds the CompanyHelm definition and default task stages", async () => {
  const harness = new CompanyBootstrapServiceTestHarness();
  const service = harness.buildService();

  await service.ensureCompanyDefaults(
    harness.buildTransaction() as never,
    "company-1",
  );

  const defaultDefinition = harness.loadDefaultDefinition();
  assert.equal(defaultDefinition?.name, "CompanyHelm");
  assert.equal(defaultDefinition?.description, "Managed by CompanyHelm");
  assert.equal(defaultDefinition?.provider, "e2b");
  assert.equal(defaultDefinition?.isDefault, true);
  assert.deepEqual(harness.listTaskStageNames(), ["Backlog", "TODO", "Archive"]);
});

test("CompanyBootstrapService does not duplicate seeded defaults when rerun", async () => {
  const now = new Date("2026-04-03T18:00:00.000Z");
  const harness = new CompanyBootstrapServiceTestHarness({
    baseDefinitions: [{
      companyId: "company-1",
      createdAt: now,
      description: "Managed by CompanyHelm",
      id: "companyhelm-definition-1",
      isDefault: true,
      name: "CompanyHelm",
      provider: "e2b",
      updatedAt: now,
    }],
    taskStageRows: [{
      companyId: "company-1",
      createdAt: now,
      name: "Backlog",
      updatedAt: now,
    }, {
      companyId: "company-1",
      createdAt: now,
      name: "TODO",
      updatedAt: now,
    }, {
      companyId: "company-1",
      createdAt: now,
      name: "Archive",
      updatedAt: now,
    }],
  });
  const service = harness.buildService();

  await service.ensureCompanyDefaults(
    harness.buildTransaction() as never,
    "company-1",
  );

  assert.deepEqual(harness.listDefinitionNames(), ["CompanyHelm"]);
  assert.deepEqual(harness.listTaskStageNames(), ["Backlog", "TODO", "Archive"]);
});
