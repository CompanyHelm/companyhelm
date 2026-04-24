import assert from "node:assert/strict";
import { test } from "vitest";
import {
  agents,
  companyOnboardings,
  workflowDefinitions,
} from "../src/db/schema.ts";
import {
  type CompanyOnboardingRecord,
  CompanyOnboardingService,
} from "../src/services/onboarding/company_onboarding_service.ts";
import type { WorkflowRunRecord } from "../src/services/workflows/types.ts";

type CompanyOnboardingRow = CompanyOnboardingRecord;

type OnboardingWorkflowCall = {
  agentId: string;
  companyId: string;
  startedByUserId: string | null | undefined;
  workflowDefinitionId: string;
};

/**
 * Provides a compact in-memory transaction provider for the onboarding state machine so tests can
 * verify idempotency and workflow-start side effects without standing up Postgres or Redis.
 */
class CompanyOnboardingServiceTestHarness {
  private finalizeCount = 0;
  private readonly onboardingRows: CompanyOnboardingRow[];
  private readonly workflowCalls: OnboardingWorkflowCall[] = [];

  constructor(params: {
    onboardingRows?: CompanyOnboardingRow[];
  } = {}) {
    this.onboardingRows = [...(params.onboardingRows ?? [])];
  }

  buildService(): CompanyOnboardingService {
    return new CompanyOnboardingService({
      finalizeStartedWorkflowRun: async () => {
        this.finalizeCount += 1;
      },
      startWorkflowRunInTransaction: async (_tx, input) => {
        this.workflowCalls.push({
          agentId: input.agentId,
          companyId: input.companyId,
          startedByUserId: input.startedByUserId,
          workflowDefinitionId: input.workflowDefinitionId,
        });

        return {
          queuedSessionId: "session-1",
          workflowRun: this.createWorkflowRun("run-1", "session-1"),
        };
      },
    });
  }

  buildTransactionProvider() {
    const onboardingRows = this.onboardingRows;

    return {
      async transaction<T>(callback: (tx: unknown) => Promise<T>): Promise<T> {
        return callback({
          async execute() {
            return [];
          },
          insert(table: unknown) {
            return {
              values(value: Record<string, unknown>) {
                if (table !== companyOnboardings) {
                  throw new Error("Unexpected insert table.");
                }

                return {
                  onConflictDoNothing() {
                    if (!onboardingRows.some((row) => row.companyId === value.companyId)) {
                      onboardingRows.push({
                        agentId: value.agentId as string | null,
                        companyId: value.companyId as string,
                        completedAt: value.completedAt as Date | null,
                        createdAt: value.createdAt as Date,
                        sessionId: value.sessionId as string | null,
                        skippedAt: value.skippedAt as Date | null,
                        skippedByUserId: value.skippedByUserId as string | null,
                        startedAt: value.startedAt as Date | null,
                        status: value.status as CompanyOnboardingRow["status"],
                        updatedAt: value.updatedAt as Date,
                        workflowRunId: value.workflowRunId as string | null,
                      });
                    }

                    return {
                      async returning() {
                        return onboardingRows.slice(-1);
                      },
                    };
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
                    if (table === companyOnboardings) {
                      return [...onboardingRows];
                    }
                    if (table === agents) {
                      return [{ id: "agent-1" }];
                    }
                    if (table === workflowDefinitions) {
                      return [{ id: "workflow-1" }];
                    }

                    throw new Error("Unexpected select table.");
                  },
                };
              },
            };
          },
          update(table: unknown) {
            return {
              set(value: Record<string, unknown>) {
                return {
                  where() {
                    if (table !== companyOnboardings) {
                      throw new Error("Unexpected update table.");
                    }

                    const [onboarding] = onboardingRows;
                    if (onboarding) {
                      Object.assign(onboarding, value);
                    }

                    return {
                      async returning() {
                        return onboarding ? [onboarding] : [];
                      },
                    };
                  },
                };
              },
            };
          },
        });
      },
    };
  }

  listWorkflowCalls(): OnboardingWorkflowCall[] {
    return this.workflowCalls;
  }

  loadOnboarding(): CompanyOnboardingRow | null {
    return this.onboardingRows[0] ?? null;
  }

  getFinalizeCount(): number {
    return this.finalizeCount;
  }

  private createWorkflowRun(id: string, sessionId: string): WorkflowRunRecord {
    const now = new Date("2026-04-22T10:00:00.000Z");
    return {
      agentId: "agent-1",
      completedAt: null,
      createdAt: now,
      id,
      instructions: null,
      sessionId,
      source: "manual",
      startedAt: now,
      status: "running",
      steps: [],
      triggerId: null,
      updatedAt: now,
      workflowDefinitionId: "workflow-1",
    };
  }
}

test("CompanyOnboardingService starts onboarding once and stores the CEO workflow chat", async () => {
  const harness = new CompanyOnboardingServiceTestHarness();
  const service = harness.buildService();

  const onboarding = await service.ensureOnboarding(
    harness.buildTransactionProvider() as never,
    {
      companyId: "company-1",
      userId: "user-1",
    },
  );

  assert.equal(onboarding.status, "in_progress");
  assert.equal(onboarding.agentId, "agent-1");
  assert.equal(onboarding.sessionId, "session-1");
  assert.equal(onboarding.workflowRunId, "run-1");
  assert.deepEqual(harness.listWorkflowCalls(), [{
    agentId: "agent-1",
    companyId: "company-1",
    startedByUserId: "user-1",
    workflowDefinitionId: "workflow-1",
  }]);
  assert.equal(harness.getFinalizeCount(), 1);
});

test("CompanyOnboardingService creates and returns a not-started onboarding row when one does not exist", async () => {
  const harness = new CompanyOnboardingServiceTestHarness();
  const service = harness.buildService();

  const onboarding = await service.getOnboarding(
    harness.buildTransactionProvider() as never,
    "company-1",
  );

  assert.equal(onboarding.companyId, "company-1");
  assert.equal(onboarding.status, "not_started");
  assert.equal(onboarding.agentId, null);
  assert.equal(onboarding.sessionId, null);
  assert.equal(onboarding.workflowRunId, null);
  assert.equal(harness.loadOnboarding()?.status, "not_started");
});

test("CompanyOnboardingService returns an existing in-progress onboarding without starting another run", async () => {
  const now = new Date("2026-04-22T10:00:00.000Z");
  const harness = new CompanyOnboardingServiceTestHarness({
    onboardingRows: [{
      agentId: "agent-1",
      companyId: "company-1",
      completedAt: null,
      createdAt: now,
      sessionId: "session-1",
      skippedAt: null,
      skippedByUserId: null,
      startedAt: now,
      status: "in_progress",
      updatedAt: now,
      workflowRunId: "run-1",
    }],
  });
  const service = harness.buildService();

  const onboarding = await service.ensureOnboarding(
    harness.buildTransactionProvider() as never,
    {
      companyId: "company-1",
      userId: "user-1",
    },
  );

  assert.equal(onboarding.sessionId, "session-1");
  assert.deepEqual(harness.listWorkflowCalls(), []);
  assert.equal(harness.getFinalizeCount(), 1);
});

test("CompanyOnboardingService records skipped onboarding as company-level state", async () => {
  const now = new Date("2026-04-22T10:00:00.000Z");
  const harness = new CompanyOnboardingServiceTestHarness({
    onboardingRows: [{
      agentId: "agent-1",
      companyId: "company-1",
      completedAt: null,
      createdAt: now,
      sessionId: "session-1",
      skippedAt: null,
      skippedByUserId: null,
      startedAt: now,
      status: "in_progress",
      updatedAt: now,
      workflowRunId: "run-1",
    }],
  });
  const service = harness.buildService();

  const onboarding = await service.skipOnboarding(
    harness.buildTransactionProvider() as never,
    {
      companyId: "company-1",
      userId: "user-1",
    },
  );

  assert.equal(onboarding.status, "skipped");
  assert.equal(onboarding.skippedByUserId, "user-1");
  assert.ok(onboarding.skippedAt instanceof Date);
  assert.equal(harness.loadOnboarding()?.status, "skipped");
});
