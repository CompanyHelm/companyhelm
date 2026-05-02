import { and, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  companyGithubInstallations,
  companyOnboardings,
  modelProviderCredentials,
  platformModelRoutes,
  workflowDefinitions,
} from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { CompanyBootstrapService } from "../bootstrap/company.ts";
import { WorkflowService } from "../workflows/service.ts";
import type { WorkflowRunCreateInput, WorkflowRunInputValue, WorkflowRunRecord } from "../workflows/types.ts";

export type CompanyOnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";
export type CompanyOnboardingSetupStatus = "pending" | "completed" | "skipped";
export type CompanyOnboardingLlmSetupStatus = "pending" | "third_party" | "company_managed" | "skipped";

export type CompanyOnboardingRecord = {
  agentId: string | null;
  companyMission: string | null;
  companyId: string;
  completedAt: Date | null;
  createdAt: Date;
  githubCompletedAt: Date | null;
  githubSetupStatus: CompanyOnboardingSetupStatus;
  githubSkippedAt: Date | null;
  llmCompletedAt: Date | null;
  llmSetupStatus: CompanyOnboardingLlmSetupStatus;
  llmSkippedAt: Date | null;
  missionSkippedAt: Date | null;
  sessionId: string | null;
  skippedAt: Date | null;
  skippedByUserId: string | null;
  startedAt: Date | null;
  status: CompanyOnboardingStatus;
  updatedAt: Date;
  workflowRunId: string | null;
};

type CompanyOnboardingWorkflowService = {
  finalizeStartedWorkflowRun(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ): Promise<void>;
  startWorkflowRunInTransaction(
    tx: AppRuntimeTransaction,
    input: WorkflowRunCreateInput,
  ): Promise<{
    queuedSessionId: string;
    workflowRun: WorkflowRunRecord;
  }>;
};

type CompanyOnboardingBootstrapService = {
  ensureOnboardingAssets(
    tx: AppRuntimeTransaction,
    input: {
      companyId: string;
      llmSetupStatus: CompanyOnboardingLlmSetupStatus;
    },
  ): Promise<AgentRow>;
};

type CompanyOnboardingRow = CompanyOnboardingRecord;

type AgentRow = {
  id: string;
};

type WorkflowRow = {
  id: string;
};

type ExistenceRow = {
  id: string;
};

type InsertableOnboardingDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoNothing(): {
        returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
      };
      returning?(selection?: Record<string, unknown>): Promise<unknown[]>;
    };
  };
};

/**
 * Owns the company-level onboarding state machine while deliberately leaving the actual guidance
 * work in the existing Operator chat and workflow runtime. The service only records whether a company
 * should be focused into onboarding and which durable chat/workflow represents that process.
 */
@injectable()
export class CompanyOnboardingService {
  constructor(
    @inject(WorkflowService)
    private readonly workflowService: CompanyOnboardingWorkflowService =
      CompanyOnboardingService.createMissingWorkflowService(),
    @inject(CompanyBootstrapService)
    private readonly companyBootstrapService: CompanyOnboardingBootstrapService =
      CompanyOnboardingService.createMissingBootstrapService(),
  ) {}

  async getOnboarding(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<CompanyOnboardingRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.ensureDefaultOnboardingInTransaction(tx, companyId);
    });
  }

  async ensureDefaultOnboardingInTransaction(
    tx: AppRuntimeTransaction,
    companyId: string,
  ): Promise<CompanyOnboardingRecord> {
    const existingOnboarding = await this.findOnboardingRow(tx, companyId);
    if (existingOnboarding) {
      return existingOnboarding;
    }

    const now = new Date();
    const insertResult = await ((tx as unknown as InsertableOnboardingDatabase)
      .insert(companyOnboardings)
      .values({
        agentId: null,
        companyMission: null,
        companyId,
        completedAt: null,
        createdAt: now,
        githubCompletedAt: null,
        githubSetupStatus: "pending",
        githubSkippedAt: null,
        llmCompletedAt: null,
        llmSetupStatus: "pending",
        llmSkippedAt: null,
        missionSkippedAt: null,
        sessionId: null,
        skippedAt: null,
        skippedByUserId: null,
        startedAt: null,
        status: "not_started",
        updatedAt: now,
        workflowRunId: null,
      })
      .onConflictDoNothing()
      .returning?.(this.selection()) ?? Promise.resolve([])) as CompanyOnboardingRow[];
    const createdOnboarding = insertResult[0] ?? await this.findOnboardingRow(tx, companyId);
    if (!createdOnboarding) {
      throw new Error("Failed to provision company onboarding.");
    }

    return createdOnboarding;
  }

  async updateSetup(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      companyMission?: string | null;
      githubSetupStatus?: CompanyOnboardingSetupStatus | null;
      llmSetupStatus?: CompanyOnboardingLlmSetupStatus | null;
      skipMission?: boolean | null;
    },
  ): Promise<CompanyOnboardingRecord> {
    return transactionProvider.transaction(async (tx) => {
      await this.acquireCompanyLock(tx, input.companyId);
      const existingOnboarding = await this.ensureDefaultOnboardingInTransaction(tx, input.companyId);
      if (existingOnboarding.status === "completed" || existingOnboarding.status === "skipped") {
        return existingOnboarding;
      }

      const values: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      let hasChanges = false;

      if (input.skipMission) {
        values.companyMission = null;
        values.missionSkippedAt = new Date();
        hasChanges = true;
      } else if (input.companyMission !== undefined) {
        const companyMission = input.companyMission;
        if (companyMission === null || !companyMission.trim()) {
          throw new Error("Company mission is required unless the step is skipped.");
        }

        values.companyMission = companyMission;
        values.missionSkippedAt = null;
        hasChanges = true;
      }

      if (input.githubSetupStatus && input.githubSetupStatus !== "pending") {
        if (input.githubSetupStatus === "completed") {
          const hasLinkedGithubInstallation = await this.hasLinkedGithubInstallation(tx, input.companyId);
          if (!hasLinkedGithubInstallation) {
            throw new Error("Connect a GitHub installation before continuing.");
          }

          values.githubCompletedAt = new Date();
          values.githubSetupStatus = "completed";
          values.githubSkippedAt = null;
        } else {
          values.githubCompletedAt = null;
          values.githubSetupStatus = "skipped";
          values.githubSkippedAt = new Date();
        }
        hasChanges = true;
      }

      if (input.llmSetupStatus && input.llmSetupStatus !== "pending") {
        if (input.llmSetupStatus === "third_party") {
          const hasThirdPartyCredential = await this.hasThirdPartyCredential(tx, input.companyId);
          if (!hasThirdPartyCredential) {
            throw new Error("Add a third-party model provider credential before continuing.");
          }
        }
        if (input.llmSetupStatus === "company_managed" && !await this.hasCompanyManagedPlatformModel(tx)) {
          throw new Error("Add an LLM provider credential before continuing.");
        }
        if (input.llmSetupStatus === "skipped") {
          values.llmCompletedAt = null;
          values.llmSkippedAt = new Date();
        } else {
          values.llmCompletedAt = new Date();
          values.llmSkippedAt = null;
        }
        values.llmSetupStatus = input.llmSetupStatus;
        hasChanges = true;
      }

      if (!hasChanges) {
        return existingOnboarding;
      }

      const [updatedOnboarding] = await tx
        .update(companyOnboardings)
        .set(values)
        .where(eq(companyOnboardings.companyId, input.companyId))
        .returning(this.selection()) as CompanyOnboardingRow[];
      if (!updatedOnboarding) {
        throw new Error("Failed to update company onboarding.");
      }

      return updatedOnboarding;
    });
  }

  async ensureOnboarding(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      userId: string;
    },
  ): Promise<CompanyOnboardingRecord> {
    let startedSessionId: string | null = null;
    const onboarding = await transactionProvider.transaction(async (tx) => {
      await this.acquireCompanyLock(tx, input.companyId);
      const existingOnboarding = await this.ensureDefaultOnboardingInTransaction(tx, input.companyId);
      if (existingOnboarding.status === "completed" || existingOnboarding.status === "skipped") {
        return existingOnboarding;
      }
      if (
        existingOnboarding.status === "in_progress"
        && existingOnboarding.agentId
        && existingOnboarding.sessionId
        && existingOnboarding.workflowRunId
      ) {
        return existingOnboarding;
      }
      const onboardingReadyForChat = await this.ensureDirectSetupResolved(tx, existingOnboarding);

      const agent = await this.companyBootstrapService.ensureOnboardingAssets(tx, {
        companyId: input.companyId,
        llmSetupStatus: onboardingReadyForChat.llmSetupStatus,
      });
      const workflow = await this.requireSeedWorkflow(tx, input.companyId);
      const startedRun = await this.workflowService.startWorkflowRunInTransaction(tx, {
        agentId: agent.id,
        companyId: input.companyId,
        inputValues: this.createWorkflowInputValues(onboardingReadyForChat),
        startedByUserId: input.userId,
        workflowDefinitionId: workflow.id,
      });
      startedSessionId = startedRun.queuedSessionId;

      return this.markOnboardingStarted(tx, {
        agentId: agent.id,
        companyId: input.companyId,
        sessionId: startedRun.workflowRun.sessionId,
        workflowRunId: startedRun.workflowRun.id,
      });
    });

    if (startedSessionId) {
      await this.workflowService.finalizeStartedWorkflowRun(transactionProvider, input.companyId, startedSessionId);
    }

    return onboarding;
  }

  async skipOnboarding(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      userId: string;
    },
  ): Promise<CompanyOnboardingRecord> {
    return transactionProvider.transaction(async (tx) => {
      const existingOnboarding = await this.ensureDefaultOnboardingInTransaction(tx, input.companyId);
      if (existingOnboarding.status === "completed" || existingOnboarding.status === "skipped") {
        return existingOnboarding;
      }

      const now = new Date();
      const [updatedOnboarding] = await tx
        .update(companyOnboardings)
        .set({
          skippedAt: now,
          skippedByUserId: input.userId,
          status: "skipped",
          updatedAt: now,
        })
        .where(eq(companyOnboardings.companyId, input.companyId))
        .returning(this.selection()) as CompanyOnboardingRow[];
      if (!updatedOnboarding) {
        throw new Error("Failed to skip company onboarding.");
      }

      return updatedOnboarding;
    });
  }

  private async acquireCompanyLock(tx: AppRuntimeTransaction, companyId: string): Promise<void> {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`company_onboarding:${companyId}`}, 0))`);
  }

  private async findOnboardingRow(
    tx: AppRuntimeTransaction,
    companyId: string,
  ): Promise<CompanyOnboardingRow | null> {
    const [onboarding] = await tx
      .select(this.selection())
      .from(companyOnboardings)
      .where(eq(companyOnboardings.companyId, companyId)) as CompanyOnboardingRow[];

    return onboarding ?? null;
  }

  private async markOnboardingStarted(
    tx: AppRuntimeTransaction,
    input: {
      agentId: string;
      companyId: string;
      sessionId: string;
      workflowRunId: string;
    },
  ): Promise<CompanyOnboardingRecord> {
    const now = new Date();
    const [updatedOnboarding] = await tx
      .update(companyOnboardings)
      .set({
        agentId: input.agentId,
        completedAt: null,
        sessionId: input.sessionId,
        skippedAt: null,
        skippedByUserId: null,
        startedAt: now,
        status: "in_progress",
        updatedAt: now,
        workflowRunId: input.workflowRunId,
      })
      .where(eq(companyOnboardings.companyId, input.companyId))
      .returning(this.selection()) as CompanyOnboardingRow[];
    if (!updatedOnboarding) {
      throw new Error("Failed to start company onboarding.");
    }

    return updatedOnboarding;
  }

  private async ensureDirectSetupResolved(
    tx: AppRuntimeTransaction,
    onboarding: CompanyOnboardingRecord,
  ): Promise<CompanyOnboardingRecord> {
    if (this.isStaticSetupResolved(onboarding)) {
      return onboarding;
    }

    const values: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    let hasChanges = false;

    if (!onboarding.companyMission?.trim() && !onboarding.missionSkippedAt) {
      values.companyMission = null;
      values.missionSkippedAt = new Date();
      hasChanges = true;
    }

    if (onboarding.githubSetupStatus === "pending") {
      values.githubCompletedAt = null;
      values.githubSetupStatus = "skipped";
      values.githubSkippedAt = new Date();
      hasChanges = true;
    }

    if (onboarding.llmSetupStatus === "pending") {
      if (!await this.hasCompanyManagedPlatformModel(tx)) {
        throw new Error("CompanyHelm-managed model access is unavailable.");
      }

      values.llmCompletedAt = new Date();
      values.llmSetupStatus = "company_managed";
      values.llmSkippedAt = null;
      hasChanges = true;
    }

    if (!hasChanges) {
      return onboarding;
    }

    const [updatedOnboarding] = await tx
      .update(companyOnboardings)
      .set(values)
      .where(eq(companyOnboardings.companyId, onboarding.companyId))
      .returning(this.selection()) as CompanyOnboardingRow[];
    if (!updatedOnboarding) {
      throw new Error("Failed to prepare company onboarding.");
    }

    return updatedOnboarding;
  }

  private async requireSeedWorkflow(tx: AppRuntimeTransaction, companyId: string): Promise<WorkflowRow> {
    const [workflow] = await tx
      .select({
        id: workflowDefinitions.id,
      })
      .from(workflowDefinitions)
      .where(and(
        eq(workflowDefinitions.companyId, companyId),
        eq(workflowDefinitions.name, CompanyBootstrapService.SEED_ONBOARDING_WORKFLOW_NAME),
      )) as WorkflowRow[];
    if (!workflow) {
      throw new Error("Company onboarding workflow is not configured.");
    }

    return workflow;
  }

  private isStaticSetupResolved(onboarding: CompanyOnboardingRecord): boolean {
    const missionResolved = Boolean(onboarding.companyMission?.trim() || onboarding.missionSkippedAt);
    return missionResolved
      && onboarding.githubSetupStatus !== "pending"
      && onboarding.llmSetupStatus !== "pending";
  }

  private createWorkflowInputValues(onboarding: CompanyOnboardingRecord): WorkflowRunInputValue[] {
    void onboarding;
    return [];
  }

  private async hasLinkedGithubInstallation(tx: AppRuntimeTransaction, companyId: string): Promise<boolean> {
    const [installation] = await tx
      .select({
        id: companyGithubInstallations.companyId,
      })
      .from(companyGithubInstallations)
      .where(eq(companyGithubInstallations.companyId, companyId))
      .limit(1) as ExistenceRow[];

    return Boolean(installation);
  }

  private async hasThirdPartyCredential(tx: AppRuntimeTransaction, companyId: string): Promise<boolean> {
    const [credential] = await tx
      .select({
        id: modelProviderCredentials.id,
      })
      .from(modelProviderCredentials)
      .where(eq(modelProviderCredentials.companyId, companyId))
      .limit(1) as ExistenceRow[];

    return Boolean(credential);
  }

  private async hasCompanyManagedPlatformModel(tx: AppRuntimeTransaction): Promise<boolean> {
    const [route] = await tx
      .select({
        id: platformModelRoutes.id,
      })
      .from(platformModelRoutes)
      .where(eq(platformModelRoutes.platformModelId, platformModelRoutes.platformModelId))
      .limit(1);

    return Boolean(route);
  }

  private selection() {
    return {
      agentId: companyOnboardings.agentId,
      companyMission: companyOnboardings.companyMission,
      companyId: companyOnboardings.companyId,
      completedAt: companyOnboardings.completedAt,
      createdAt: companyOnboardings.createdAt,
      githubCompletedAt: companyOnboardings.githubCompletedAt,
      githubSetupStatus: companyOnboardings.githubSetupStatus,
      githubSkippedAt: companyOnboardings.githubSkippedAt,
      llmCompletedAt: companyOnboardings.llmCompletedAt,
      llmSetupStatus: companyOnboardings.llmSetupStatus,
      llmSkippedAt: companyOnboardings.llmSkippedAt,
      missionSkippedAt: companyOnboardings.missionSkippedAt,
      sessionId: companyOnboardings.sessionId,
      skippedAt: companyOnboardings.skippedAt,
      skippedByUserId: companyOnboardings.skippedByUserId,
      startedAt: companyOnboardings.startedAt,
      status: companyOnboardings.status,
      updatedAt: companyOnboardings.updatedAt,
      workflowRunId: companyOnboardings.workflowRunId,
    };
  }

  private static createMissingWorkflowService(): CompanyOnboardingWorkflowService {
    return {
      async finalizeStartedWorkflowRun() {
        throw new Error("Workflow service is not configured.");
      },
      async startWorkflowRunInTransaction() {
        throw new Error("Workflow service is not configured.");
      },
    };
  }

  private static createMissingBootstrapService(): CompanyOnboardingBootstrapService {
    return {
      async ensureOnboardingAssets() {
        throw new Error("CompanyBootstrapService is required.");
      },
    };
  }

}
