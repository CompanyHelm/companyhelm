import { and, eq, inArray, isNull } from "drizzle-orm";
import { inject, injectable } from "inversify";
import type { AppRuntimeTransaction } from "../db/transaction_provider_interface.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import { agents, taskStages, taskRuns, tasks } from "../db/schema.ts";
import { ExecuteTaskTemplate } from "../prompts/execute_task_template.ts";
import { SessionManagerService } from "./agent/session/session_manager_service.ts";

export type TaskRunStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export type TaskRunServiceTaskRun = {
  agentId: string;
  agentName: string;
  createdAt: Date;
  endedReason: string | null;
  finishedAt: Date | null;
  id: string;
  lastActivityAt: Date;
  sessionId: string | null;
  startedAt: Date | null;
  status: TaskRunStatus;
  taskId: string;
  updatedAt: Date;
};

type TaskRunRow = {
  agentId: string;
  createdAt: Date;
  endedReason: string | null;
  finishedAt: Date | null;
  id: string;
  lastActivityAt: Date;
  sessionId: string | null;
  startedAt: Date | null;
  status: TaskRunStatus;
  taskId: string;
  updatedAt: Date;
};

type TaskExecutionRow = {
  assignedAgentId: string | null;
  assignedUserId: string | null;
  description: string | null;
  id: string;
  name: string;
  taskStageId: string | null;
};

type AgentRow = {
  id: string;
  name: string;
};

/**
 * Owns the persistent execution history for tasks. It creates one task run plus one backing agent
 * session per execution attempt and can list the recorded attempts for the task detail page.
 */
@injectable()
export class TaskRunService {
  private readonly executeTaskTemplate: ExecuteTaskTemplate;
  private readonly sessionManagerService: SessionManagerService;

  constructor(
    @inject(SessionManagerService) sessionManagerService: SessionManagerService,
  ) {
    this.executeTaskTemplate = new ExecuteTaskTemplate();
    this.sessionManagerService = sessionManagerService;
  }

  async listTaskRuns(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      taskId: string;
    },
  ): Promise<TaskRunServiceTaskRun[]> {
    return transactionProvider.transaction(async (tx) => {
      await this.requireTaskRow(tx, input.companyId, input.taskId);

      const taskRunRows = await tx
        .select({
          agentId: taskRuns.agentId,
          createdAt: taskRuns.createdAt,
          endedReason: taskRuns.endedReason,
          finishedAt: taskRuns.finishedAt,
          id: taskRuns.id,
          lastActivityAt: taskRuns.lastActivityAt,
          sessionId: taskRuns.sessionId,
          startedAt: taskRuns.startedAt,
          status: taskRuns.status,
          taskId: taskRuns.taskId,
          updatedAt: taskRuns.updatedAt,
        })
        .from(taskRuns)
        .where(and(
          eq(taskRuns.companyId, input.companyId),
          eq(taskRuns.taskId, input.taskId),
        )) as TaskRunRow[];
      taskRunRows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

      return this.loadSerializedTaskRuns(tx, taskRunRows);
    });
  }

  async executeTask(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      taskId: string;
      userId: string;
    },
  ): Promise<TaskRunServiceTaskRun> {
    let queuedSessionId: string | null = null;

    const taskRun = await transactionProvider.transaction(async (tx) => {
      const taskRow = await this.requireTaskRow(tx, input.companyId, input.taskId);
      if (!taskRow.assignedAgentId) {
        throw new Error(taskRow.assignedUserId
          ? "Only tasks assigned to agents can be executed."
          : "Assign this task to an agent before executing it.");
      }

      const [openTaskRun] = await tx
        .select({
          agentId: taskRuns.agentId,
          createdAt: taskRuns.createdAt,
          endedReason: taskRuns.endedReason,
          finishedAt: taskRuns.finishedAt,
          id: taskRuns.id,
          lastActivityAt: taskRuns.lastActivityAt,
          sessionId: taskRuns.sessionId,
          startedAt: taskRuns.startedAt,
          status: taskRuns.status,
          taskId: taskRuns.taskId,
          updatedAt: taskRuns.updatedAt,
        })
        .from(taskRuns)
        .where(and(
          eq(taskRuns.companyId, input.companyId),
          eq(taskRuns.taskId, input.taskId),
          isNull(taskRuns.finishedAt),
        )) as TaskRunRow[];
      if (openTaskRun?.sessionId) {
        return (await this.loadSerializedTaskRuns(tx, [openTaskRun]))[0]!;
      }
      if (openTaskRun && !openTaskRun.sessionId) {
        const now = new Date();
        await tx
          .update(taskRuns)
          .set({
            endedReason: "missing_session",
            finishedAt: now,
            lastActivityAt: now,
            status: "canceled",
            updatedAt: now,
          })
          .where(and(
            eq(taskRuns.companyId, input.companyId),
            eq(taskRuns.id, openTaskRun.id),
          ));
      }

      const taskStageName = await this.loadTaskStageName(tx, input.companyId, taskRow.taskStageId);
      const sessionRecord = await this.sessionManagerService.createSessionInTransaction(
        tx as never,
        tx as never,
        input.companyId,
        taskRow.assignedAgentId,
        this.executeTaskTemplate.render({
          description: taskRow.description,
          id: taskRow.id,
          name: taskRow.name,
          taskStageName,
        }),
        {
          userId: input.userId,
        },
      );
      queuedSessionId = sessionRecord.id;
      const now = new Date();
      const [createdTaskRun] = await tx
        .insert(taskRuns)
        .values({
          agentId: taskRow.assignedAgentId,
          companyId: input.companyId,
          createdAt: now,
          createdByAgentId: null,
          createdByUserId: input.userId,
          endedReason: null,
          finishedAt: null,
          lastActivityAt: now,
          sessionId: sessionRecord.id,
          startedAt: now,
          status: "running",
          taskId: input.taskId,
          updatedAt: now,
        })
        .returning({
          agentId: taskRuns.agentId,
          createdAt: taskRuns.createdAt,
          endedReason: taskRuns.endedReason,
          finishedAt: taskRuns.finishedAt,
          id: taskRuns.id,
          lastActivityAt: taskRuns.lastActivityAt,
          sessionId: taskRuns.sessionId,
          startedAt: taskRuns.startedAt,
          status: taskRuns.status,
          taskId: taskRuns.taskId,
          updatedAt: taskRuns.updatedAt,
        }) as TaskRunRow[];
      if (!createdTaskRun) {
        throw new Error("Failed to create task run.");
      }

      await tx
        .update(tasks)
        .set({
          status: "in_progress",
          updatedAt: now,
        })
        .where(and(
          eq(tasks.companyId, input.companyId),
          eq(tasks.id, input.taskId),
        ));

      return (await this.loadSerializedTaskRuns(tx, [createdTaskRun]))[0]!;
    });

    if (queuedSessionId) {
      await this.sessionManagerService.notifyQueuedSessionMessage(input.companyId, queuedSessionId, false);
    }

    return taskRun;
  }
  private async loadSerializedTaskRuns(
    tx: AppRuntimeTransaction,
    taskRunRows: TaskRunRow[],
  ): Promise<TaskRunServiceTaskRun[]> {
    const agentNameById = await this.loadAgentNameById(tx, taskRunRows);

    return taskRunRows.map((taskRunRow) => ({
      agentId: taskRunRow.agentId,
      agentName: agentNameById.get(taskRunRow.agentId) ?? "Unknown agent",
      createdAt: taskRunRow.createdAt,
      endedReason: taskRunRow.endedReason,
      finishedAt: taskRunRow.finishedAt,
      id: taskRunRow.id,
      lastActivityAt: taskRunRow.lastActivityAt,
      sessionId: taskRunRow.sessionId,
      startedAt: taskRunRow.startedAt,
      status: taskRunRow.status,
      taskId: taskRunRow.taskId,
      updatedAt: taskRunRow.updatedAt,
    }));
  }

  private async loadAgentNameById(
    tx: AppRuntimeTransaction,
    taskRunRows: TaskRunRow[],
  ): Promise<Map<string, string>> {
    const agentIds = [...new Set(taskRunRows.map((taskRunRow) => taskRunRow.agentId))];
    if (agentIds.length === 0) {
      return new Map();
    }

    const agentRows = await tx
      .select({
        id: agents.id,
        name: agents.name,
      })
      .from(agents)
      .where(inArray(agents.id, agentIds)) as AgentRow[];

    return new Map(agentRows.map((agentRow) => [agentRow.id, agentRow.name]));
  }

  private async loadTaskStageName(
    tx: AppRuntimeTransaction,
    companyId: string,
    taskStageId: string | null,
  ): Promise<string | null> {
    if (!taskStageId) {
      return null;
    }

    const [taskStageRow] = await tx
      .select({
        id: taskStages.id,
        name: taskStages.name,
      })
      .from(taskStages)
      .where(and(
        eq(taskStages.companyId, companyId),
        eq(taskStages.id, taskStageId),
      )) as Array<{ id: string; name: string }>;

    return taskStageRow?.name ?? null;
  }

  private async requireTaskRow(
    tx: AppRuntimeTransaction,
    companyId: string,
    taskId: string,
  ): Promise<TaskExecutionRow> {
    const [taskRow] = await tx
      .select({
        assignedAgentId: tasks.assignedAgentId,
        assignedUserId: tasks.assignedUserId,
        description: tasks.description,
        id: tasks.id,
        name: tasks.name,
        taskStageId: tasks.taskStageId,
      })
      .from(tasks)
      .where(and(
        eq(tasks.companyId, companyId),
        eq(tasks.id, taskId),
      )) as TaskExecutionRow[];
    if (!taskRow) {
      throw new Error("Task not found.");
    }

    return taskRow;
  }
}
