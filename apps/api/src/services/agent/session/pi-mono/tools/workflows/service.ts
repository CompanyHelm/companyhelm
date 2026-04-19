import { and, eq } from "drizzle-orm";
import type { TransactionProviderInterface, AppRuntimeTransaction } from "../../../../../../db/transaction_provider_interface.ts";
import {
  workflowRuns,
  workflowRunSteps,
} from "../../../../../../db/schema.ts";
import {
  type WorkflowDefinitionInputRecord,
  type WorkflowRunInputValue,
  type WorkflowRunRecord,
} from "../../../../../workflows/types.ts";
import { WorkflowService } from "../../../../../workflows/service.ts";

type AgentWorkflowServiceAdapter = Pick<WorkflowService, "listWorkflows" | "startWorkflowRun">;

export type AgentWorkflowToolListInput = {
  input?: Record<string, unknown>;
  workflowDefinitionId: string;
};

export type AgentWorkflowToolListItemInput = {
  defaultValue: string | null;
  description: string | null;
  isRequired: boolean;
  name: string;
};

export type AgentWorkflowToolListItem = {
  description: string | null;
  id: string;
  inputs: AgentWorkflowToolListItemInput[];
  name: string;
};

export type AgentWorkflowToolStartResult = {
  parentWorkflowRunId: string | null;
  workflowRun: WorkflowRunRecord;
};

export type AgentWorkflowRunStepStatus = "pending" | "running" | "done";

export type AgentWorkflowToolRunStep = {
  id: string;
  instructions: string | null;
  name: string;
  ordinal: number;
  status: AgentWorkflowRunStepStatus;
};

export type AgentWorkflowToolRunState = {
  allStepsDone: boolean;
  step: AgentWorkflowToolRunStep;
  workflowRunStatus: "running" | "done";
  workflowRunId: string;
};

type WorkflowRunRow = {
  id: string;
};

type WorkflowRunStepRow = AgentWorkflowToolRunStep;

/**
 * Adapts workflow discovery, kickoff, and in-run step management to the current PI Mono session.
 * It binds company, agent, and session identity once so the individual workflow tools can stay
 * focused on their own payloads while lineage and session scoping are enforced centrally.
 */
export class AgentWorkflowToolService {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly agentId: string;
  private readonly sessionId: string;
  private readonly workflowService: AgentWorkflowServiceAdapter;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
    sessionId: string,
    workflowService: AgentWorkflowServiceAdapter = {
      async listWorkflows() {
        throw new Error("workflow definitions should not be loaded for this session");
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

  async listWorkflows(): Promise<AgentWorkflowToolListItem[]> {
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

  async startWorkflow(input: AgentWorkflowToolListInput): Promise<AgentWorkflowToolStartResult> {
    const parentWorkflowRunId = await this.transactionProvider.transaction(async (tx) => {
      const runRows = await this.loadRunningWorkflowRuns(tx);
      return runRows[0]?.id ?? null;
    });
    const workflowRun = await this.workflowService.startWorkflowRun(this.transactionProvider, {
      agentId: this.agentId,
      companyId: this.companyId,
      inputValues: this.serializeWorkflowInputValues(input.input ?? {}),
      parentWorkflowRunId,
      startedByAgentId: this.agentId,
      startedBySessionId: this.sessionId,
      workflowDefinitionId: input.workflowDefinitionId,
    });

    return {
      parentWorkflowRunId,
      workflowRun,
    };
  }

  async hasRunningWorkflowRun(): Promise<boolean> {
    return this.transactionProvider.transaction(async (tx) => {
      const runRows = await this.loadRunningWorkflowRuns(tx);
      return runRows.length > 0;
    });
  }

  async updateStepStatus(input: {
    status: AgentWorkflowRunStepStatus;
    workflowRunStepId: string;
  }): Promise<AgentWorkflowToolRunState> {
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

  private serializeWorkflowInput(input: WorkflowDefinitionInputRecord): AgentWorkflowToolListItemInput {
    return {
      defaultValue: input.defaultValue,
      description: input.description,
      isRequired: input.isRequired,
      name: input.name,
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
