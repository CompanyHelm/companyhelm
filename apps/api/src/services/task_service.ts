import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import type { AppRuntimeTransaction } from "../db/transaction_provider_interface.ts";
import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import { agents, companyMembers, taskCategories, tasks, users } from "../db/schema.ts";

export type TaskStatus = "draft" | "pending" | "in_progress" | "completed";

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

export type TaskServiceListTasksResult = {
  nextOffset: number | null;
  tasks: TaskServiceTask[];
  totalCount: number;
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
 * rules for assignee validation, category checks, status transitions, and task serialization.
 */
@injectable()
export class TaskService {
  private static readonly supportedStatuses: TaskStatus[] = ["draft", "pending", "in_progress", "completed"];

  async createTask(
    transactionProvider: TransactionProviderInterface,
    input: TaskServiceCreateTaskInput,
  ): Promise<TaskServiceTask> {
    if (!/\S/.test(input.name)) {
      throw new Error("name is required.");
    }

    return transactionProvider.transaction(async (tx) => {
      const taskCategoryRecord = await this.resolveTaskCategoryRecord(tx, input.companyId, input.taskCategoryId ?? null);
      const assignee = await this.resolveAssignee(tx, {
        assignedAgentId: input.assignedAgentId ?? null,
        assignedUserId: input.assignedUserId ?? null,
        companyId: input.companyId,
      });
      const now = new Date();
      const [taskRecord] = await tx
        .insert(tasks)
        .values({
          assignedAgentId: assignee?.kind === "agent" ? assignee.id : null,
          assignedAt: assignee ? now : null,
          assignedUserId: assignee?.kind === "user" ? assignee.id : null,
          companyId: input.companyId,
          createdAt: now,
          description: input.description ?? null,
          name: input.name,
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
        });
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

  async updateTaskStatus(
    transactionProvider: TransactionProviderInterface,
    input: TaskServiceUpdateTaskStatusInput,
  ): Promise<TaskServiceTask> {
    return transactionProvider.transaction(async (tx) => {
      const [taskRecord] = await tx
        .update(tasks)
        .set({
          status: this.resolveStatus(input.status),
          updatedAt: new Date(),
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
      if (!taskRecord) {
        throw new Error("Task not found.");
      }

      const taskCategoryNameById = await this.loadTaskCategoryNameById(tx, [taskRecord]);
      const userAssigneeById = await this.loadUserAssigneeById(tx, [taskRecord]);
      const agentAssigneeById = await this.loadAgentAssigneeById(tx, [taskRecord]);

      return this.serializeTaskRecord(taskRecord, taskCategoryNameById, userAssigneeById, agentAssigneeById);
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
