import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import nunjucks from "nunjucks";
import {
  agents,
  workflowDefinitionInputs,
  workflowDefinitions,
  workflowRuns,
  workflowRunSteps,
  workflowStepDefinitions,
} from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { WorkflowRunTemplate } from "../../prompts/workflow_run_template.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";
import type {
  WorkflowCreateInput,
  WorkflowDefinitionInputRecord,
  WorkflowInputDraft,
  WorkflowRecord,
  WorkflowRunCreateInput,
  WorkflowRunInputValue,
  WorkflowRunRecord,
  WorkflowRunStatus,
  WorkflowRunStepRecord,
  WorkflowStepDefinitionRecord,
  WorkflowStepDraft,
  WorkflowUpdateInput,
} from "./types.ts";

type WorkflowDefinitionRow = {
  createdAt: Date;
  description: string | null;
  id: string;
  instructions: string | null;
  isEnabled: boolean;
  name: string;
  updatedAt: Date;
};

type WorkflowDefinitionInputRow = WorkflowDefinitionInputRecord;
type WorkflowStepDefinitionRow = WorkflowStepDefinitionRecord;
type WorkflowRunStepRow = WorkflowRunStepRecord;

type WorkflowRunRow = {
  agentId: string;
  completedAt: Date | null;
  createdAt: Date;
  id: string;
  instructions: string | null;
  sessionId: string;
  startedAt: Date | null;
  status: WorkflowRunStatus;
  updatedAt: Date;
  workflowDefinitionId: string | null;
};

/**
 * Owns durable workflow definitions and run initialization. It snapshots ordered definition steps
 * into `workflow_run_steps` at launch time, then delegates actual agent execution to the existing
 * session queue and worker pipeline.
 */
@injectable()
export class WorkflowService {
  constructor(
    @inject(SessionManagerService)
    private readonly sessionManagerService: SessionManagerService,
    private readonly workflowRunTemplate: WorkflowRunTemplate = new WorkflowRunTemplate(),
  ) {}

  async listWorkflows(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<WorkflowRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const workflowRows = await tx
        .select(this.getWorkflowDefinitionSelection())
        .from(workflowDefinitions)
        .where(eq(workflowDefinitions.companyId, companyId)) as WorkflowDefinitionRow[];
      workflowRows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

      return this.hydrateWorkflowRows(tx, companyId, workflowRows);
    });
  }

  async getWorkflow(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    workflowDefinitionId: string,
  ): Promise<WorkflowRecord> {
    return transactionProvider.transaction(async (tx) => {
      const workflowRow = await this.requireWorkflowDefinitionRow(tx, companyId, workflowDefinitionId);
      return (await this.hydrateWorkflowRows(tx, companyId, [workflowRow]))[0]!;
    });
  }

  async createWorkflow(
    transactionProvider: TransactionProviderInterface,
    input: WorkflowCreateInput,
  ): Promise<WorkflowRecord> {
    this.assertText(input.name, "name is required.");
    this.assertInputDrafts(input.inputs);
    this.assertStepDrafts(input.steps);

    return transactionProvider.transaction(async (tx) => {
      const now = new Date();
      const workflowDefinitionId = randomUUID();
      await tx
        .insert(workflowDefinitions)
        .values({
          companyId: input.companyId,
          createdAt: now,
          createdByUserId: input.createdByUserId ?? null,
          description: input.description ?? null,
          id: workflowDefinitionId,
          instructions_template: input.instructions ?? null,
          isEnabled: input.isEnabled ?? true,
          name: input.name,
          updatedAt: now,
        });

      await this.replaceInputs(tx, input.companyId, workflowDefinitionId, input.inputs);
      await this.replaceSteps(tx, workflowDefinitionId, input.steps);

      const workflowRow = await this.requireWorkflowDefinitionRow(tx, input.companyId, workflowDefinitionId);
      return (await this.hydrateWorkflowRows(tx, input.companyId, [workflowRow]))[0]!;
    });
  }

  async updateWorkflow(
    transactionProvider: TransactionProviderInterface,
    input: WorkflowUpdateInput,
  ): Promise<WorkflowRecord> {
    return transactionProvider.transaction(async (tx) => {
      await this.requireWorkflowDefinitionRow(tx, input.companyId, input.workflowDefinitionId);
      const values: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined && input.name !== null) {
        this.assertText(input.name, "name is required.");
        values.name = input.name;
      }
      if (input.description !== undefined) {
        values.description = input.description;
      }
      if (input.instructions !== undefined) {
        values.instructions_template = input.instructions;
      }
      if (input.isEnabled !== undefined && input.isEnabled !== null) {
        values.isEnabled = input.isEnabled;
      }

      await tx
        .update(workflowDefinitions)
        .set(values)
        .where(and(
          eq(workflowDefinitions.companyId, input.companyId),
          eq(workflowDefinitions.id, input.workflowDefinitionId),
        ));

      if (input.inputs) {
        this.assertInputDrafts(input.inputs);
        await tx
          .delete(workflowDefinitionInputs)
          .where(and(
            eq(workflowDefinitionInputs.companyId, input.companyId),
            eq(workflowDefinitionInputs.workflowDefinitionId, input.workflowDefinitionId),
          ));
        await this.replaceInputs(tx, input.companyId, input.workflowDefinitionId, input.inputs);
      }
      if (input.steps) {
        this.assertStepDrafts(input.steps);
        await tx
          .delete(workflowStepDefinitions)
          .where(eq(workflowStepDefinitions.workflowDefinitionId, input.workflowDefinitionId));
        await this.replaceSteps(tx, input.workflowDefinitionId, input.steps);
      }

      const workflowRow = await this.requireWorkflowDefinitionRow(tx, input.companyId, input.workflowDefinitionId);
      return (await this.hydrateWorkflowRows(tx, input.companyId, [workflowRow]))[0]!;
    });
  }

  async getWorkflowRun(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    workflowRunId: string,
  ): Promise<WorkflowRunRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.requireWorkflowRun(tx, companyId, workflowRunId);
    });
  }

  async listWorkflowRuns(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    workflowDefinitionId: string,
  ): Promise<WorkflowRunRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      await this.requireWorkflowDefinitionRow(tx, companyId, workflowDefinitionId);
      const runRows = await tx
        .select(this.getWorkflowRunSelection())
        .from(workflowRuns)
        .where(and(
          eq(workflowRuns.companyId, companyId),
          eq(workflowRuns.workflowDefinitionId, workflowDefinitionId),
        )) as WorkflowRunRow[];
      runRows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

      return this.hydrateWorkflowRunRows(tx, companyId, runRows);
    });
  }

  async startWorkflowRun(
    transactionProvider: TransactionProviderInterface,
    input: WorkflowRunCreateInput,
  ): Promise<WorkflowRunRecord> {
    let queuedSessionId: string | null = null;
    const workflowRunRecord = await transactionProvider.transaction(async (tx) => {
      const workflowRow = await this.requireWorkflowDefinitionRow(tx, input.companyId, input.workflowDefinitionId);
      if (!workflowRow.isEnabled) {
        throw new Error("Workflow is disabled.");
      }
      await this.requireAgent(tx, input.companyId, input.agentId);

      const definitionInputs = await this.loadInputsByWorkflowDefinitionId(
        tx,
        input.companyId,
        [input.workflowDefinitionId],
      );
      const stepRows = await this.loadStepsByWorkflowDefinitionId(tx, [input.workflowDefinitionId]);
      const steps = stepRows.get(input.workflowDefinitionId) ?? [];
      if (steps.length === 0) {
        throw new Error("Workflow must have at least one step.");
      }

      const templateValues = this.resolveTemplateValues(
        definitionInputs.get(input.workflowDefinitionId) ?? [],
        input.inputValues,
      );
      const workflowRunId = randomUUID();
      const stepSnapshots = steps.map((step) => ({
        id: randomUUID(),
        instructions: this.renderDefinitionTemplate(step.instructions, templateValues),
        name: step.name,
        ordinal: step.ordinal,
        status: "pending" as const,
        workflowRunId,
      }));
      const instructions = this.renderDefinitionTemplate(workflowRow.instructions, templateValues);
      const prompt = this.workflowRunTemplate.render({
        instructions,
        steps: stepSnapshots,
        workflowDescription: workflowRow.description,
        workflowName: workflowRow.name,
      });
      const sessionRecord = await this.sessionManagerService.createSessionInTransaction(
        tx as never,
        tx as never,
        input.companyId,
        input.agentId,
        prompt,
        {
          userId: input.startedByUserId ?? null,
        },
      );
      queuedSessionId = sessionRecord.id;
      const now = new Date();

      await tx
        .insert(workflowRuns)
        .values({
          agentId: input.agentId,
          companyId: input.companyId,
          completedAt: null,
          createdAt: now,
          id: workflowRunId,
          instructions,
          parentWorkflowRunId: input.parentWorkflowRunId ?? null,
          sessionId: sessionRecord.id,
          startedAt: now,
          startedByAgentId: input.startedByAgentId ?? null,
          startedBySessionId: input.startedBySessionId ?? null,
          startedByUserId: input.startedByUserId ?? null,
          status: "running",
          updatedAt: now,
          workflowDefinitionId: input.workflowDefinitionId,
        });

      await tx
        .insert(workflowRunSteps)
        .values(stepSnapshots.map((step) => ({
          companyId: input.companyId,
          id: step.id,
          instructions: step.instructions,
          name: step.name,
          ordinal: step.ordinal,
          status: step.status,
          workflowRunId,
        })));

      return this.requireWorkflowRun(tx, input.companyId, workflowRunId);
    });

    if (queuedSessionId) {
      await this.sessionManagerService.notifyQueuedSessionMessage(input.companyId, queuedSessionId, false);
    }

    return workflowRunRecord;
  }

  private async hydrateWorkflowRows(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowRows: WorkflowDefinitionRow[],
  ): Promise<WorkflowRecord[]> {
    const workflowDefinitionIds = workflowRows.map((workflowRow) => workflowRow.id);
    const inputsByWorkflowDefinitionId = await this.loadInputsByWorkflowDefinitionId(tx, companyId, workflowDefinitionIds);
    const stepsByWorkflowDefinitionId = await this.loadStepsByWorkflowDefinitionId(tx, workflowDefinitionIds);

    return workflowRows.map((workflowRow) => ({
      createdAt: workflowRow.createdAt,
      description: workflowRow.description,
      id: workflowRow.id,
      inputs: inputsByWorkflowDefinitionId.get(workflowRow.id) ?? [],
      instructions: workflowRow.instructions,
      isEnabled: workflowRow.isEnabled,
      name: workflowRow.name,
      steps: stepsByWorkflowDefinitionId.get(workflowRow.id) ?? [],
      updatedAt: workflowRow.updatedAt,
    }));
  }

  private async hydrateWorkflowRunRows(
    tx: AppRuntimeTransaction,
    companyId: string,
    runRows: WorkflowRunRow[],
  ): Promise<WorkflowRunRecord[]> {
    const workflowRunIds = runRows.map((runRow) => runRow.id);
    if (workflowRunIds.length === 0) {
      return [];
    }

    const stepRows = await tx
      .select({
        id: workflowRunSteps.id,
        instructions: workflowRunSteps.instructions,
        name: workflowRunSteps.name,
        ordinal: workflowRunSteps.ordinal,
        status: workflowRunSteps.status,
        workflowRunId: workflowRunSteps.workflowRunId,
      })
      .from(workflowRunSteps)
      .where(and(
        eq(workflowRunSteps.companyId, companyId),
        inArray(workflowRunSteps.workflowRunId, workflowRunIds),
      )) as WorkflowRunStepRow[];
    stepRows.sort((left, right) => left.ordinal - right.ordinal);

    const stepsByWorkflowRunId = new Map<string, WorkflowRunStepRecord[]>();
    for (const stepRow of stepRows) {
      const runSteps = stepsByWorkflowRunId.get(stepRow.workflowRunId) ?? [];
      runSteps.push(stepRow);
      stepsByWorkflowRunId.set(stepRow.workflowRunId, runSteps);
    }

    return runRows.map((runRow) => ({
      ...runRow,
      steps: stepsByWorkflowRunId.get(runRow.id) ?? [],
    }));
  }

  private async requireWorkflowDefinitionRow(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowDefinitionId: string,
  ): Promise<WorkflowDefinitionRow> {
    const [workflowRow] = await tx
      .select(this.getWorkflowDefinitionSelection())
      .from(workflowDefinitions)
      .where(and(
        eq(workflowDefinitions.companyId, companyId),
        eq(workflowDefinitions.id, workflowDefinitionId),
      )) as WorkflowDefinitionRow[];
    if (!workflowRow) {
      throw new Error("Workflow not found.");
    }

    return workflowRow;
  }

  private async requireAgent(tx: AppRuntimeTransaction, companyId: string, agentId: string): Promise<void> {
    const [agentRow] = await tx
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      )) as Array<{ id: string }>;
    if (!agentRow) {
      throw new Error("Agent not found.");
    }
  }

  private async loadInputsByWorkflowDefinitionId(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowDefinitionIds: string[],
  ): Promise<Map<string, WorkflowDefinitionInputRecord[]>> {
    if (workflowDefinitionIds.length === 0) {
      return new Map();
    }

    const inputRows = await tx
      .select({
        createdAt: workflowDefinitionInputs.createdAt,
        defaultValue: workflowDefinitionInputs.defaultValue,
        description: workflowDefinitionInputs.description,
        id: workflowDefinitionInputs.id,
        isRequired: workflowDefinitionInputs.isRequired,
        name: workflowDefinitionInputs.name,
        workflowDefinitionId: workflowDefinitionInputs.workflowDefinitionId,
      })
      .from(workflowDefinitionInputs)
      .where(and(
        eq(workflowDefinitionInputs.companyId, companyId),
        inArray(workflowDefinitionInputs.workflowDefinitionId, workflowDefinitionIds),
      )) as WorkflowDefinitionInputRow[];
    inputRows.sort((left, right) => {
      const createdAtComparison = left.createdAt.getTime() - right.createdAt.getTime();
      return createdAtComparison === 0 ? left.name.localeCompare(right.name) : createdAtComparison;
    });

    const inputsByWorkflowDefinitionId = new Map<string, WorkflowDefinitionInputRecord[]>();
    for (const inputRow of inputRows) {
      const workflowInputs = inputsByWorkflowDefinitionId.get(inputRow.workflowDefinitionId) ?? [];
      workflowInputs.push(inputRow);
      inputsByWorkflowDefinitionId.set(inputRow.workflowDefinitionId, workflowInputs);
    }

    return inputsByWorkflowDefinitionId;
  }

  private async loadStepsByWorkflowDefinitionId(
    tx: AppRuntimeTransaction,
    workflowDefinitionIds: string[],
  ): Promise<Map<string, WorkflowStepDefinitionRecord[]>> {
    if (workflowDefinitionIds.length === 0) {
      return new Map();
    }

    const stepRows = await tx
      .select({
        createdAt: workflowStepDefinitions.createdAt,
        id: workflowStepDefinitions.id,
        instructions: workflowStepDefinitions.instructions_template,
        name: workflowStepDefinitions.name,
        ordinal: workflowStepDefinitions.ordinal,
        stepId: workflowStepDefinitions.stepId,
        workflowDefinitionId: workflowStepDefinitions.workflowDefinitionId,
      })
      .from(workflowStepDefinitions)
      .where(inArray(workflowStepDefinitions.workflowDefinitionId, workflowDefinitionIds)) as WorkflowStepDefinitionRow[];
    stepRows.sort((left, right) => left.ordinal - right.ordinal);

    const stepsByWorkflowDefinitionId = new Map<string, WorkflowStepDefinitionRecord[]>();
    for (const stepRow of stepRows) {
      const workflowSteps = stepsByWorkflowDefinitionId.get(stepRow.workflowDefinitionId) ?? [];
      workflowSteps.push(stepRow);
      stepsByWorkflowDefinitionId.set(stepRow.workflowDefinitionId, workflowSteps);
    }

    return stepsByWorkflowDefinitionId;
  }

  private async requireWorkflowRun(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowRunId: string,
  ): Promise<WorkflowRunRecord> {
    const [runRow] = await tx
      .select(this.getWorkflowRunSelection())
      .from(workflowRuns)
      .where(and(
        eq(workflowRuns.companyId, companyId),
        eq(workflowRuns.id, workflowRunId),
      )) as WorkflowRunRow[];
    if (!runRow) {
      throw new Error("Workflow run not found.");
    }

    const stepRows = await tx
      .select({
        id: workflowRunSteps.id,
        instructions: workflowRunSteps.instructions,
        name: workflowRunSteps.name,
        ordinal: workflowRunSteps.ordinal,
        status: workflowRunSteps.status,
        workflowRunId: workflowRunSteps.workflowRunId,
      })
      .from(workflowRunSteps)
      .where(and(
        eq(workflowRunSteps.companyId, companyId),
        eq(workflowRunSteps.workflowRunId, workflowRunId),
      )) as WorkflowRunStepRow[];
    stepRows.sort((left, right) => left.ordinal - right.ordinal);

    return {
      ...runRow,
      steps: stepRows,
    };
  }

  private async replaceInputs(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowDefinitionId: string,
    inputs: WorkflowInputDraft[],
  ): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    const now = new Date();
    await tx
      .insert(workflowDefinitionInputs)
      .values(inputs.map((input, inputIndex) => ({
        companyId,
        createdAt: new Date(now.getTime() + inputIndex),
        defaultValue: input.defaultValue ?? null,
        description: input.description ?? null,
        id: randomUUID(),
        isRequired: input.isRequired ?? true,
        name: input.name,
        workflowDefinitionId,
      })));
  }

  private async replaceSteps(
    tx: AppRuntimeTransaction,
    workflowDefinitionId: string,
    steps: WorkflowStepDraft[],
  ): Promise<void> {
    if (steps.length === 0) {
      return;
    }

    const now = new Date();
    await tx
      .insert(workflowStepDefinitions)
      .values(steps.map((step, stepIndex) => ({
        createdAt: now,
        id: randomUUID(),
        instructions_template: step.instructions ?? null,
        name: step.name,
        ordinal: stepIndex + 1,
        stepId: randomUUID(),
        workflowDefinitionId,
      })));
  }

  private resolveTemplateValues(
    definitionInputs: WorkflowDefinitionInputRecord[],
    inputValues: WorkflowRunInputValue[],
  ): Record<string, string> {
    const inputDefinitionByName = new Map(definitionInputs.map((input) => [input.name, input]));
    const resolvedValues = Object.fromEntries(definitionInputs.map((input) => [input.name, input.defaultValue ?? ""]));
    const seenNames = new Set<string>();

    for (const inputValue of inputValues) {
      if (seenNames.has(inputValue.name)) {
        throw new Error(`Duplicate workflow input value: ${inputValue.name}.`);
      }
      seenNames.add(inputValue.name);
      if (!inputDefinitionByName.has(inputValue.name)) {
        throw new Error(`Unknown workflow input: ${inputValue.name}.`);
      }
      resolvedValues[inputValue.name] = inputValue.value;
    }

    for (const definitionInput of definitionInputs) {
      if (definitionInput.isRequired && !/\S/u.test(resolvedValues[definitionInput.name] ?? "")) {
        throw new Error(`Workflow input is required: ${definitionInput.name}.`);
      }
    }

    return resolvedValues;
  }

  private renderDefinitionTemplate(template: string | null, values: Record<string, string>): string | null {
    if (template === null) {
      return null;
    }

    return nunjucks.renderString(template, values).trim();
  }

  private assertInputDrafts(inputs: WorkflowInputDraft[]): void {
    const inputNames = new Set<string>();
    for (const input of inputs) {
      this.assertText(input.name, "input name is required.");
      if (inputNames.has(input.name)) {
        throw new Error(`Duplicate workflow input: ${input.name}.`);
      }
      inputNames.add(input.name);
    }
  }

  private assertStepDrafts(steps: WorkflowStepDraft[]): void {
    if (steps.length === 0) {
      throw new Error("At least one workflow step is required.");
    }
    for (const step of steps) {
      this.assertText(step.name, "step name is required.");
      this.assertText(step.instructions ?? "", "step instructions are required.");
    }
  }

  private assertText(value: string, message: string): void {
    if (!/\S/u.test(value)) {
      throw new Error(message);
    }
  }

  private getWorkflowDefinitionSelection() {
    return {
      createdAt: workflowDefinitions.createdAt,
      description: workflowDefinitions.description,
      id: workflowDefinitions.id,
      instructions: workflowDefinitions.instructions_template,
      isEnabled: workflowDefinitions.isEnabled,
      name: workflowDefinitions.name,
      updatedAt: workflowDefinitions.updatedAt,
    };
  }

  private getWorkflowRunSelection() {
    return {
      agentId: workflowRuns.agentId,
      completedAt: workflowRuns.completedAt,
      createdAt: workflowRuns.createdAt,
      id: workflowRuns.id,
      instructions: workflowRuns.instructions,
      sessionId: workflowRuns.sessionId,
      startedAt: workflowRuns.startedAt,
      status: workflowRuns.status,
      updatedAt: workflowRuns.updatedAt,
      workflowDefinitionId: workflowRuns.workflowDefinitionId,
    };
  }
}
