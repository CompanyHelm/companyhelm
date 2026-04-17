import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { parseExpression } from "cron-parser";
import { injectable } from "inversify";
import { agents, routineCronTriggers, routineRuns, routineTriggers, routines } from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type {
  RoutineCreateInput,
  RoutineCronTriggerCreateInput,
  RoutineCronTriggerRecord,
  RoutineCronTriggerScheduleRecord,
  RoutineCronTriggerUpdateInput,
  RoutineRecord,
  RoutineRunRecord,
  RoutineUpdateInput,
} from "./types.ts";

type RoutineRow = {
  assignedAgentId: string;
  assignedAgentName: string;
  createdAt: Date;
  enabled: boolean;
  id: string;
  instructions: string;
  name: string;
  overlapPolicy: "skip";
  sessionId: string | null;
  updatedAt: Date;
};

type RoutineCronTriggerRow = {
  createdAt: Date;
  cronPattern: string;
  enabled: boolean;
  endAt: Date | null;
  id: string;
  limit: number | null;
  routineId: string;
  startAt: Date | null;
  timezone: string;
  type: "cron";
  updatedAt: Date;
};

type RoutineRunRow = {
  bullmqJobId: string | null;
  createdAt: Date;
  errorMessage: string | null;
  finishedAt: Date | null;
  id: string;
  routineId: string;
  sessionId: string | null;
  source: "manual" | "scheduled";
  startedAt: Date | null;
  status: "queued" | "running" | "prompt_queued" | "skipped" | "failed";
  triggerId: string | null;
  updatedAt: Date;
};

/**
 * Owns routine persistence and validation. Its scope is the durable routine catalog, cron trigger
 * definitions, and run history records; worker scheduling and session prompt execution stay in
 * separate collaborators so CRUD operations remain deterministic.
 */
@injectable()
export class RoutineService {
  async listRoutines(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<RoutineRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const routineRows = await this.loadRoutineRows(tx, companyId);
      return this.hydrateRoutineRows(tx, companyId, routineRows);
    });
  }

  async getRoutine(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    routineId: string,
  ): Promise<RoutineRecord> {
    return transactionProvider.transaction(async (tx) => {
      const routineRow = await this.requireRoutineRow(tx, companyId, routineId);
      return (await this.hydrateRoutineRows(tx, companyId, [routineRow]))[0]!;
    });
  }

  async createRoutine(
    transactionProvider: TransactionProviderInterface,
    input: RoutineCreateInput,
  ): Promise<RoutineRecord> {
    this.assertText(input.name, "name is required.");
    this.assertText(input.instructions, "instructions are required.");

    return transactionProvider.transaction(async (tx) => {
      await this.requireAgent(tx, input.companyId, input.assignedAgentId);
      const now = new Date();
      const routineId = randomUUID();
      await tx
        .insert(routines)
        .values({
          assignedAgentId: input.assignedAgentId,
          companyId: input.companyId,
          createdAt: now,
          createdByUserId: input.userId ?? null,
          enabled: input.enabled ?? true,
          id: routineId,
          instructions: input.instructions,
          name: input.name,
          overlapPolicy: "skip",
          sessionId: null,
          updatedAt: now,
          updatedByUserId: input.userId ?? null,
        });

      const routineRow = await this.requireRoutineRow(tx, input.companyId, routineId);
      return (await this.hydrateRoutineRows(tx, input.companyId, [routineRow]))[0]!;
    });
  }

  async updateRoutine(
    transactionProvider: TransactionProviderInterface,
    input: RoutineUpdateInput,
  ): Promise<RoutineRecord> {
    return transactionProvider.transaction(async (tx) => {
      const existingRoutine = await this.requireRoutineRow(tx, input.companyId, input.routineId);
      const values: Record<string, unknown> = {
        updatedAt: new Date(),
        updatedByUserId: input.userId ?? null,
      };
      if (input.name !== undefined && input.name !== null) {
        this.assertText(input.name, "name is required.");
        values.name = input.name;
      }
      if (input.instructions !== undefined && input.instructions !== null) {
        this.assertText(input.instructions, "instructions are required.");
        values.instructions = input.instructions;
      }
      if (input.enabled !== undefined && input.enabled !== null) {
        values.enabled = input.enabled;
      }
      if (input.assignedAgentId !== undefined && input.assignedAgentId !== null) {
        await this.requireAgent(tx, input.companyId, input.assignedAgentId);
        values.assignedAgentId = input.assignedAgentId;
        if (input.assignedAgentId !== existingRoutine.assignedAgentId) {
          values.sessionId = null;
        }
      }

      await tx
        .update(routines)
        .set(values)
        .where(and(
          eq(routines.companyId, input.companyId),
          eq(routines.id, input.routineId),
        ));

      const routineRow = await this.requireRoutineRow(tx, input.companyId, input.routineId);
      return (await this.hydrateRoutineRows(tx, input.companyId, [routineRow]))[0]!;
    });
  }

  async deleteRoutine(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    routineId: string,
  ): Promise<RoutineRecord> {
    return transactionProvider.transaction(async (tx) => {
      const routineRow = await this.requireRoutineRow(tx, companyId, routineId);
      const [routineRecord] = await this.hydrateRoutineRows(tx, companyId, [routineRow]);
      await tx
        .delete(routines)
        .where(and(
          eq(routines.companyId, companyId),
          eq(routines.id, routineId),
        ));
      return routineRecord!;
    });
  }

  async createCronTrigger(
    transactionProvider: TransactionProviderInterface,
    input: RoutineCronTriggerCreateInput,
  ): Promise<RoutineCronTriggerRecord> {
    this.assertCron(input.cronPattern, input.timezone);
    this.assertLimit(input.limit ?? null);

    return transactionProvider.transaction(async (tx) => {
      await this.requireRoutineRow(tx, input.companyId, input.routineId);
      const now = new Date();
      const triggerId = randomUUID();
      await tx
        .insert(routineTriggers)
        .values({
          companyId: input.companyId,
          createdAt: now,
          enabled: input.enabled ?? true,
          id: triggerId,
          routineId: input.routineId,
          type: "cron",
          updatedAt: now,
        });
      await tx
        .insert(routineCronTriggers)
        .values({
          companyId: input.companyId,
          createdAt: now,
          cronPattern: input.cronPattern,
          endAt: input.endAt ?? null,
          limit: input.limit ?? null,
          startAt: input.startAt ?? null,
          timezone: input.timezone,
          triggerId,
          updatedAt: now,
        });

      return this.requireCronTriggerRow(tx, input.companyId, triggerId);
    });
  }

  async updateCronTrigger(
    transactionProvider: TransactionProviderInterface,
    input: RoutineCronTriggerUpdateInput,
  ): Promise<RoutineCronTriggerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const existingTrigger = await this.requireCronTriggerRow(tx, input.companyId, input.triggerId);
      const nextCronPattern = input.cronPattern ?? existingTrigger.cronPattern;
      const nextTimezone = input.timezone ?? existingTrigger.timezone;
      this.assertCron(nextCronPattern, nextTimezone);
      this.assertLimit(input.limit ?? existingTrigger.limit);

      const now = new Date();
      const triggerValues: Record<string, unknown> = {
        updatedAt: now,
      };
      if (input.enabled !== undefined && input.enabled !== null) {
        triggerValues.enabled = input.enabled;
      }
      await tx
        .update(routineTriggers)
        .set(triggerValues)
        .where(and(
          eq(routineTriggers.companyId, input.companyId),
          eq(routineTriggers.id, input.triggerId),
        ));

      await tx
        .update(routineCronTriggers)
        .set({
          cronPattern: nextCronPattern,
          endAt: input.endAt === undefined ? existingTrigger.endAt : input.endAt,
          limit: input.limit === undefined ? existingTrigger.limit : input.limit,
          startAt: input.startAt === undefined ? existingTrigger.startAt : input.startAt,
          timezone: nextTimezone,
          updatedAt: now,
        })
        .where(and(
          eq(routineCronTriggers.companyId, input.companyId),
          eq(routineCronTriggers.triggerId, input.triggerId),
        ));

      return this.requireCronTriggerRow(tx, input.companyId, input.triggerId);
    });
  }

  async deleteTrigger(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    triggerId: string,
  ): Promise<RoutineCronTriggerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const triggerRecord = await this.requireCronTriggerRow(tx, companyId, triggerId);
      await tx
        .delete(routineTriggers)
        .where(and(
          eq(routineTriggers.companyId, companyId),
          eq(routineTriggers.id, triggerId),
        ));
      return triggerRecord;
    });
  }

  async listRoutineRuns(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    routineId: string,
  ): Promise<RoutineRunRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      await this.requireRoutineRow(tx, companyId, routineId);
      const runRows = await tx
        .select(this.getRoutineRunSelection())
        .from(routineRuns)
        .where(and(
          eq(routineRuns.companyId, companyId),
          eq(routineRuns.routineId, routineId),
        ))
        .orderBy(desc(routineRuns.createdAt)) as RoutineRunRow[];

      return runRows.map((runRow) => this.serializeRunRow(runRow));
    });
  }

  async listEnabledCronSchedules(
    tx: AppRuntimeTransaction,
  ): Promise<RoutineCronTriggerScheduleRecord[]> {
    const triggerRows = await tx
      .select({
        companyId: routineTriggers.companyId,
        cronPattern: routineCronTriggers.cronPattern,
        endAt: routineCronTriggers.endAt,
        id: routineTriggers.id,
        limit: routineCronTriggers.limit,
        routineId: routineTriggers.routineId,
        startAt: routineCronTriggers.startAt,
        timezone: routineCronTriggers.timezone,
      })
      .from(routineTriggers)
      .innerJoin(routines, eq(routines.id, routineTriggers.routineId))
      .innerJoin(routineCronTriggers, eq(routineCronTriggers.triggerId, routineTriggers.id))
      .where(and(
        eq(routineTriggers.enabled, true),
        eq(routines.enabled, true),
      )) as RoutineCronTriggerScheduleRecord[];

    return triggerRows;
  }

  async getCronTriggerSchedule(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    triggerId: string,
  ): Promise<RoutineCronTriggerScheduleRecord | null> {
    return transactionProvider.transaction(async (tx) => {
      const [triggerRow] = await tx
        .select({
          companyId: routineTriggers.companyId,
          cronPattern: routineCronTriggers.cronPattern,
          endAt: routineCronTriggers.endAt,
          id: routineTriggers.id,
          limit: routineCronTriggers.limit,
          routineId: routineTriggers.routineId,
          startAt: routineCronTriggers.startAt,
          timezone: routineCronTriggers.timezone,
        })
        .from(routineTriggers)
        .innerJoin(routines, eq(routines.id, routineTriggers.routineId))
        .innerJoin(routineCronTriggers, eq(routineCronTriggers.triggerId, routineTriggers.id))
        .where(and(
          eq(routineTriggers.companyId, companyId),
          eq(routineTriggers.id, triggerId),
          eq(routineTriggers.enabled, true),
          eq(routines.enabled, true),
        )) as RoutineCronTriggerScheduleRecord[];

      return triggerRow ?? null;
    });
  }

  private async hydrateRoutineRows(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineRows: RoutineRow[],
  ): Promise<RoutineRecord[]> {
    const routineIds = routineRows.map((routineRow) => routineRow.id);
    const triggersByRoutineId = await this.loadTriggersByRoutineId(tx, companyId, routineIds);
    const lastRunByRoutineId = await this.loadLastRunByRoutineId(tx, companyId, routineIds);

    return routineRows.map((routineRow) => ({
      assignedAgentId: routineRow.assignedAgentId,
      assignedAgentName: routineRow.assignedAgentName,
      createdAt: routineRow.createdAt,
      enabled: routineRow.enabled,
      id: routineRow.id,
      instructions: routineRow.instructions,
      lastRun: lastRunByRoutineId.get(routineRow.id) ?? null,
      name: routineRow.name,
      overlapPolicy: routineRow.overlapPolicy,
      sessionId: routineRow.sessionId,
      triggers: triggersByRoutineId.get(routineRow.id) ?? [],
      updatedAt: routineRow.updatedAt,
    }));
  }

  private async loadRoutineRows(
    tx: AppRuntimeTransaction,
    companyId: string,
  ): Promise<RoutineRow[]> {
    const routineRows = await tx
      .select(this.getRoutineSelection())
      .from(routines)
      .innerJoin(agents, eq(agents.id, routines.assignedAgentId))
      .where(eq(routines.companyId, companyId)) as RoutineRow[];
    routineRows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
    return routineRows;
  }

  private async requireRoutineRow(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineId: string,
  ): Promise<RoutineRow> {
    const [routineRow] = await tx
      .select(this.getRoutineSelection())
      .from(routines)
      .innerJoin(agents, eq(agents.id, routines.assignedAgentId))
      .where(and(
        eq(routines.companyId, companyId),
        eq(routines.id, routineId),
      )) as RoutineRow[];
    if (!routineRow) {
      throw new Error("Routine not found.");
    }

    return routineRow;
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
      throw new Error("Assigned agent not found.");
    }
  }

  private async loadTriggersByRoutineId(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineIds: string[],
  ): Promise<Map<string, RoutineCronTriggerRecord[]>> {
    if (routineIds.length === 0) {
      return new Map();
    }

    const triggerRows = await tx
      .select(this.getCronTriggerSelection())
      .from(routineTriggers)
      .innerJoin(routineCronTriggers, eq(routineCronTriggers.triggerId, routineTriggers.id))
      .where(and(
        eq(routineTriggers.companyId, companyId),
        inArray(routineTriggers.routineId, routineIds),
      )) as RoutineCronTriggerRow[];
    triggerRows.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

    const triggersByRoutineId = new Map<string, RoutineCronTriggerRecord[]>();
    for (const triggerRow of triggerRows) {
      const routineTriggersForRoutine = triggersByRoutineId.get(triggerRow.routineId) ?? [];
      routineTriggersForRoutine.push(this.serializeCronTriggerRow(triggerRow));
      triggersByRoutineId.set(triggerRow.routineId, routineTriggersForRoutine);
    }

    return triggersByRoutineId;
  }

  private async loadLastRunByRoutineId(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineIds: string[],
  ): Promise<Map<string, RoutineRunRecord>> {
    if (routineIds.length === 0) {
      return new Map();
    }

    const runRows = await tx
      .select(this.getRoutineRunSelection())
      .from(routineRuns)
      .where(and(
        eq(routineRuns.companyId, companyId),
        inArray(routineRuns.routineId, routineIds),
      )) as RoutineRunRow[];
    runRows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    const lastRunByRoutineId = new Map<string, RoutineRunRecord>();
    for (const runRow of runRows) {
      if (!lastRunByRoutineId.has(runRow.routineId)) {
        lastRunByRoutineId.set(runRow.routineId, this.serializeRunRow(runRow));
      }
    }

    return lastRunByRoutineId;
  }

  private async requireCronTriggerRow(
    tx: AppRuntimeTransaction,
    companyId: string,
    triggerId: string,
  ): Promise<RoutineCronTriggerRecord> {
    const [triggerRow] = await tx
      .select(this.getCronTriggerSelection())
      .from(routineTriggers)
      .innerJoin(routineCronTriggers, eq(routineCronTriggers.triggerId, routineTriggers.id))
      .where(and(
        eq(routineTriggers.companyId, companyId),
        eq(routineTriggers.id, triggerId),
      )) as RoutineCronTriggerRow[];
    if (!triggerRow) {
      throw new Error("Routine trigger not found.");
    }

    return this.serializeCronTriggerRow(triggerRow);
  }

  private getRoutineSelection() {
    return {
      assignedAgentId: routines.assignedAgentId,
      assignedAgentName: agents.name,
      createdAt: routines.createdAt,
      enabled: routines.enabled,
      id: routines.id,
      instructions: routines.instructions,
      name: routines.name,
      overlapPolicy: routines.overlapPolicy,
      sessionId: routines.sessionId,
      updatedAt: routines.updatedAt,
    };
  }

  private getCronTriggerSelection() {
    return {
      createdAt: routineTriggers.createdAt,
      cronPattern: routineCronTriggers.cronPattern,
      enabled: routineTriggers.enabled,
      endAt: routineCronTriggers.endAt,
      id: routineTriggers.id,
      limit: routineCronTriggers.limit,
      routineId: routineTriggers.routineId,
      startAt: routineCronTriggers.startAt,
      timezone: routineCronTriggers.timezone,
      type: routineTriggers.type,
      updatedAt: routineTriggers.updatedAt,
    };
  }

  private getRoutineRunSelection() {
    return {
      bullmqJobId: routineRuns.bullmqJobId,
      createdAt: routineRuns.createdAt,
      errorMessage: routineRuns.errorMessage,
      finishedAt: routineRuns.finishedAt,
      id: routineRuns.id,
      routineId: routineRuns.routineId,
      sessionId: routineRuns.sessionId,
      source: routineRuns.source,
      startedAt: routineRuns.startedAt,
      status: routineRuns.status,
      triggerId: routineRuns.triggerId,
      updatedAt: routineRuns.updatedAt,
    };
  }

  private serializeCronTriggerRow(triggerRow: RoutineCronTriggerRow): RoutineCronTriggerRecord {
    return {
      createdAt: triggerRow.createdAt,
      cronPattern: triggerRow.cronPattern,
      enabled: triggerRow.enabled,
      endAt: triggerRow.endAt,
      id: triggerRow.id,
      limit: triggerRow.limit,
      routineId: triggerRow.routineId,
      startAt: triggerRow.startAt,
      timezone: triggerRow.timezone,
      type: triggerRow.type,
      updatedAt: triggerRow.updatedAt,
    };
  }

  private serializeRunRow(runRow: RoutineRunRow): RoutineRunRecord {
    return {
      bullmqJobId: runRow.bullmqJobId,
      createdAt: runRow.createdAt,
      errorMessage: runRow.errorMessage,
      finishedAt: runRow.finishedAt,
      id: runRow.id,
      routineId: runRow.routineId,
      sessionId: runRow.sessionId,
      source: runRow.source,
      startedAt: runRow.startedAt,
      status: runRow.status,
      triggerId: runRow.triggerId,
      updatedAt: runRow.updatedAt,
    };
  }

  private assertText(value: string, message: string): void {
    if (!/\S/u.test(value)) {
      throw new Error(message);
    }
  }

  private assertCron(cronPattern: string, timezone: string): void {
    this.assertText(cronPattern, "cronPattern is required.");
    this.assertText(timezone, "timezone is required.");
    try {
      parseExpression(cronPattern, {
        tz: timezone,
      });
    } catch {
      throw new Error("Invalid cron trigger schedule.");
    }
  }

  private assertLimit(limit: number | null): void {
    if (limit !== null && (!Number.isInteger(limit) || limit <= 0)) {
      throw new Error("limit must be a positive integer.");
    }
  }
}
