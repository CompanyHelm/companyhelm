import assert from "node:assert/strict";
import { test } from "vitest";
import type { Config } from "../src/config/schema.ts";
import {
  computeProviderDefinitions,
  daytonaComputeProviderDefinitions,
  e2bComputeProviderDefinitions,
} from "../src/db/schema.ts";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import { CompanyHelmComputeProviderService } from "../src/services/compute_provider_definitions/companyhelm_service.ts";
import { ComputeProviderDefinitionService } from "../src/services/compute_provider_definitions/service.ts";

type BaseDefinitionRow = {
  companyId: string;
  createdAt: Date;
  description: string | null;
  id: string;
  isDefault: boolean;
  name: string;
  provider: "daytona" | "e2b";
  updatedAt: Date;
};

/**
 * Provides a narrow in-memory transaction surface so the compute provider definition service can be
 * exercised without a real database. The harness only implements the tables and operations covered
 * by these tests.
 */
class ComputeProviderDefinitionServiceTestHarness {
  private readonly baseDefinitions: BaseDefinitionRow[];
  private readonly daytonaDefinitions: Array<Record<string, unknown>>;
  private readonly e2bDefinitions: Array<Record<string, unknown>>;

  constructor(params?: {
    baseDefinitions?: BaseDefinitionRow[];
    daytonaDefinitions?: Array<Record<string, unknown>>;
    e2bDefinitions?: Array<Record<string, unknown>>;
  }) {
    this.baseDefinitions = [...(params?.baseDefinitions ?? [])];
    this.daytonaDefinitions = [...(params?.daytonaDefinitions ?? [])];
    this.e2bDefinitions = [...(params?.e2bDefinitions ?? [])];
  }

  buildService(): ComputeProviderDefinitionService {
    return new ComputeProviderDefinitionService(
      new CompanyHelmComputeProviderService({
        companyhelm: {
          e2b: {
            api_key: "e2b-local-api-key",
          },
        },
      } as Config),
      {
        decrypt(value: string) {
          return `decrypted:${value}`;
        },
        encrypt(value: string) {
          return {
            encryptedValue: `encrypted:${value}`,
            encryptionKeyId: "key-1",
          };
        },
      } as never,
    );
  }

  buildTransactionProvider(): TransactionProviderInterface {
    const baseDefinitions = this.baseDefinitions;
    const daytonaDefinitions = this.daytonaDefinitions;
    const e2bDefinitions = this.e2bDefinitions;

    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          delete(table: unknown) {
            return {
              async where() {
                if (table === computeProviderDefinitions) {
                  baseDefinitions.length = 0;
                }

                return undefined;
              },
            };
          },
          insert(table: unknown) {
            return {
              values(value: Record<string, unknown>) {
                if (table === computeProviderDefinitions) {
                  const row: BaseDefinitionRow = {
                    companyId: value.companyId as string,
                    createdAt: value.createdAt as Date,
                    description: value.description as string | null,
                    id: "companyhelm-definition-1",
                    isDefault: Boolean(value.isDefault),
                    name: value.name as string,
                    provider: value.provider as "daytona" | "e2b",
                    updatedAt: value.updatedAt as Date,
                  };
                  baseDefinitions.push(row);

                  return {
                    async returning() {
                      return [row];
                    },
                  };
                }

                return {
                  async returning() {
                    return [];
                  },
                };
              },
            };
          },
          update(table: unknown) {
            return {
              set(value: Record<string, unknown>) {
                return {
                  async where() {
                    if (table === computeProviderDefinitions && "isDefault" in value) {
                      baseDefinitions.forEach((row, index) => {
                        row.isDefault = value.isDefault === true ? index === (baseDefinitions.length - 1) : false;
                      });
                    }

                    return undefined;
                  },
                };
              },
            };
          },
          select() {
            return {
              from(table: unknown) {
                return {
                  async where() {
                    if (table === computeProviderDefinitions) {
                      return [...baseDefinitions];
                    }
                    if (table === daytonaComputeProviderDefinitions) {
                      return [...daytonaDefinitions];
                    }
                    if (table === e2bComputeProviderDefinitions) {
                      return [...e2bDefinitions];
                    }

                    return [];
                  },
                };
              },
            };
          },
        });
      },
    } as never;
  }
}

test("ComputeProviderDefinitionService seeds the CompanyHelm definition when a company has none", async () => {
  const harness = new ComputeProviderDefinitionServiceTestHarness();
  const service = harness.buildService();

  const definitions = await service.listDefinitions(
    harness.buildTransactionProvider(),
    "company-1",
  );

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0]?.name, "CompanyHelm");
  assert.equal(definitions[0]?.provider, "e2b");
  assert.equal(definitions[0]?.description, "Managed by CompanyHelm");
  assert.equal(definitions[0]?.e2b?.hasApiKey, true);
  assert.equal(definitions[0]?.isDefault, true);
});

test("ComputeProviderDefinitionService resolves CompanyHelm runtime credentials from config", async () => {
  const harness = new ComputeProviderDefinitionServiceTestHarness({
    baseDefinitions: [{
      companyId: "company-1",
      createdAt: new Date("2026-04-03T18:00:00.000Z"),
      description: "Managed by CompanyHelm",
      id: "companyhelm-definition-1",
      isDefault: true,
      name: "CompanyHelm",
      provider: "e2b",
      updatedAt: new Date("2026-04-03T18:00:00.000Z"),
    }],
  });
  const service = harness.buildService();

  const definition = await service.loadRuntimeDefinitionById(
    harness.buildTransactionProvider(),
    "company-1",
    "companyhelm-definition-1",
  );

  assert.deepEqual(definition, {
    apiKey: "e2b-local-api-key",
    companyId: "company-1",
    description: "Managed by CompanyHelm",
    id: "companyhelm-definition-1",
    name: "CompanyHelm",
    provider: "e2b",
  });
});

test("ComputeProviderDefinitionService blocks creating a manual CompanyHelm definition", async () => {
  const harness = new ComputeProviderDefinitionServiceTestHarness();
  const service = harness.buildService();

  await assert.rejects(
    service.createDefinition(harness.buildTransactionProvider(), {
      companyId: "company-1",
      createdByUserId: "user-1",
      description: "Reserved",
      e2b: {
        apiKey: "manual-e2b-api-key",
      },
      name: "CompanyHelm",
      provider: "e2b",
    }),
    /CompanyHelm compute provider is managed by the system\./,
  );
});

test("ComputeProviderDefinitionService blocks deleting the CompanyHelm definition", async () => {
  const harness = new ComputeProviderDefinitionServiceTestHarness({
    baseDefinitions: [{
      companyId: "company-1",
      createdAt: new Date("2026-04-03T18:00:00.000Z"),
      description: "Managed by CompanyHelm",
      id: "companyhelm-definition-1",
      isDefault: true,
      name: "CompanyHelm",
      provider: "e2b",
      updatedAt: new Date("2026-04-03T18:00:00.000Z"),
    }],
  });
  const service = harness.buildService();

  await assert.rejects(
    service.deleteDefinition(
      harness.buildTransactionProvider(),
      "company-1",
      "companyhelm-definition-1",
    ),
    /CompanyHelm compute provider is managed by the system\./,
  );
});
