import { and, eq } from "drizzle-orm";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  companyOnboardings,
  workflowRuns,
  workflowRunSteps,
} from "../../db/schema.ts";
import {
  type WorkflowDefinitionInputRecord,
  type WorkflowLocalRunStartRecord,
  type WorkflowRunInputValue,
  type WorkflowRunRecord,
} from "./types.ts";
import { WorkflowService } from "./service.ts";

type WorkflowExecutionServiceAdapter = Pick<WorkflowService, "listWorkflows" | "startLocalWorkflowRun" | "startWorkflowRun">;

export type WorkflowExecutionMode = "agent" | "local";

export type WorkflowExecutionStartInput = {
  agentId?: string;
  executionMode?: WorkflowExecutionMode;
  input?: Record<string, unknown>;
  workflowDefinitionId: string;
};

export type WorkflowExecutionListItemInput = {
  defaultValue: string | null;
  description: string | null;
  isRequired: boolean;
  name: string;
};

export type WorkflowExecutionListItem = {
  description: string | null;
  id: string;
  inputs: WorkflowExecutionListItemInput[];
  name: string;
};

export type WorkflowExecutionStartResult = {
  executionInstructions: string | null;
  parentWorkflowRunId: string | null;
  workflowRun: WorkflowRunRecord;
};

export type WorkflowExecutionRunStepStatus = "pending" | "running" | "done";

export type WorkflowExecutionRunStep = {
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
  status: WorkflowExecutionRunStepStatus;
};

export type WorkflowExecutionRunState = {
  allStepsDone: boolean;
  step: WorkflowExecutionRunStep;
  workflowRunStatus: "running" | "done";
  workflowRunId: string;
};

type WorkflowRunRow = {
  id: string;
};

type WorkflowRunStepRow = WorkflowExecutionRunStep;

/**
 * Binds workflow execution operations to one active agent session. The service lists runnable
 * company workflows, starts them locally or in a delegated agent session, and scopes step-status
 * updates to the workflow run currently owned by this session.
 */
export class WorkflowExecutionSessionService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly agentId: string;
  private readonly sessionId: string;
  private readonly workflowService: WorkflowExecutionServiceAdapter;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    sessionId: string,
    workflowService: WorkflowExecutionServiceAdapter = {
      async listWorkflows() {
        throw new Error("workflow definitions should not be loaded for this session");
      },
      async startLocalWorkflowRun() {
        throw new Error("local workflow runs should not be started for this session");
      },
      async startWorkflowRun() {
        throw new Error("workflow runs should not be started for this session");
      },
    },
  ) {
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.agentId = agentId;
    this.sessionId = sessionId;
    this.workflowService = workflowService;
  }

  async listWorkflows(): Promise<WorkflowExecutionListItem[]> {
    const workflows = await this.workflowService.listWorkflows(this.transactionProvider, this.companyId);

    return workflows
      .filter((workflow) => workflow.isEnabled)
      .map((workflow) => ({
        description: workflow.description,
        id: workflow.id,
        inputs: workflow.inputs.map((input) => this.serializeWorkflowInput(input)),
        name: workflow.name,
      }));
  }

  async startWorkflow(input: WorkflowExecutionStartInput): Promise<WorkflowExecutionStartResult> {
    const executionMode = input.executionMode ?? "local";
    const parentWorkflowRunId = await this.transactionProvider.transaction(async (tx) => {
      const runRows = await this.loadRunningWorkflowRuns(tx);
      if (executionMode === "local" && runRows.length > 0) {
        throw new Error("This chat already has a running workflow.");
      }

      return runRows[0]?.id ?? null;
    });

    if (executionMode === "agent") {
      if (!input.agentId) {
        throw new Error("agentId is required when executionMode is agent.");
      }
      const workflowRun = await this.workflowService.startWorkflowRun(this.transactionProvider, {
        agentId: input.agentId,
        companyId: this.companyId,
        inputValues: this.serializeWorkflowInputValues(input.input ?? {}),
        parentWorkflowRunId,
        startedByAgentId: this.agentId,
        startedBySessionId: this.sessionId,
        workflowDefinitionId: input.workflowDefinitionId,
      });

      return {
        executionInstructions: null,
        parentWorkflowRunId,
        workflowRun,
      };
    }
    if (input.agentId) {
      throw new Error("agentId is only supported when executionMode is agent.");
    }

    const localRun = await this.workflowService.startLocalWorkflowRun(this.transactionProvider, {
      agentId: this.agentId,
      companyId: this.companyId,
      inputValues: this.serializeWorkflowInputValues(input.input ?? {}),
      parentWorkflowRunId,
      sessionId: this.sessionId,
      startedByAgentId: this.agentId,
      startedBySessionId: this.sessionId,
      workflowDefinitionId: input.workflowDefinitionId,
    });

    return this.serializeLocalRunStart(parentWorkflowRunId, localRun);
  }

  async updateStepStatus(input: {
    status: WorkflowExecutionRunStepStatus;
    workflowRunStepId: string;
  }): Promise<WorkflowExecutionRunState> {
    return this.transactionProvider.transaction(async (tx) => {
      const runRow = await this.requireRunningWorkflowRun(tx);
      const steps = await this.loadRunSteps(tx, runRow.id);
      const targetStep = steps.find((step) => step.id === input.workflowRunStepId);
      if (!targetStep) {
        throw new Error("Workflow run step not found for this session.");
      }

      const now = new Date();
      if (input.status === "running") {
        await tx
          .update(workflowRunSteps)
          .set({ status: "pending" })
          .where(and(
            eq(workflowRunSteps.companyId, this.companyId),
            eq(workflowRunSteps.workflowRunId, runRow.id),
            eq(workflowRunSteps.status, "running"),
          ));
      }

      await tx
        .update(workflowRunSteps)
        .set({
          status: input.status,
        })
        .where(and(
          eq(workflowRunSteps.companyId, this.companyId),
          eq(workflowRunSteps.id, targetStep.id),
          eq(workflowRunSteps.workflowRunId, runRow.id),
        ));

      const nextSteps = steps.map((step) => {
        if (step.id === targetStep.id) {
          return {
            ...step,
            status: input.status,
          };
        }
        if (input.status === "running" && step.status === "running") {
          return {
            ...step,
            status: "pending" as const,
          };
        }

        return step;
      });
      const allStepsDone = nextSteps.every((step) => step.status === "done");
      const workflowRunStatus = allStepsDone ? "done" : "running";
      const updatedStep = nextSteps.find((step) => step.id === targetStep.id);
      if (!updatedStep) {
        throw new Error("Workflow run step update failed.");
      }

      await tx
        .update(workflowRuns)
        .set(allStepsDone
          ? {
              completedAt: now,
              status: workflowRunStatus,
              updatedAt: now,
            }
          : {
              updatedAt: now,
            })
        .where(and(
          eq(workflowRuns.companyId, this.companyId),
          eq(workflowRuns.id, runRow.id),
        ));
      if (allStepsDone) {
        await tx
          .update(companyOnboardings)
          .set({
            completedAt: now,
            status: "completed",
            updatedAt: now,
          })
          .where(and(
            eq(companyOnboardings.companyId, this.companyId),
            eq(companyOnboardings.workflowRunId, runRow.id),
            eq(companyOnboardings.status, "in_progress"),
          ));
      }

      return {
        allStepsDone,
        step: updatedStep,
        workflowRunStatus,
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
    const runRows = await tx
      .select({
        id: workflowRuns.id,
      })
      .from(workflowRuns)
      .where(and(
        eq(workflowRuns.companyId, this.companyId),
        eq(workflowRuns.sessionId, this.sessionId),
        eq(workflowRuns.status, "running"),
      )) as Array<{ id?: unknown }>;

    return runRows.filter((runRow): runRow is WorkflowRunRow => typeof runRow.id === "string");
  }

  private async loadRunSteps(tx: AppRuntimeTransaction, workflowRunId: string): Promise<WorkflowRunStepRow[]> {
    const steps = await tx
      .select({
        id: workflowRunSteps.id,
        instructions: workflowRunSteps.instructions,
        name: workflowRunSteps.name,
        ordinal: workflowRunSteps.ordinal,
        status: workflowRunSteps.status,
      })
      .from(workflowRunSteps)
      .where(and(
        eq(workflowRunSteps.companyId, this.companyId),
        eq(workflowRunSteps.workflowRunId, workflowRunId),
      )) as WorkflowRunStepRow[];
    steps.sort((left, right) => left.ordinal - right.ordinal);

    return steps;
  }

  private serializeWorkflowInput(input: WorkflowDefinitionInputRecord): WorkflowExecutionListItemInput {
    return {
      defaultValue: input.defaultValue,
      description: input.description,
      isRequired: input.isRequired,
      name: input.name,
    };
  }

  private serializeLocalRunStart(
    parentWorkflowRunId: string | null,
    localRun: WorkflowLocalRunStartRecord,
  ): WorkflowExecutionStartResult {
    return {
      executionInstructions: localRun.executionInstructions,
      parentWorkflowRunId,
      workflowRun: localRun.workflowRun,
    };
  }

  private serializeWorkflowInputValues(input: Record<string, unknown>): WorkflowRunInputValue[] {
    return Object.entries(input).map(([name, value]) => ({
      name,
      value: this.serializeWorkflowInputValue(value),
    }));
  }

  private serializeWorkflowInputValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
      return String(value);
    }

    return JSON.stringify(value);
  }
}
