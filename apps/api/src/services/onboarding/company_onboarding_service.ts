import { and, eq, sql } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agents,
  companyOnboardings,
  workflowDefinitions,
} from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { CompanyBootstrapService } from "../bootstrap/company.ts";
import { WorkflowService } from "../workflows/service.ts";
import type { WorkflowRunCreateInput, WorkflowRunRecord } from "../workflows/types.ts";

export type CompanyOnboardingStatus = "not_started" | "in_progress" | "completed" | "skipped";

export type CompanyOnboardingRecord = {
  agentId: string | null;
  companyId: string;
  completedAt: Date | null;
  createdAt: Date;
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

type CompanyOnboardingRow = CompanyOnboardingRecord;

type AgentRow = {
  id: string;
};

type WorkflowRow = {
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
 * work in the existing CEO chat and workflow runtime. The service only records whether a company
 * should be focused into onboarding and which durable chat/workflow represents that process.
 */
@injectable()
export class CompanyOnboardingService {
  constructor(
    @inject(WorkflowService)
    private readonly workflowService: CompanyOnboardingWorkflowService =
      CompanyOnboardingService.createMissingWorkflowService(),
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
        companyId,
        completedAt: null,
        createdAt: now,
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
        startedSessionId = existingOnboarding.sessionId;
        return existingOnboarding;
      }

      const agent = await this.requireSeedAgent(tx, input.companyId);
      const workflow = await this.requireSeedWorkflow(tx, input.companyId);
      const startedRun = await this.workflowService.startWorkflowRunInTransaction(tx, {
        agentId: agent.id,
        companyId: input.companyId,
        inputValues: [],
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

  private async requireSeedAgent(tx: AppRuntimeTransaction, companyId: string): Promise<AgentRow> {
    const [agent] = await tx
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.name, CompanyBootstrapService.SEED_AGENT_NAME),
      )) as AgentRow[];
    if (!agent) {
      throw new Error("Company onboarding requires the CEO agent.");
    }

    return agent;
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

  private selection() {
    return {
      agentId: companyOnboardings.agentId,
      companyId: companyOnboardings.companyId,
      completedAt: companyOnboardings.completedAt,
      createdAt: companyOnboardings.createdAt,
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
}
