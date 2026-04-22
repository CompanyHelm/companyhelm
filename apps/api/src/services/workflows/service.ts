import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import nunjucks from "nunjucks";
import {
  agents,
  workflowCronTriggers,
  workflowDefinitionInputs,
  workflowDefinitions,
  workflowRuns,
  workflowRunSteps,
  workflowStepDefinitions,
  workflowTriggerInputValues,
  workflowTriggers,
} from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { WorkflowRunTemplate } from "../../prompts/workflow_run_template.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";
import { SessionSkillService } from "../skills/session_service.ts";
import type {
  WorkflowCreateInput,
  WorkflowCronTriggerCreateInput,
  WorkflowCronTriggerRecord,
  WorkflowCronTriggerScheduleRecord,
  WorkflowCronTriggerUpdateInput,
  WorkflowDefinitionInputRecord,
  WorkflowInputDraft,
  WorkflowLocalRunCreateInput,
  WorkflowLocalRunStartRecord,
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

type CronParserRuntime = {
  parseExpression(cronPattern: string, options: { tz: string }): unknown;
};

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
  source: "manual" | "scheduled";
  startedAt: Date | null;
  status: WorkflowRunStatus;
  triggerId: string | null;
  updatedAt: Date;
  workflowDefinitionId: string | null;
};

type WorkflowCronTriggerRow = {
  agentId: string;
  agentName: string;
  createdAt: Date;
  cronPattern: string;
  enabled: boolean;
  id: string;
  overlapPolicy: "skip";
  timezone: string;
  type: "cron";
  updatedAt: Date;
  workflowDefinitionId: string;
};

type WorkflowTriggerInputValueRow = {
  id: string;
  name: string;
  triggerId: string;
  value: string;
};

type PreparedWorkflowRun = {
  instructions: string | null;
  prompt: string;
  stepSnapshots: Array<{
    id: string;
    instructions: string | null;
    name: string;
    ordinal: number;
    status: "pending";
    workflowRunId: string;
  }>;
  workflowRunId: string;
};

/**
 * Owns durable workflow definitions and run initialization. It snapshots ordered definition steps
 * into `workflow_run_steps` at launch time, then delegates actual agent execution to the existing
 * session queue and worker pipeline.
 */
@injectable()
export class WorkflowService {
  private static readonly cronParser = createRequire(import.meta.url)("cron-parser") as CronParserRuntime;

  constructor(
    @inject(SessionManagerService)
    private readonly sessionManagerService: SessionManagerService,
    @inject(SessionSkillService)
    private readonly sessionSkillService: SessionSkillService = new SessionSkillService(),
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

  async deleteWorkflow(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    workflowDefinitionId: string,
  ): Promise<WorkflowRecord> {
    return transactionProvider.transaction(async (tx) => {
      const workflowRow = await this.requireWorkflowDefinitionRow(tx, companyId, workflowDefinitionId);
      const [workflowRecord] = await this.hydrateWorkflowRows(tx, companyId, [workflowRow]);
      await tx
        .delete(workflowDefinitions)
        .where(and(
          eq(workflowDefinitions.companyId, companyId),
          eq(workflowDefinitions.id, workflowDefinitionId),
        ));
      return workflowRecord!;
    });
  }

  async createCronTrigger(
    transactionProvider: TransactionProviderInterface,
    input: WorkflowCronTriggerCreateInput,
  ): Promise<WorkflowCronTriggerRecord> {
    this.assertCron(input.cronPattern, input.timezone);

    return transactionProvider.transaction(async (tx) => {
      await this.requireWorkflowDefinitionRow(tx, input.companyId, input.workflowDefinitionId);
      await this.requireAgent(tx, input.companyId, input.agentId);
      const definitionInputs = await this.loadInputsByWorkflowDefinitionId(
        tx,
        input.companyId,
        [input.workflowDefinitionId],
      );
      const resolvedValues = this.resolveTemplateValues(
        definitionInputs.get(input.workflowDefinitionId) ?? [],
        input.inputValues,
      );
      const now = new Date();
      const triggerId = randomUUID();

      await tx
        .insert(workflowTriggers)
        .values({
          agentId: input.agentId,
          companyId: input.companyId,
          createdAt: now,
          enabled: input.enabled ?? true,
          id: triggerId,
          overlapPolicy: "skip",
          type: "cron",
          updatedAt: now,
          workflowDefinitionId: input.workflowDefinitionId,
        });
      await tx
        .insert(workflowCronTriggers)
        .values({
          companyId: input.companyId,
          createdAt: now,
          cronPattern: input.cronPattern,
          timezone: input.timezone,
          triggerId,
          updatedAt: now,
        });
      await this.replaceTriggerInputValues(tx, input.companyId, triggerId, resolvedValues);

      return this.requireCronTriggerRow(tx, input.companyId, triggerId);
    });
  }

  async updateCronTrigger(
    transactionProvider: TransactionProviderInterface,
    input: WorkflowCronTriggerUpdateInput,
  ): Promise<WorkflowCronTriggerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const existingTrigger = await this.requireCronTriggerRow(tx, input.companyId, input.triggerId);
      const nextCronPattern = input.cronPattern ?? existingTrigger.cronPattern;
      const nextTimezone = input.timezone ?? existingTrigger.timezone;
      this.assertCron(nextCronPattern, nextTimezone);

      const now = new Date();
      const triggerValues: Record<string, unknown> = {
        updatedAt: now,
      };
      if (input.agentId !== undefined && input.agentId !== null) {
        await this.requireAgent(tx, input.companyId, input.agentId);
        triggerValues.agentId = input.agentId;
      }
      if (input.enabled !== undefined && input.enabled !== null) {
        triggerValues.enabled = input.enabled;
      }

      await tx
        .update(workflowTriggers)
        .set(triggerValues)
        .where(and(
          eq(workflowTriggers.companyId, input.companyId),
          eq(workflowTriggers.id, input.triggerId),
        ));

      await tx
        .update(workflowCronTriggers)
        .set({
          cronPattern: nextCronPattern,
          timezone: nextTimezone,
          updatedAt: now,
        })
        .where(and(
          eq(workflowCronTriggers.companyId, input.companyId),
          eq(workflowCronTriggers.triggerId, input.triggerId),
        ));

      if (input.inputValues) {
        const definitionInputs = await this.loadInputsByWorkflowDefinitionId(
          tx,
          input.companyId,
          [existingTrigger.workflowDefinitionId],
        );
        const resolvedValues = this.resolveTemplateValues(
          definitionInputs.get(existingTrigger.workflowDefinitionId) ?? [],
          input.inputValues,
        );
        await tx
          .delete(workflowTriggerInputValues)
          .where(and(
            eq(workflowTriggerInputValues.companyId, input.companyId),
            eq(workflowTriggerInputValues.triggerId, input.triggerId),
          ));
        await this.replaceTriggerInputValues(tx, input.companyId, input.triggerId, resolvedValues);
      }

      return this.requireCronTriggerRow(tx, input.companyId, input.triggerId);
    });
  }

  async deleteTrigger(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    triggerId: string,
  ): Promise<WorkflowCronTriggerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const triggerRecord = await this.requireCronTriggerRow(tx, companyId, triggerId);
      await tx
        .delete(workflowTriggers)
        .where(and(
          eq(workflowTriggers.companyId, companyId),
          eq(workflowTriggers.id, triggerId),
        ));
      return triggerRecord;
    });
  }

  async getCronTriggerSchedule(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    triggerId: string,
  ): Promise<WorkflowCronTriggerScheduleRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const [triggerRow] = await tx
        .select({
          agentId: workflowTriggers.agentId,
          companyId: workflowTriggers.companyId,
          cronPattern: workflowCronTriggers.cronPattern,
          id: workflowTriggers.id,
          timezone: workflowCronTriggers.timezone,
          workflowDefinitionId: workflowTriggers.workflowDefinitionId,
        })
        .from(workflowTriggers)
        .innerJoin(workflowDefinitions, eq(workflowDefinitions.id, workflowTriggers.workflowDefinitionId))
        .innerJoin(workflowCronTriggers, eq(workflowCronTriggers.triggerId, workflowTriggers.id))
        .where(and(
          eq(workflowTriggers.companyId, companyId),
          eq(workflowTriggers.id, triggerId),
          eq(workflowTriggers.enabled, true),
          eq(workflowDefinitions.isEnabled, true),
        )) as WorkflowCronTriggerScheduleRecord[];

      return triggerRow ?? null;
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
      const preparedRun = await this.prepareWorkflowRun(tx, input);
      const sessionRecord = await this.sessionManagerService.createSessionInTransaction(
        tx as never,
        tx as never,
        input.companyId,
        input.agentId,
        preparedRun.prompt,
        {
          userId: input.startedByUserId ?? null,
        },
      );
      queuedSessionId = sessionRecord.id;
      return this.insertPreparedWorkflowRun(tx, input, sessionRecord.id, preparedRun);
    });

    if (queuedSessionId) {
      await this.sessionSkillService.activateSkill(transactionProvider, {
        companyId: input.companyId,
        sessionId: queuedSessionId,
        skillName: "Execute workflows",
      });
      await this.sessionManagerService.notifyQueuedSessionMessage(input.companyId, queuedSessionId, false);
    }

    return workflowRunRecord;
  }

  async startLocalWorkflowRun(
    transactionProvider: TransactionProviderInterface,
    input: WorkflowLocalRunCreateInput,
  ): Promise<WorkflowLocalRunStartRecord> {
    return transactionProvider.transaction(async (tx) => {
      await this.assertNoRunningWorkflowRunForSession(tx, input.companyId, input.sessionId);
      const preparedRun = await this.prepareWorkflowRun(tx, input);
      const workflowRun = await this.insertPreparedWorkflowRun(tx, input, input.sessionId, preparedRun);
      return {
        executionInstructions: preparedRun.prompt,
        workflowRun,
      };
    });
  }

  async startScheduledWorkflowRun(
    transactionProvider: TransactionProviderInterface,
    input: {
      bullmqJobId?: string | null;
      companyId: string;
      triggerId: string;
    },
  ): Promise<WorkflowRunRecord | null> {
    void input.bullmqJobId;
    const trigger = await transactionProvider.transaction(async (tx) => {
      const triggerRecord = await this.requireCronTriggerRow(tx, input.companyId, input.triggerId);
      if (!triggerRecord.enabled) {
        return null;
      }
      const workflowRow = await this.requireWorkflowDefinitionRow(
        tx,
        input.companyId,
        triggerRecord.workflowDefinitionId,
      );
      if (!workflowRow.isEnabled) {
        return null;
      }
      if (await this.hasRunningRunForTrigger(tx, input.companyId, input.triggerId)) {
        return null;
      }
      return triggerRecord;
    });
    if (!trigger) {
      return null;
    }

    return this.startWorkflowRun(transactionProvider, {
      agentId: trigger.agentId,
      companyId: input.companyId,
      inputValues: trigger.inputValues.map((inputValue) => ({
        name: inputValue.name,
        value: inputValue.value,
      })),
      source: "scheduled",
      triggerId: trigger.id,
      workflowDefinitionId: trigger.workflowDefinitionId,
    });
  }

  private async prepareWorkflowRun(
    tx: AppRuntimeTransaction,
    input: WorkflowRunCreateInput,
  ): Promise<PreparedWorkflowRun> {
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
      inputValues: Object.entries(templateValues).map(([name, value]) => ({
        name,
        value,
      })),
      instructions,
      steps: stepSnapshots,
      workflowDescription: workflowRow.description,
      workflowName: workflowRow.name,
    });

    return {
      instructions,
      prompt,
      stepSnapshots,
      workflowRunId,
    };
  }

  private async insertPreparedWorkflowRun(
    tx: AppRuntimeTransaction,
    input: WorkflowRunCreateInput,
    sessionId: string,
    preparedRun: PreparedWorkflowRun,
  ): Promise<WorkflowRunRecord> {
    const now = new Date();
    await tx
      .insert(workflowRuns)
      .values({
        agentId: input.agentId,
        companyId: input.companyId,
        completedAt: null,
        createdAt: now,
        id: preparedRun.workflowRunId,
        instructions: preparedRun.instructions,
        parentWorkflowRunId: input.parentWorkflowRunId ?? null,
        sessionId,
        source: input.source ?? "manual",
        startedAt: now,
        startedByAgentId: input.startedByAgentId ?? null,
        startedBySessionId: input.startedBySessionId ?? null,
        startedByUserId: input.startedByUserId ?? null,
        status: "running",
        triggerId: input.triggerId ?? null,
        updatedAt: now,
        workflowDefinitionId: input.workflowDefinitionId,
      });

    await tx
      .insert(workflowRunSteps)
      .values(preparedRun.stepSnapshots.map((step) => ({
        companyId: input.companyId,
        id: step.id,
        instructions: step.instructions,
        name: step.name,
        ordinal: step.ordinal,
        status: step.status,
        workflowRunId: preparedRun.workflowRunId,
      })));

    return this.requireWorkflowRun(tx, input.companyId, preparedRun.workflowRunId);
  }

  private async hydrateWorkflowRows(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowRows: WorkflowDefinitionRow[],
  ): Promise<WorkflowRecord[]> {
    const workflowDefinitionIds = workflowRows.map((workflowRow) => workflowRow.id);
    const inputsByWorkflowDefinitionId = await this.loadInputsByWorkflowDefinitionId(tx, companyId, workflowDefinitionIds);
    const stepsByWorkflowDefinitionId = await this.loadStepsByWorkflowDefinitionId(tx, workflowDefinitionIds);
    const triggersByWorkflowDefinitionId = await this.loadTriggersByWorkflowDefinitionId(tx, companyId, workflowDefinitionIds);

    return workflowRows.map((workflowRow) => ({
      createdAt: workflowRow.createdAt,
      description: workflowRow.description,
      id: workflowRow.id,
      inputs: inputsByWorkflowDefinitionId.get(workflowRow.id) ?? [],
      instructions: workflowRow.instructions,
      isEnabled: workflowRow.isEnabled,
      name: workflowRow.name,
      steps: stepsByWorkflowDefinitionId.get(workflowRow.id) ?? [],
      triggers: triggersByWorkflowDefinitionId.get(workflowRow.id) ?? [],
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

  private async assertNoRunningWorkflowRunForSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    sessionId: string,
  ): Promise<void> {
    const [runningRunRow] = await tx
      .select({
        id: workflowRuns.id,
      })
      .from(workflowRuns)
      .where(and(
        eq(workflowRuns.companyId, companyId),
        eq(workflowRuns.sessionId, sessionId),
        eq(workflowRuns.status, "running"),
      )) as Array<{ id: string }>;
    if (runningRunRow) {
      throw new Error("This chat already has a running workflow.");
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

  private async requireCronTriggerRow(
    tx: AppRuntimeTransaction,
    companyId: string,
    triggerId: string,
  ): Promise<WorkflowCronTriggerRecord> {
    const [triggerRow] = await this.loadCronTriggerRows(tx, companyId, [triggerId]);
    if (!triggerRow) {
      throw new Error("Workflow trigger not found.");
    }

    return triggerRow;
  }

  private async loadTriggersByWorkflowDefinitionId(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowDefinitionIds: string[],
  ): Promise<Map<string, WorkflowCronTriggerRecord[]>> {
    if (workflowDefinitionIds.length === 0) {
      return new Map();
    }

    const triggerRows = await this.loadCronTriggerRowsByWorkflowDefinitionId(tx, companyId, workflowDefinitionIds);
    const triggersByWorkflowDefinitionId = new Map<string, WorkflowCronTriggerRecord[]>();
    for (const triggerRow of triggerRows) {
      const workflowTriggersForDefinition = triggersByWorkflowDefinitionId.get(triggerRow.workflowDefinitionId) ?? [];
      workflowTriggersForDefinition.push(triggerRow);
      triggersByWorkflowDefinitionId.set(triggerRow.workflowDefinitionId, workflowTriggersForDefinition);
    }

    return triggersByWorkflowDefinitionId;
  }

  private async loadCronTriggerRows(
    tx: AppRuntimeTransaction,
    companyId: string,
    triggerIds: string[],
  ): Promise<WorkflowCronTriggerRecord[]> {
    if (triggerIds.length === 0) {
      return [];
    }

    const triggerRows = await tx
      .select(this.getWorkflowCronTriggerSelection())
      .from(workflowTriggers)
      .innerJoin(workflowCronTriggers, eq(workflowCronTriggers.triggerId, workflowTriggers.id))
      .innerJoin(agents, eq(agents.id, workflowTriggers.agentId))
      .where(and(
        eq(workflowTriggers.companyId, companyId),
        inArray(workflowTriggers.id, triggerIds),
      )) as WorkflowCronTriggerRow[];

    return this.hydrateTriggerRows(tx, companyId, triggerRows);
  }

  private async loadCronTriggerRowsByWorkflowDefinitionId(
    tx: AppRuntimeTransaction,
    companyId: string,
    workflowDefinitionIds: string[],
  ): Promise<WorkflowCronTriggerRecord[]> {
    const triggerRows = await tx
      .select(this.getWorkflowCronTriggerSelection())
      .from(workflowTriggers)
      .innerJoin(workflowCronTriggers, eq(workflowCronTriggers.triggerId, workflowTriggers.id))
      .innerJoin(agents, eq(agents.id, workflowTriggers.agentId))
      .where(and(
        eq(workflowTriggers.companyId, companyId),
        inArray(workflowTriggers.workflowDefinitionId, workflowDefinitionIds),
      )) as WorkflowCronTriggerRow[];
    triggerRows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return this.hydrateTriggerRows(tx, companyId, triggerRows);
  }

  private async hydrateTriggerRows(
    tx: AppRuntimeTransaction,
    companyId: string,
    triggerRows: WorkflowCronTriggerRow[],
  ): Promise<WorkflowCronTriggerRecord[]> {
    const triggerIds = triggerRows.map((triggerRow) => triggerRow.id);
    const inputValuesByTriggerId = await this.loadInputValuesByTriggerId(tx, companyId, triggerIds);

    return triggerRows.map((triggerRow) => ({
      ...triggerRow,
      inputValues: inputValuesByTriggerId.get(triggerRow.id) ?? [],
    }));
  }

  private async loadInputValuesByTriggerId(
    tx: AppRuntimeTransaction,
    companyId: string,
    triggerIds: string[],
  ): Promise<Map<string, WorkflowTriggerInputValueRow[]>> {
    if (triggerIds.length === 0) {
      return new Map();
    }

    const inputRows = await tx
      .select({
        id: workflowTriggerInputValues.id,
        name: workflowTriggerInputValues.name,
        triggerId: workflowTriggerInputValues.triggerId,
        value: workflowTriggerInputValues.value,
      })
      .from(workflowTriggerInputValues)
      .where(and(
        eq(workflowTriggerInputValues.companyId, companyId),
        inArray(workflowTriggerInputValues.triggerId, triggerIds),
      )) as WorkflowTriggerInputValueRow[];
    inputRows.sort((left, right) => left.name.localeCompare(right.name));

    const inputValuesByTriggerId = new Map<string, WorkflowTriggerInputValueRow[]>();
    for (const inputRow of inputRows) {
      const triggerInputValues = inputValuesByTriggerId.get(inputRow.triggerId) ?? [];
      triggerInputValues.push(inputRow);
      inputValuesByTriggerId.set(inputRow.triggerId, triggerInputValues);
    }

    return inputValuesByTriggerId;
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

  private async replaceTriggerInputValues(
    tx: AppRuntimeTransaction,
    companyId: string,
    triggerId: string,
    values: Record<string, string>,
  ): Promise<void> {
    const inputEntries = Object.entries(values);
    if (inputEntries.length === 0) {
      return;
    }

    const now = new Date();
    await tx
      .insert(workflowTriggerInputValues)
      .values(inputEntries.map(([name, value]) => ({
        companyId,
        createdAt: now,
        id: randomUUID(),
        name,
        triggerId,
        updatedAt: now,
        value,
      })));
  }

  private async hasRunningRunForTrigger(
    tx: AppRuntimeTransaction,
    companyId: string,
    triggerId: string,
  ): Promise<boolean> {
    const [runRow] = await tx
      .select({
        id: workflowRuns.id,
      })
      .from(workflowRuns)
      .where(and(
        eq(workflowRuns.companyId, companyId),
        eq(workflowRuns.triggerId, triggerId),
        eq(workflowRuns.status, "running"),
      )) as Array<{ id: string }>;

    return Boolean(runRow);
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

  private assertCron(cronPattern: string, timezone: string): void {
    this.assertText(cronPattern, "cron pattern is required.");
    this.assertText(timezone, "timezone is required.");
    try {
      WorkflowService.cronParser.parseExpression(cronPattern, { tz: timezone });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Invalid cron pattern.", {
        cause: error,
      });
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
      source: workflowRuns.source,
      startedAt: workflowRuns.startedAt,
      status: workflowRuns.status,
      triggerId: workflowRuns.triggerId,
      updatedAt: workflowRuns.updatedAt,
      workflowDefinitionId: workflowRuns.workflowDefinitionId,
    };
  }

  private getWorkflowCronTriggerSelection() {
    return {
      agentId: workflowTriggers.agentId,
      agentName: agents.name,
      createdAt: workflowTriggers.createdAt,
      cronPattern: workflowCronTriggers.cronPattern,
      enabled: workflowTriggers.enabled,
      id: workflowTriggers.id,
      overlapPolicy: workflowTriggers.overlapPolicy,
      timezone: workflowCronTriggers.timezone,
      type: workflowTriggers.type,
      updatedAt: workflowTriggers.updatedAt,
      workflowDefinitionId: workflowTriggers.workflowDefinitionId,
    };
  }
}
