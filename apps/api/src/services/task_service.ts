import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { injectable } from "inversify";
import type { AppRuntimeTransaction } from "../db/transaction_provider_interface.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import { agents, companyMembers, taskCategories, taskRuns, tasks, users } from "../db/schema.ts";

export type TaskStatus = "draft" | "in_progress" | "completed";

export type TaskServiceTaskAssignee = {
  email: string | null;
  id: string;
  kind: "agent" | "user";
  name: string;
};

export type TaskServiceTask = {
  assignedAt: Date | null;
  assignee: TaskServiceTaskAssignee | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  status: TaskStatus;
  taskCategoryId: string | null;
  taskCategoryName: string | null;
  updatedAt: Date;
};

export type TaskServiceCreateTaskInput = {
  assignedAgentId?: string | null;
  assignedUserId?: string | null;
  companyId: string;
  createdByAgentId?: string | null;
  createdByUserId?: string | null;
  description?: string | null;
  name: string;
  status?: string | null;
  taskCategoryId?: string | null;
};

export type TaskServiceListTasksInput = {
  assignedAgentId?: string | null;
  companyId: string;
  limit?: number | null;
  offset?: number | null;
  status?: string | null;
};

export type TaskServiceGetTaskInput = {
  companyId: string;
  taskId: string;
};

export type TaskServiceListTasksResult = {
  nextOffset: number | null;
  tasks: TaskServiceTask[];
  totalCount: number;
};

export type TaskServiceUpdateTaskInput = {
  assignedAgentId?: string | null;
  assignedUserId?: string | null;
  companyId: string;
  description?: string | null;
  name?: string | null;
  status?: string | null;
  taskCategoryId?: string | null;
  taskId: string;
};

export type TaskServiceUpdateTaskStatusInput = {
  companyId: string;
  status: string;
  taskId: string;
};

type TaskRow = {
  assignedAgentId: string | null;
  assignedAt: Date | null;
  assignedUserId: string | null;
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  status: TaskStatus;
  taskCategoryId: string | null;
  updatedAt: Date;
};

type OpenTaskRunRow = {
  agentId: string;
  finishedAt: Date | null;
  id: string;
};

type TaskCategoryRow = {
  id: string;
  name: string;
};

type AgentRow = {
  id: string;
  name: string;
};

type UserRow = {
  email: string;
  firstName: string;
  id: string;
  lastName: string | null;
};

/**
 * Centralizes task persistence and validation so GraphQL handlers and agent tools share the same
 * rules for assignee validation, category checks, task tree defaults, and task-run synchronization.
 */
@injectable()
export class TaskService {
  private static readonly supportedStatuses: TaskStatus[] = ["draft", "in_progress", "completed"];

  async createTask(
    transactionProvider: TransactionProviderInterface,
    input: TaskServiceCreateTaskInput,
  ): Promise<TaskServiceTask> {
    if (!/\S/.test(input.name)) {
      throw new Error("name is required.");
    }
    if (input.createdByUserId && input.createdByAgentId) {
      throw new Error("A task can only have one creator.");
    }

    return transactionProvider.transaction(async (tx) => {
      const taskCategoryRecord = await this.resolveTaskCategoryRecord(tx, input.companyId, input.taskCategoryId ?? null);
      const assignee = await this.resolveAssignee(tx, {
        assignedAgentId: input.assignedAgentId ?? null,
        assignedUserId: input.assignedUserId ?? null,
        companyId: input.companyId,
      });
      const now = new Date();
      const taskId = randomUUID();
      const [taskRecord] = await tx
        .insert(tasks)
        .values({
          assignedAgentId: assignee?.kind === "agent" ? assignee.id : null,
          assignedAt: assignee ? now : null,
          assignedUserId: assignee?.kind === "user" ? assignee.id : null,
          companyId: input.companyId,
          createdAt: now,
          createdByAgentId: input.createdByAgentId ?? null,
          createdByUserId: input.createdByUserId ?? null,
          description: input.description ?? null,
          id: taskId,
          name: input.name,
          parentTaskId: null,
          rootTaskId: taskId,
          status: this.resolveStatus(input.status),
          taskCategoryId: taskCategoryRecord?.id ?? null,
          updatedAt: now,
        })
        .returning({
          assignedAgentId: tasks.assignedAgentId,
          assignedAt: tasks.assignedAt,
          assignedUserId: tasks.assignedUserId,
          createdAt: tasks.createdAt,
          description: tasks.description,
          id: tasks.id,
          name: tasks.name,
          status: tasks.status,
          taskCategoryId: tasks.taskCategoryId,
          updatedAt: tasks.updatedAt,
        }) as TaskRow[];
      if (!taskRecord) {
        throw new Error("Failed to create task.");
      }

      return {
        assignedAt: taskRecord.assignedAt,
        assignee,
        createdAt: taskRecord.createdAt,
        description: taskRecord.description,
        id: taskRecord.id,
        name: taskRecord.name,
        status: taskRecord.status,
        taskCategoryId: taskRecord.taskCategoryId,
        taskCategoryName: taskCategoryRecord?.name ?? null,
        updatedAt: taskRecord.updatedAt,
      };
    });
  }

  async listTasks(
    transactionProvider: TransactionProviderInterface,
    input: TaskServiceListTasksInput,
  ): Promise<TaskServiceListTasksResult> {
    return transactionProvider.transaction(async (tx) => {
      const normalizedOffset = Math.max(0, input.offset ?? 0);
      const taskRows = await tx
        .select({
          assignedAgentId: tasks.assignedAgentId,
          assignedAt: tasks.assignedAt,
          assignedUserId: tasks.assignedUserId,
          createdAt: tasks.createdAt,
          description: tasks.description,
          id: tasks.id,
          name: tasks.name,
          status: tasks.status,
          taskCategoryId: tasks.taskCategoryId,
          updatedAt: tasks.updatedAt,
        })
        .from(tasks)
        .where(this.buildTaskFilterCondition(input)) as TaskRow[];
      taskRows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
      const resolvedLimit = input.limit ?? (taskRows.length > 0 ? taskRows.length : 1);
      const normalizedLimit = Math.max(1, resolvedLimit);
      const paginatedTaskRows = taskRows.slice(normalizedOffset, normalizedOffset + normalizedLimit);
      const taskCategoryNameById = await this.loadTaskCategoryNameById(tx, paginatedTaskRows);
      const userAssigneeById = await this.loadUserAssigneeById(tx, paginatedTaskRows);
      const agentAssigneeById = await this.loadAgentAssigneeById(tx, paginatedTaskRows);

      return {
        nextOffset: normalizedOffset + paginatedTaskRows.length < taskRows.length
          ? normalizedOffset + paginatedTaskRows.length
          : null,
        tasks: paginatedTaskRows.map((taskRow) => {
          return this.serializeTaskRecord(
            taskRow,
            taskCategoryNameById,
            userAssigneeById,
            agentAssigneeById,
          );
        }),
        totalCount: taskRows.length,
      };
    });
  }

  async getTask(
    transactionProvider: TransactionProviderInterface,
    input: TaskServiceGetTaskInput,
  ): Promise<TaskServiceTask> {
    return transactionProvider.transaction(async (tx) => {
      const taskRow = await this.requireTaskRow(tx, input.companyId, input.taskId);
      return this.loadSerializedTask(tx, taskRow);
    });
  }

  async updateTask(
    transactionProvider: TransactionProviderInterface,
    input: TaskServiceUpdateTaskInput,
  ): Promise<TaskServiceTask> {
    return transactionProvider.transaction(async (tx) => {
      const existingTaskRow = await this.requireTaskRow(tx, input.companyId, input.taskId);
      const nextName = input.name === undefined
        ? existingTaskRow.name
        : this.resolveName(input.name);
      const nextDescription = input.description === undefined
        ? existingTaskRow.description
        : input.description;
      const nextStatus = input.status === undefined
        ? existingTaskRow.status
        : this.resolveStatus(input.status);
      const taskCategoryRecord = input.taskCategoryId === undefined
        ? null
        : await this.resolveTaskCategoryRecord(tx, input.companyId, input.taskCategoryId ?? null);
      const nextTaskCategoryId = input.taskCategoryId === undefined
        ? existingTaskRow.taskCategoryId
        : taskCategoryRecord?.id ?? null;
      const assignee = input.assignedAgentId === undefined && input.assignedUserId === undefined
        ? null
        : await this.resolveAssignee(tx, {
          assignedAgentId: input.assignedAgentId ?? null,
          assignedUserId: input.assignedUserId ?? null,
          companyId: input.companyId,
        });
      const nextAssignedAgentId = input.assignedAgentId === undefined && input.assignedUserId === undefined
        ? existingTaskRow.assignedAgentId
        : assignee?.kind === "agent"
          ? assignee.id
          : null;
      const nextAssignedUserId = input.assignedAgentId === undefined && input.assignedUserId === undefined
        ? existingTaskRow.assignedUserId
        : assignee?.kind === "user"
          ? assignee.id
          : null;
      const didAssigneeChange = nextAssignedAgentId !== existingTaskRow.assignedAgentId
        || nextAssignedUserId !== existingTaskRow.assignedUserId;
      const now = new Date();

      const [updatedTaskRow] = await tx
        .update(tasks)
        .set({
          assignedAgentId: nextAssignedAgentId,
          assignedAt: nextAssignedAgentId || nextAssignedUserId
            ? (didAssigneeChange ? now : existingTaskRow.assignedAt)
            : null,
          assignedUserId: nextAssignedUserId,
          description: nextDescription,
          name: nextName,
          status: nextStatus,
          taskCategoryId: nextTaskCategoryId,
          updatedAt: now,
        })
        .where(and(
          eq(tasks.companyId, input.companyId),
          eq(tasks.id, input.taskId),
        ))
        .returning({
          assignedAgentId: tasks.assignedAgentId,
          assignedAt: tasks.assignedAt,
          assignedUserId: tasks.assignedUserId,
          createdAt: tasks.createdAt,
          description: tasks.description,
          id: tasks.id,
          name: tasks.name,
          status: tasks.status,
          taskCategoryId: tasks.taskCategoryId,
          updatedAt: tasks.updatedAt,
        }) as TaskRow[];
      if (!updatedTaskRow) {
        throw new Error("Task not found.");
      }

      await this.synchronizeOpenTaskRun(tx, {
        companyId: input.companyId,
        didAssigneeChange,
        nextAssignedAgentId,
        nextAssignedUserId,
        nextStatus,
        taskId: input.taskId,
      });

      return this.loadSerializedTask(tx, updatedTaskRow);
    });
  }

  async updateTaskStatus(
    transactionProvider: TransactionProviderInterface,
    input: TaskServiceUpdateTaskStatusInput,
  ): Promise<TaskServiceTask> {
    return this.updateTask(transactionProvider, {
      companyId: input.companyId,
      status: input.status,
      taskId: input.taskId,
    });
  }

  private buildTaskFilterCondition(input: TaskServiceListTasksInput) {
    const conditions = [eq(tasks.companyId, input.companyId)];
    const status = input.status && input.status.length > 0 ? input.status : null;
    const assignedAgentId = input.assignedAgentId && input.assignedAgentId.length > 0
      ? input.assignedAgentId
      : null;

    if (status) {
      conditions.push(eq(tasks.status, this.resolveStatus(status)));
    }
    if (assignedAgentId) {
      conditions.push(eq(tasks.assignedAgentId, assignedAgentId));
    }

    return conditions.length === 1 ? conditions[0]! : and(...conditions);
  }

  private async loadAgentAssigneeById(
    tx: AppRuntimeTransaction,
    taskRows: TaskRow[],
  ): Promise<Map<string, TaskServiceTaskAssignee>> {
    const agentIds = [...new Set(
      taskRows
        .map((taskRow) => taskRow.assignedAgentId)
        .filter((assignedAgentId): assignedAgentId is string => assignedAgentId !== null),
    )];
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

    return new Map(agentRows.map((agentRow) => {
      return [agentRow.id, {
        email: null,
        id: agentRow.id,
        kind: "agent" as const,
        name: agentRow.name,
      }];
    }));
  }

  private async loadTaskCategoryNameById(
    tx: AppRuntimeTransaction,
    taskRows: TaskRow[],
  ): Promise<Map<string, string>> {
    const taskCategoryIds = [...new Set(
      taskRows
        .map((taskRow) => taskRow.taskCategoryId)
        .filter((taskCategoryId): taskCategoryId is string => taskCategoryId !== null),
    )];
    if (taskCategoryIds.length === 0) {
      return new Map();
    }

    const taskCategoryRows = await tx
      .select({
        id: taskCategories.id,
        name: taskCategories.name,
      })
      .from(taskCategories)
      .where(inArray(taskCategories.id, taskCategoryIds)) as TaskCategoryRow[];

    return new Map(taskCategoryRows.map((taskCategoryRow) => [taskCategoryRow.id, taskCategoryRow.name]));
  }

  private async loadUserAssigneeById(
    tx: AppRuntimeTransaction,
    taskRows: TaskRow[],
  ): Promise<Map<string, TaskServiceTaskAssignee>> {
    const userIds = [...new Set(
      taskRows
        .map((taskRow) => taskRow.assignedUserId)
        .filter((assignedUserId): assignedUserId is string => assignedUserId !== null),
    )];
    if (userIds.length === 0) {
      return new Map();
    }

    const userRows = await tx
      .select({
        email: users.email,
        firstName: users.first_name,
        id: users.id,
        lastName: users.last_name,
      })
      .from(users)
      .where(inArray(users.id, userIds)) as UserRow[];

    return new Map(userRows.map((userRow) => {
      return [userRow.id, {
        email: userRow.email,
        id: userRow.id,
        kind: "user" as const,
        name: this.formatUserName(userRow),
      }];
    }));
  }

  private resolveStatus(status: string | null | undefined): TaskStatus {
    if (status === undefined || status === null || status === "") {
      return "draft";
    }
    if (!TaskService.supportedStatuses.includes(status as TaskStatus)) {
      throw new Error("Unsupported task status.");
    }

    return status as TaskStatus;
  }

  private resolveName(name: string | null): string {
    if (!name || !/\S/.test(name)) {
      throw new Error("name is required.");
    }

    return name;
  }

  private async resolveTaskCategoryRecord(
    tx: AppRuntimeTransaction,
    companyId: string,
    taskCategoryId: string | null,
  ): Promise<TaskCategoryRow | null> {
    if (!taskCategoryId) {
      return null;
    }

    const [taskCategoryRecord] = await tx
      .select({
        id: taskCategories.id,
        name: taskCategories.name,
      })
      .from(taskCategories)
      .where(and(
        eq(taskCategories.companyId, companyId),
        eq(taskCategories.id, taskCategoryId),
      )) as TaskCategoryRow[];
    if (!taskCategoryRecord) {
      throw new Error("Task category not found.");
    }

    return taskCategoryRecord;
  }

  private async resolveAssignee(
    tx: AppRuntimeTransaction,
    input: {
      assignedAgentId: string | null;
      assignedUserId: string | null;
      companyId: string;
    },
  ): Promise<TaskServiceTaskAssignee | null> {
    if (input.assignedAgentId && input.assignedUserId) {
      throw new Error("A task can only have one assignee.");
    }
    if (input.assignedAgentId) {
      return this.resolveAgentAssignee(tx, input.companyId, input.assignedAgentId);
    }
    if (input.assignedUserId) {
      return this.resolveUserAssignee(tx, input.companyId, input.assignedUserId);
    }

    return null;
  }

  private async resolveAgentAssignee(
    tx: AppRuntimeTransaction,
    companyId: string,
    assignedAgentId: string,
  ): Promise<TaskServiceTaskAssignee> {
    const [agentRecord] = await tx
      .select({
        id: agents.id,
        name: agents.name,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, assignedAgentId),
      )) as AgentRow[];
    if (!agentRecord) {
      throw new Error("Assigned agent not found.");
    }

    return {
      email: null,
      id: agentRecord.id,
      kind: "agent",
      name: agentRecord.name,
    };
  }

  private async resolveUserAssignee(
    tx: AppRuntimeTransaction,
    companyId: string,
    assignedUserId: string,
  ): Promise<TaskServiceTaskAssignee> {
    const [membershipRecord] = await tx
      .select({
        userId: companyMembers.userId,
      })
      .from(companyMembers)
      .where(and(
        eq(companyMembers.companyId, companyId),
        eq(companyMembers.userId, assignedUserId),
      )) as Array<{ userId: string }>;
    if (!membershipRecord) {
      throw new Error("Assigned user not found.");
    }

    const [userRecord] = await tx
      .select({
        email: users.email,
        firstName: users.first_name,
        id: users.id,
        lastName: users.last_name,
      })
      .from(users)
      .where(eq(users.id, assignedUserId)) as UserRow[];
    if (!userRecord) {
      throw new Error("Assigned user not found.");
    }

    return {
      email: userRecord.email,
      id: userRecord.id,
      kind: "user",
      name: this.formatUserName(userRecord),
    };
  }

  private async synchronizeOpenTaskRun(
    tx: AppRuntimeTransaction,
    input: {
      companyId: string;
      didAssigneeChange: boolean;
      nextAssignedAgentId: string | null;
      nextAssignedUserId: string | null;
      nextStatus: TaskStatus;
      taskId: string;
    },
  ): Promise<void> {
    const [openTaskRun] = await tx
      .select({
        agentId: taskRuns.agentId,
        finishedAt: taskRuns.finishedAt,
        id: taskRuns.id,
      })
      .from(taskRuns)
      .where(and(
        eq(taskRuns.companyId, input.companyId),
        eq(taskRuns.taskId, input.taskId),
        isNull(taskRuns.finishedAt),
      )) as OpenTaskRunRow[];
    if (!openTaskRun) {
      return;
    }

    const now = new Date();
    if (input.nextStatus === "completed") {
      await tx
        .update(taskRuns)
        .set({
          endedReason: null,
          finishedAt: openTaskRun.finishedAt ?? now,
          lastActivityAt: now,
          status: "completed",
          updatedAt: now,
        })
        .where(and(
          eq(taskRuns.companyId, input.companyId),
          eq(taskRuns.id, openTaskRun.id),
        ));
      return;
    }

    const shouldCancelRun = input.nextStatus === "draft"
      || input.didAssigneeChange
      || input.nextAssignedUserId !== null
      || input.nextAssignedAgentId === null
      || openTaskRun.agentId !== input.nextAssignedAgentId;
    if (!shouldCancelRun) {
      return;
    }

    await tx
      .update(taskRuns)
      .set({
        endedReason: input.nextStatus === "draft" ? "task_reset_to_draft" : "task_reassigned",
        finishedAt: openTaskRun.finishedAt ?? now,
        lastActivityAt: now,
        status: "canceled",
        updatedAt: now,
      })
      .where(and(
        eq(taskRuns.companyId, input.companyId),
        eq(taskRuns.id, openTaskRun.id),
      ));
  }

  private async requireTaskRow(
    tx: AppRuntimeTransaction,
    companyId: string,
    taskId: string,
  ): Promise<TaskRow> {
    const [taskRow] = await tx
      .select({
        assignedAgentId: tasks.assignedAgentId,
        assignedAt: tasks.assignedAt,
        assignedUserId: tasks.assignedUserId,
        createdAt: tasks.createdAt,
        description: tasks.description,
        id: tasks.id,
        name: tasks.name,
        status: tasks.status,
        taskCategoryId: tasks.taskCategoryId,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(
        eq(tasks.companyId, companyId),
        eq(tasks.id, taskId),
      )) as TaskRow[];
    if (!taskRow) {
      throw new Error("Task not found.");
    }

    return taskRow;
  }

  private async loadSerializedTask(
    tx: AppRuntimeTransaction,
    taskRow: TaskRow,
  ): Promise<TaskServiceTask> {
    const taskCategoryNameById = await this.loadTaskCategoryNameById(tx, [taskRow]);
    const userAssigneeById = await this.loadUserAssigneeById(tx, [taskRow]);
    const agentAssigneeById = await this.loadAgentAssigneeById(tx, [taskRow]);
    return this.serializeTaskRecord(taskRow, taskCategoryNameById, userAssigneeById, agentAssigneeById);
  }

  private serializeTaskRecord(
    taskRow: TaskRow,
    taskCategoryNameById: Map<string, string>,
    userAssigneeById: Map<string, TaskServiceTaskAssignee>,
    agentAssigneeById: Map<string, TaskServiceTaskAssignee>,
  ): TaskServiceTask {
    const assignee = taskRow.assignedUserId
      ? userAssigneeById.get(taskRow.assignedUserId) ?? null
      : taskRow.assignedAgentId
        ? agentAssigneeById.get(taskRow.assignedAgentId) ?? null
        : null;

    return {
      assignedAt: taskRow.assignedAt,
      assignee,
      createdAt: taskRow.createdAt,
      description: taskRow.description,
      id: taskRow.id,
      name: taskRow.name,
      status: taskRow.status,
      taskCategoryId: taskRow.taskCategoryId,
      taskCategoryName: taskRow.taskCategoryId ? taskCategoryNameById.get(taskRow.taskCategoryId) ?? null : null,
      updatedAt: taskRow.updatedAt,
    };
  }

  private formatUserName(userRow: UserRow): string {
    return userRow.lastName ? `${userRow.firstName} ${userRow.lastName}` : userRow.firstName;
  }
}
