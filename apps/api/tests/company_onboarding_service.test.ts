import assert from "node:assert/strict";
import { test } from "vitest";
import {
  agents,
  companyGithubInstallations,
  companyOnboardings,
  modelProviderCredentials,
  workflowDefinitions,
} from "../src/db/schema.ts";
import {
  type CompanyOnboardingRecord,
  CompanyOnboardingService,
} from "../src/services/onboarding/company_onboarding_service.ts";
import type { WorkflowRunInputValue, WorkflowRunRecord } from "../src/services/workflows/types.ts";

type CompanyOnboardingRow = CompanyOnboardingRecord;

type ModelCredentialRow = {
  id: string;
};

type OnboardingWorkflowCall = {
  agentId: string;
  companyId: string;
  inputValues: WorkflowRunInputValue[];
  startedByUserId: string | null | undefined;
  workflowDefinitionId: string;
};

/**
 * Provides a compact in-memory transaction provider for the onboarding state machine so tests can
 * verify static step persistence, gating, and workflow-start side effects without Postgres.
 */
class CompanyOnboardingServiceTestHarness {
  private ensureOnboardingAssetsCalls: Array<{
    companyId: string;
    llmSetupStatus: CompanyOnboardingRow["llmSetupStatus"];
  }> = [];
  private finalizeCount = 0;
  private readonly githubInstallations: Array<{ companyId: string }>;
  private readonly modelCredentials: ModelCredentialRow[];
  private readonly onboardingRows: CompanyOnboardingRow[];
  private readonly workflowCalls: OnboardingWorkflowCall[] = [];

  constructor(params: {
    githubInstallations?: Array<{ companyId: string }>;
    modelCredentials?: ModelCredentialRow[];
    onboardingRows?: CompanyOnboardingRow[];
  } = {}) {
    this.githubInstallations = [...(params.githubInstallations ?? [])];
    this.modelCredentials = [...(params.modelCredentials ?? [])];
    this.onboardingRows = [...(params.onboardingRows ?? [])];
  }

  buildService(): CompanyOnboardingService {
    return new CompanyOnboardingService(
      {
        finalizeStartedWorkflowRun: async () => {
          this.finalizeCount += 1;
        },
        startWorkflowRunInTransaction: async (_tx, input) => {
          this.workflowCalls.push({
            agentId: input.agentId,
            companyId: input.companyId,
            inputValues: input.inputValues,
            startedByUserId: input.startedByUserId,
            workflowDefinitionId: input.workflowDefinitionId,
          });

          return {
            queuedSessionId: "queued-session-1",
            workflowRun: this.createWorkflowRun("run-1", "session-1"),
          };
        },
      },
      {
        ensureOnboardingAssets: async (_tx, input) => {
          this.ensureOnboardingAssetsCalls.push({
            companyId: input.companyId,
            llmSetupStatus: input.llmSetupStatus,
          });
        },
      },
    );
  }

  buildTransactionProvider() {
    const githubInstallations = this.githubInstallations;
    const modelCredentials = this.modelCredentials;
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
                        companyMission: value.companyMission as string | null,
                        companyId: value.companyId as string,
                        completedAt: value.completedAt as Date | null,
                        createdAt: value.createdAt as Date,
                        githubCompletedAt: value.githubCompletedAt as Date | null,
                        githubSetupStatus: value.githubSetupStatus as CompanyOnboardingRow["githubSetupStatus"],
                        githubSkippedAt: value.githubSkippedAt as Date | null,
                        llmCompletedAt: value.llmCompletedAt as Date | null,
                        llmSetupStatus: value.llmSetupStatus as CompanyOnboardingRow["llmSetupStatus"],
                        llmSkippedAt: value.llmSkippedAt as Date | null,
                        missionSkippedAt: value.missionSkippedAt as Date | null,
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
                  where() {
                    if (table === companyOnboardings) {
                      return Promise.resolve([...onboardingRows]);
                    }
                    if (table === agents) {
                      return Promise.resolve([{ id: "agent-1" }]);
                    }
                    if (table === workflowDefinitions) {
                      return Promise.resolve([{ id: "workflow-1" }]);
                    }
                    return {
                      async limit() {
                        if (table === companyGithubInstallations) {
                          return githubInstallations.length > 0 ? [{ id: "company-1" }] : [];
                        }
                        if (table === modelProviderCredentials) {
                          return modelCredentials.slice(0, 1).map((credential) => ({
                            id: credential.id,
                          }));
                        }
                        return [];
                      },
                    };
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

  getFinalizeCount(): number {
    return this.finalizeCount;
  }

  listEnsureOnboardingAssetCalls(): Array<{
    companyId: string;
    llmSetupStatus: CompanyOnboardingRow["llmSetupStatus"];
  }> {
    return this.ensureOnboardingAssetsCalls;
  }

  loadOnboarding(): CompanyOnboardingRow | null {
    return this.onboardingRows[0] ?? null;
  }

  listWorkflowCalls(): OnboardingWorkflowCall[] {
    return this.workflowCalls;
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

test("CompanyOnboardingService creates a default onboarding row with pending setup steps", async () => {
  const harness = new CompanyOnboardingServiceTestHarness();
  const service = harness.buildService();

  const onboarding = await service.getOnboarding(
    harness.buildTransactionProvider() as never,
    "company-1",
  );

  assert.equal(onboarding.companyId, "company-1");
  assert.equal(onboarding.status, "not_started");
  assert.equal(onboarding.companyMission, null);
  assert.equal(onboarding.githubSetupStatus, "pending");
  assert.equal(onboarding.llmSetupStatus, "pending");
  assert.equal(onboarding.agentId, null);
});

test("CompanyOnboardingService saves static setup choices before the CEO chat starts", async () => {
  const harness = new CompanyOnboardingServiceTestHarness({
    githubInstallations: [{ companyId: "company-1" }],
    modelCredentials: [{ id: "credential-1" }],
  });
  const service = harness.buildService();

  await service.getOnboarding(harness.buildTransactionProvider() as never, "company-1");
  await service.updateSetup(harness.buildTransactionProvider() as never, {
    companyId: "company-1",
    companyMission: "Ship AI operators for agency teams.",
  });
  await service.updateSetup(harness.buildTransactionProvider() as never, {
    companyId: "company-1",
    githubSetupStatus: "completed",
  });
  const onboarding = await service.updateSetup(harness.buildTransactionProvider() as never, {
    companyId: "company-1",
    llmSetupStatus: "third_party",
  });

  assert.equal(onboarding.companyMission, "Ship AI operators for agency teams.");
  assert.equal(onboarding.githubSetupStatus, "completed");
  assert.equal(onboarding.llmSetupStatus, "third_party");
  assert.ok(onboarding.githubCompletedAt instanceof Date);
  assert.ok(onboarding.llmCompletedAt instanceof Date);
});

test("CompanyOnboardingService requires a company LLM credential before marking third-party setup complete", async () => {
  const harness = new CompanyOnboardingServiceTestHarness();
  const service = harness.buildService();

  await service.getOnboarding(harness.buildTransactionProvider() as never, "company-1");

  await assert.rejects(
    service.updateSetup(harness.buildTransactionProvider() as never, {
      companyId: "company-1",
      llmSetupStatus: "third_party",
    }),
    /Add a third-party model provider credential before continuing/,
  );
  assert.equal(harness.loadOnboarding()?.llmSetupStatus, "pending");
});

test("CompanyOnboardingService resolves first-run static setup defaults before CEO provisioning", async () => {
  const harness = new CompanyOnboardingServiceTestHarness();
  const service = harness.buildService();

  await service.getOnboarding(harness.buildTransactionProvider() as never, "company-1");

  const onboarding = await service.ensureOnboarding(
    harness.buildTransactionProvider() as never,
    {
      companyId: "company-1",
      userId: "user-1",
    },
  );

  assert.equal(onboarding.status, "in_progress");
  assert.equal(onboarding.companyMission, null);
  assert.equal(onboarding.githubSetupStatus, "skipped");
  assert.equal(onboarding.llmSetupStatus, "skipped");
  assert.ok(onboarding.missionSkippedAt instanceof Date);
  assert.ok(onboarding.githubSkippedAt instanceof Date);
  assert.ok(onboarding.llmSkippedAt instanceof Date);
  assert.deepEqual(harness.listEnsureOnboardingAssetCalls(), [{
    companyId: "company-1",
    llmSetupStatus: "skipped",
  }]);
  assert.deepEqual(harness.listWorkflowCalls()[0]?.inputValues, []);
});

test("CompanyOnboardingService starts the CEO workflow without static setup input values", async () => {
  const harness = new CompanyOnboardingServiceTestHarness({
    githubInstallations: [{ companyId: "company-1" }],
    modelCredentials: [{
      id: "credential-1",
    }],
    onboardingRows: [{
      agentId: null,
      companyMission: "Help agencies deploy repo-aware delivery agents.",
      companyId: "company-1",
      completedAt: null,
      createdAt: new Date("2026-04-22T10:00:00.000Z"),
      githubCompletedAt: new Date("2026-04-22T10:05:00.000Z"),
      githubSetupStatus: "completed",
      githubSkippedAt: null,
      llmCompletedAt: new Date("2026-04-22T10:06:00.000Z"),
      llmSetupStatus: "third_party",
      llmSkippedAt: null,
      missionSkippedAt: null,
      sessionId: null,
      skippedAt: null,
      skippedByUserId: null,
      startedAt: null,
      status: "not_started",
      updatedAt: new Date("2026-04-22T10:06:00.000Z"),
      workflowRunId: null,
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

  assert.equal(onboarding.status, "in_progress");
  assert.equal(onboarding.agentId, "agent-1");
  assert.equal(onboarding.sessionId, "session-1");
  assert.equal(onboarding.workflowRunId, "run-1");
  assert.deepEqual(harness.listEnsureOnboardingAssetCalls(), [{
    companyId: "company-1",
    llmSetupStatus: "third_party",
  }]);
  assert.deepEqual(harness.listWorkflowCalls(), [{
    agentId: "agent-1",
    companyId: "company-1",
    inputValues: [],
    startedByUserId: "user-1",
    workflowDefinitionId: "workflow-1",
  }]);
  assert.equal(harness.getFinalizeCount(), 1);
});

test("CompanyOnboardingService returns existing in-progress onboarding without finalizing again", async () => {
  const harness = new CompanyOnboardingServiceTestHarness({
    onboardingRows: [{
      agentId: "agent-1",
      companyMission: null,
      companyId: "company-1",
      completedAt: null,
      createdAt: new Date("2026-04-22T10:00:00.000Z"),
      githubCompletedAt: null,
      githubSetupStatus: "skipped",
      githubSkippedAt: new Date("2026-04-22T10:05:00.000Z"),
      llmCompletedAt: null,
      llmSetupStatus: "skipped",
      llmSkippedAt: new Date("2026-04-22T10:06:00.000Z"),
      missionSkippedAt: new Date("2026-04-22T10:07:00.000Z"),
      sessionId: "session-1",
      skippedAt: null,
      skippedByUserId: null,
      startedAt: new Date("2026-04-22T10:08:00.000Z"),
      status: "in_progress",
      updatedAt: new Date("2026-04-22T10:08:00.000Z"),
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

  assert.equal(onboarding.status, "in_progress");
  assert.equal(onboarding.sessionId, "session-1");
  assert.deepEqual(harness.listEnsureOnboardingAssetCalls(), []);
  assert.deepEqual(harness.listWorkflowCalls(), []);
  assert.equal(harness.getFinalizeCount(), 0);
});

test("CompanyOnboardingService starts the CEO workflow when mission is skipped", async () => {
  const harness = new CompanyOnboardingServiceTestHarness({
    githubInstallations: [{ companyId: "company-1" }],
    modelCredentials: [{
      id: "credential-1",
    }],
    onboardingRows: [{
      agentId: null,
      companyMission: null,
      companyId: "company-1",
      completedAt: null,
      createdAt: new Date("2026-04-22T10:00:00.000Z"),
      githubCompletedAt: null,
      githubSetupStatus: "skipped",
      githubSkippedAt: new Date("2026-04-22T10:05:00.000Z"),
      llmCompletedAt: null,
      llmSetupStatus: "skipped",
      llmSkippedAt: new Date("2026-04-22T10:06:00.000Z"),
      missionSkippedAt: new Date("2026-04-22T10:07:00.000Z"),
      sessionId: null,
      skippedAt: null,
      skippedByUserId: null,
      startedAt: null,
      status: "not_started",
      updatedAt: new Date("2026-04-22T10:07:00.000Z"),
      workflowRunId: null,
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

  assert.equal(onboarding.status, "in_progress");
  assert.deepEqual(harness.listWorkflowCalls()[0]?.inputValues, []);
});
