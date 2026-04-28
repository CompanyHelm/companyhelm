import assert from "node:assert/strict";
import { test } from "vitest";
import { agentSessions, agents, platformModelRoutes, platformModels } from "../src/db/schema.ts";
import { DeletePlatformModelMutation } from "../src/graphql/mutations/delete_platform_model.ts";

type PlatformModelRow = {
  createdAt: Date;
  description: string;
  id: string;
  isAvailable: boolean;
  isDefault: boolean;
  key: string;
  modelId: string;
  modelProvider: string;
  name: string;
  reasoningLevels: string[] | null;
  reasoningSupported: boolean;
  updatedAt: Date;
};

type AgentRow = {
  defaultPlatformModelId: string | null;
  id: string;
  name: string;
  updated_at: Date;
};

type SessionRow = {
  currentPlatformModelId: string | null;
  currentPlatformModelProviderCredentialModelId: string | null;
  id: string;
  updated_at: Date;
};

type RouteRow = {
  platformModelId: string;
  platformModelProviderCredentialModelId: string;
};

/**
 * Exercises the platform model deletion transaction without a live database. The harness models
 * the exact FK-sensitive references that must be rewritten before Postgres can delete the row.
 */
class DeletePlatformModelMutationHarness {
  private readonly targetModelId: string;
  private readonly replacementModelId: string | null;
  private readonly modelRows: PlatformModelRow[];
  private readonly agentRows: AgentRow[];
  private readonly sessionRows: SessionRow[];
  private readonly routeRows: RouteRow[];
  private readonly deletedModelIds: string[];
  private modelSelectCount: number;

  constructor(input: {
    agentRows?: AgentRow[];
    modelRows: PlatformModelRow[];
    replacementModelId?: string | null;
    routeRows?: RouteRow[];
    sessionRows?: SessionRow[];
    targetModelId: string;
  }) {
    this.targetModelId = input.targetModelId;
    this.replacementModelId = input.replacementModelId ?? null;
    this.modelRows = input.modelRows.map((modelRow) => ({ ...modelRow }));
    this.agentRows = (input.agentRows ?? []).map((agentRow) => ({ ...agentRow }));
    this.sessionRows = (input.sessionRows ?? []).map((sessionRow) => ({ ...sessionRow }));
    this.routeRows = (input.routeRows ?? []).map((routeRow) => ({ ...routeRow }));
    this.deletedModelIds = [];
    this.modelSelectCount = 0;
  }

  getContext() {
    return {
      authSession: {
        user: {
          isPlatformAdmin: true,
        },
      },
      app_runtime_transaction_provider: {
        transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
          return callback(this.createTransaction());
        },
      },
    } as never;
  }

  getAgents(): AgentRow[] {
    return this.agentRows;
  }

  getDeletedModelIds(): string[] {
    return this.deletedModelIds;
  }

  getSessions(): SessionRow[] {
    return this.sessionRows;
  }

  private createTransaction() {
    return {
      async execute() {
        return undefined;
      },
      delete: (table: unknown) => ({
        where: async () => {
          if (table !== platformModels) {
            return;
          }

          const modelIndex = this.modelRows.findIndex((modelRow) => modelRow.id === this.targetModelId);
          if (modelIndex < 0) {
            return;
          }

          const [deletedModel] = this.modelRows.splice(modelIndex, 1);
          if (deletedModel) {
            this.deletedModelIds.push(deletedModel.id);
          }
        },
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: async () => {
            if (table === platformModels) {
              this.modelSelectCount += 1;
              const modelId = this.modelSelectCount === 1 ? this.targetModelId : this.replacementModelId;
              return this.modelRows.filter((modelRow) => modelRow.id === modelId);
            }
            if (table === agents) {
              return this.agentRows.filter((agentRow) => agentRow.defaultPlatformModelId === this.targetModelId);
            }
            if (table === agentSessions) {
              return this.sessionRows.filter((sessionRow) => sessionRow.currentPlatformModelId === this.targetModelId);
            }
            if (table === platformModelRoutes) {
              return this.routeRows.filter((routeRow) => routeRow.platformModelId === this.replacementModelId);
            }

            return [];
          },
        }),
      }),
      update: (table: unknown) => ({
        set: (value: Record<string, unknown>) => ({
          where: async () => {
            if (table === agents) {
              this.agentRows
                .filter((agentRow) => agentRow.defaultPlatformModelId === this.targetModelId)
                .forEach((agentRow) => {
                  agentRow.defaultPlatformModelId = String(value.defaultPlatformModelId);
                  agentRow.updated_at = value.updated_at as Date;
                });
              return;
            }
            if (table === agentSessions) {
              this.sessionRows
                .filter((sessionRow) => sessionRow.currentPlatformModelId === this.targetModelId)
                .forEach((sessionRow) => {
                  sessionRow.currentPlatformModelId = String(value.currentPlatformModelId);
                  sessionRow.currentPlatformModelProviderCredentialModelId = String(
                    value.currentPlatformModelProviderCredentialModelId,
                  );
                  sessionRow.updated_at = value.updated_at as Date;
                });
            }
          },
        }),
      }),
    };
  }
}

function createPlatformModel(overrides: Partial<PlatformModelRow>): PlatformModelRow {
  return {
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    description: "",
    id: "platform-model-1",
    isAvailable: true,
    isDefault: false,
    key: "companyhelm:gpt-5",
    modelId: "gpt-5",
    modelProvider: "companyhelm",
    name: "GPT-5",
    reasoningLevels: ["medium", "high"],
    reasoningSupported: true,
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
    ...overrides,
  };
}

test("DeletePlatformModelMutation blocks deleting a model used by agents without a replacement", async () => {
  const harness = new DeletePlatformModelMutationHarness({
    agentRows: [{
      defaultPlatformModelId: "platform-model-1",
      id: "agent-1",
      name: "QA Engineer",
      updated_at: new Date("2026-04-01T10:00:00.000Z"),
    }],
    modelRows: [createPlatformModel({})],
    targetModelId: "platform-model-1",
  });
  const mutation = new DeletePlatformModelMutation();

  await assert.rejects(
    mutation.execute(
      null,
      {
        input: {
          id: "platform-model-1",
        },
      },
      harness.getContext(),
    ),
    new Error("This platform model is still used by agents or existing sessions. Select a replacement model before deleting it."),
  );
  assert.deepEqual(harness.getDeletedModelIds(), []);
});

test("DeletePlatformModelMutation backfills affected agents and sessions before deleting", async () => {
  const harness = new DeletePlatformModelMutationHarness({
    agentRows: [{
      defaultPlatformModelId: "platform-model-1",
      id: "agent-1",
      name: "QA Engineer",
      updated_at: new Date("2026-04-01T10:00:00.000Z"),
    }],
    modelRows: [
      createPlatformModel({ id: "platform-model-1", key: "companyhelm:gpt-5", name: "GPT-5" }),
      createPlatformModel({ id: "platform-model-2", key: "companyhelm:gpt-5.1", modelId: "gpt-5.1", name: "GPT-5.1" }),
    ],
    replacementModelId: "platform-model-2",
    routeRows: [{
      platformModelId: "platform-model-2",
      platformModelProviderCredentialModelId: "credential-model-2",
    }],
    sessionRows: [{
      currentPlatformModelId: "platform-model-1",
      currentPlatformModelProviderCredentialModelId: "credential-model-1",
      id: "session-1",
      updated_at: new Date("2026-04-01T10:00:00.000Z"),
    }],
    targetModelId: "platform-model-1",
  });
  const mutation = new DeletePlatformModelMutation();

  const deletedModel = await mutation.execute(
    null,
    {
      input: {
        id: "platform-model-1",
        replacementPlatformModelId: "platform-model-2",
      },
    },
    harness.getContext(),
  );

  assert.equal(deletedModel.id, "platform-model-1");
  assert.equal(deletedModel.agentCount, 1);
  assert.equal(deletedModel.sessionCount, 1);
  assert.deepEqual(harness.getDeletedModelIds(), ["platform-model-1"]);
  assert.equal(harness.getAgents()[0]?.defaultPlatformModelId, "platform-model-2");
  assert.equal(harness.getSessions()[0]?.currentPlatformModelId, "platform-model-2");
  assert.equal(harness.getSessions()[0]?.currentPlatformModelProviderCredentialModelId, "credential-model-2");
});
