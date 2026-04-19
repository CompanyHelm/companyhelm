import { and, eq } from "drizzle-orm";
import type { TransactionProviderInterface, AppRuntimeTransaction } from "../../../../../../db/transaction_provider_interface.ts";
import {
  workflowRuns,
  workflowRunSteps,
} from "../../../../../../db/schema.ts";

export type AgentWorkflowToolRunStep = {
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
};

export type AgentWorkflowToolRunState = {
  runningStep: AgentWorkflowToolRunStep;
  workflowRunId: string;
};

type WorkflowRunRow = {
  id: string;
  runningStepRunId: string | null;
};

type WorkflowRunStepRow = AgentWorkflowToolRunStep;

/**
 * Binds workflow-run step advancement to the current PI Mono session. It only mutates a running
 * workflow run owned by this session and rejects skipped or backward step movement.
 */
export class AgentWorkflowToolService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly sessionId: string;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.sessionId = sessionId;
  }

  async hasRunningWorkflowRun(): Promise<boolean> {
    return this.transactionProvider.transaction(async (tx) => {
      const runRows = await this.loadRunningWorkflowRuns(tx);
      return runRows.length > 0;
    });
  }

  async updateRunningStep(input: { workflowRunStepId: string }): Promise<AgentWorkflowToolRunState> {
    return this.transactionProvider.transaction(async (tx) => {
      const runRow = await this.requireRunningWorkflowRun(tx);
      const steps = await this.loadRunSteps(tx, runRow.id);
      const targetStep = steps.find((step) => step.id === input.workflowRunStepId);
      if (!targetStep) {
        throw new Error("Workflow run step not found for this session.");
      }

      const currentStep = steps.find((step) => step.id === runRow.runningStepRunId) ?? null;
      const currentOrdinal = currentStep?.ordinal ?? 0;
      if (targetStep.ordinal < currentOrdinal) {
        throw new Error("Workflow running step cannot move backwards.");
      }
      if (targetStep.ordinal > currentOrdinal + 1) {
        throw new Error("Workflow running step can only advance one step at a time.");
      }

      await tx
        .update(workflowRuns)
        .set({
          runningStepRunId: targetStep.id,
          updatedAt: new Date(),
        })
        .where(and(
          eq(workflowRuns.companyId, this.companyId),
          eq(workflowRuns.id, runRow.id),
        ));

      return {
        runningStep: targetStep,
        workflowRunId: runRow.id,
      };
    });
  }

  private async requireRunningWorkflowRun(tx: AppRuntimeTransaction): Promise<WorkflowRunRow> {
    const runRows = await this.loadRunningWorkflowRuns(tx);
    const runRow = runRows[0] ?? null;
    if (!runRow) {
      throw new Error("No running workflow run found for this session.");
    }

    return runRow;
  }

  private async loadRunningWorkflowRuns(tx: AppRuntimeTransaction): Promise<WorkflowRunRow[]> {
    return await tx
      .select({
        id: workflowRuns.id,
        runningStepRunId: workflowRuns.runningStepRunId,
      })
      .from(workflowRuns)
      .where(and(
        eq(workflowRuns.companyId, this.companyId),
        eq(workflowRuns.sessionId, this.sessionId),
        eq(workflowRuns.status, "running"),
      )) as WorkflowRunRow[];
  }

  private async loadRunSteps(tx: AppRuntimeTransaction, workflowRunId: string): Promise<WorkflowRunStepRow[]> {
    const steps = await tx
      .select({
        id: workflowRunSteps.id,
        instructions: workflowRunSteps.instructions,
        name: workflowRunSteps.name,
        ordinal: workflowRunSteps.ordinal,
      })
      .from(workflowRunSteps)
      .where(and(
        eq(workflowRunSteps.companyId, this.companyId),
        eq(workflowRunSteps.workflowRunId, workflowRunId),
      )) as WorkflowRunStepRow[];
    steps.sort((left, right) => left.ordinal - right.ordinal);

    return steps;
  }
}
