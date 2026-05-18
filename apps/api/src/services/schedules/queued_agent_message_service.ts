import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentSessions,
  queuedAgentMessageSchedules,
  schedules,
  sessionQueuedMessageContents,
  sessionQueuedMessages,
} from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";
import { ScheduleRunService } from "./run_service.ts";

type CronParserRuntime = {
  parseExpression(cronPattern: string, options: { tz: string }): unknown;
};

type ScheduleSessionRow = {
  status: string;
};

type QueuedAgentMessageScheduleRow = {
  companyId: string;
  createdAt: Date;
  cronPattern: string;
  enabled: boolean;
  id: string;
  sessionId: string;
  shouldSteer: boolean;
  text: string;
  timezone: string;
  updatedAt: Date;
};

export type QueuedAgentMessageScheduleRecord = QueuedAgentMessageScheduleRow;

/**
 * Owns durable cron schedules that enqueue future prompts into an existing agent session. The
 * service keeps session wake semantics aligned with the normal prompt ingress path while recording
 * schedule-run outcomes separately from transient queued rows.
 */
@injectable()
export class QueuedAgentMessageScheduleService {
  private static readonly cronParser = createRequire(import.meta.url)("cron-parser") as CronParserRuntime;

  constructor(
    @inject(SessionManagerService)
    private readonly sessionManagerService: SessionManagerService,
    @inject(ScheduleRunService)
    private readonly scheduleRunService: ScheduleRunService,
  ) {}

  async createSchedule(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      cronPattern: string;
      sessionId: string;
      shouldSteer?: boolean | null;
      text: string;
      timezone: string;
    },
  ): Promise<QueuedAgentMessageScheduleRecord> {
    this.assertCron(input.cronPattern, input.timezone);
    this.assertText(input.text, "text is required.");

    return transactionProvider.transaction(async (tx) => {
      await this.requireLiveSession(tx, input.companyId, input.sessionId);
      const now = new Date();
      const scheduleId = randomUUID();

      await tx.insert(schedules).values({
        companyId: input.companyId,
        createdAt: now,
        enabled: true,
        id: scheduleId,
        type: "queued_agent_message",
        updatedAt: now,
      });
      await tx.insert(queuedAgentMessageSchedules).values({
        companyId: input.companyId,
        createdAt: now,
        cronPattern: input.cronPattern,
        scheduleId,
        sessionId: input.sessionId,
        shouldSteer: input.shouldSteer ?? false,
        text: input.text,
        timezone: input.timezone,
        updatedAt: now,
      });

      return this.requireSchedule(tx, input.companyId, scheduleId);
    });
  }

  async startScheduledMessage(
    transactionProvider: TransactionProviderInterface,
    input: {
      bullmqJobId?: string | null;
      companyId: string;
      scheduleId: string;
    },
  ): Promise<{ queuedMessageId: string; scheduleId: string; sessionId: string } | null> {
    const schedule = await transactionProvider.transaction(async (tx) => {
      return this.loadSchedule(tx, input.companyId, input.scheduleId);
    });
    if (!schedule) {
      return null;
    }

    const scheduleRun = await this.scheduleRunService.startRun(transactionProvider, {
      bullmqJobId: input.bullmqJobId,
      companyId: input.companyId,
      scheduleId: input.scheduleId,
    });

    try {
      if (!schedule.enabled) {
        await this.scheduleRunService.markSkipped(transactionProvider, {
          companyId: input.companyId,
          reason: "schedule is disabled",
          runId: scheduleRun.id,
        });
        return null;
      }

      const queuedMessageId = await transactionProvider.transaction(async (tx) => {
        const session = await this.requireLiveSession(tx, input.companyId, schedule.sessionId);
        const timestamp = new Date();
        const queuedMessageId = randomUUID();
        await tx
          .update(agentSessions)
          .set({
            lastUserMessageAt: timestamp,
            status: session.status === "running" ? "running" : "queued",
            updated_at: timestamp,
          })
          .where(and(
            eq(agentSessions.companyId, input.companyId),
            eq(agentSessions.id, schedule.sessionId),
          ));

        await tx.insert(sessionQueuedMessages).values({
          claimedAt: null,
          companyId: input.companyId,
          createdAt: timestamp,
          dispatchedAt: null,
          id: queuedMessageId,
          principalAgentId: null,
          principalSessionId: null,
          principalType: "schedule",
          sessionId: schedule.sessionId,
          shouldSteer: schedule.shouldSteer,
          status: "pending",
          taskRunId: null,
          updatedAt: timestamp,
          workflowRunId: null,
        });
        await tx.insert(sessionQueuedMessageContents).values({
          arguments: null,
          companyId: input.companyId,
          createdAt: timestamp,
          data: null,
          id: randomUUID(),
          mimeType: null,
          sessionQueuedMessageId: queuedMessageId,
          structuredContent: null,
          text: schedule.text,
          toolCallId: null,
          toolName: null,
          type: "text",
          updatedAt: timestamp,
        });

        return queuedMessageId;
      });

      await this.sessionManagerService.notifyQueuedSessionMessage(
        input.companyId,
        schedule.sessionId,
        schedule.shouldSteer,
      );
      await this.scheduleRunService.markDone(transactionProvider, {
        companyId: input.companyId,
        queuedMessageId,
        runId: scheduleRun.id,
        sessionId: schedule.sessionId,
      });

      return {
        queuedMessageId,
        scheduleId: schedule.id,
        sessionId: schedule.sessionId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to queue scheduled agent message.";
      const skippedReason = errorMessage === "Archived sessions cannot receive scheduled messages."
        ? "target session is archived"
        : null;
      if (skippedReason) {
        await this.scheduleRunService.markSkipped(transactionProvider, {
          companyId: input.companyId,
          reason: skippedReason,
          runId: scheduleRun.id,
        });
        return null;
      }

      await this.scheduleRunService.markFailed(transactionProvider, {
        companyId: input.companyId,
        errorMessage,
        runId: scheduleRun.id,
      });
      throw error;
    }
  }

  private async requireSchedule(
    tx: AppRuntimeTransaction,
    companyId: string,
    scheduleId: string,
  ): Promise<QueuedAgentMessageScheduleRecord> {
    const schedule = await this.loadSchedule(tx, companyId, scheduleId);
    if (!schedule) {
      throw new Error("Queued agent message schedule not found.");
    }

    return schedule;
  }

  private async loadSchedule(
    tx: AppRuntimeTransaction,
    companyId: string,
    scheduleId: string,
  ): Promise<QueuedAgentMessageScheduleRecord | null> {
    const [schedule] = await tx
      .select({
        companyId: queuedAgentMessageSchedules.companyId,
        createdAt: queuedAgentMessageSchedules.createdAt,
        cronPattern: queuedAgentMessageSchedules.cronPattern,
        enabled: schedules.enabled,
        id: queuedAgentMessageSchedules.scheduleId,
        sessionId: queuedAgentMessageSchedules.sessionId,
        shouldSteer: queuedAgentMessageSchedules.shouldSteer,
        text: queuedAgentMessageSchedules.text,
        timezone: queuedAgentMessageSchedules.timezone,
        updatedAt: queuedAgentMessageSchedules.updatedAt,
      })
      .from(queuedAgentMessageSchedules)
      .innerJoin(schedules, eq(schedules.id, queuedAgentMessageSchedules.scheduleId))
      .where(and(
        eq(queuedAgentMessageSchedules.companyId, companyId),
        eq(queuedAgentMessageSchedules.scheduleId, scheduleId),
      )) as QueuedAgentMessageScheduleRow[];

    return schedule ?? null;
  }

  private async requireLiveSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    sessionId: string,
  ): Promise<ScheduleSessionRow> {
    const [session] = await tx
      .select({
        status: agentSessions.status,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, sessionId),
      )) as ScheduleSessionRow[];
    if (!session) {
      throw new Error("Session not found.");
    }
    if (session.status === "archived") {
      throw new Error("Archived sessions cannot receive scheduled messages.");
    }

    return session;
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
      QueuedAgentMessageScheduleService.cronParser.parseExpression(cronPattern, { tz: timezone });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Invalid cron pattern.", {
        cause: error,
      });
    }
  }
}
