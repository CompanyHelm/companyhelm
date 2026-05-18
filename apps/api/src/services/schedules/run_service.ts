import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { scheduleRuns } from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import type { ScheduleRunRecord } from "./types.ts";

/**
 * Persists one durable execution record for each fired schedule so operators can distinguish the
 * schedule definition from its individual workflow starts, skips, failures, and queued messages.
 */
@injectable()
export class ScheduleRunService {
  async startRun(
    transactionProvider: TransactionProviderInterface,
    input: {
      bullmqJobId?: string | null;
      companyId: string;
      scheduleId: string;
    },
  ): Promise<ScheduleRunRecord> {
    return transactionProvider.transaction(async (tx) => this.startRunInTransaction(tx, input));
  }

  async startRunInTransaction(
    tx: AppRuntimeTransaction,
    input: {
      bullmqJobId?: string | null;
      companyId: string;
      scheduleId: string;
    },
  ): Promise<ScheduleRunRecord> {
    const now = new Date();
    const [run] = await tx
      .insert(scheduleRuns)
      .values({
        bullmqJobId: input.bullmqJobId ?? null,
        companyId: input.companyId,
        completedAt: null,
        createdAt: now,
        errorMessage: null,
        id: randomUUID(),
        queuedMessageId: null,
        scheduleId: input.scheduleId,
        sessionId: null,
        skippedReason: null,
        startedAt: now,
        status: "running",
        updatedAt: now,
        workflowRunId: null,
      })
      .returning(this.getSelection()) as ScheduleRunRecord[];
    if (!run) {
      throw new Error("Failed to create schedule run.");
    }

    return run;
  }

  async markDone(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      queuedMessageId?: string | null;
      runId: string;
      sessionId?: string | null;
      workflowRunId?: string | null;
    },
  ): Promise<ScheduleRunRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.markRun(tx, input.companyId, input.runId, {
        completedAt: new Date(),
        errorMessage: null,
        queuedMessageId: input.queuedMessageId ?? null,
        sessionId: input.sessionId ?? null,
        skippedReason: null,
        status: "done",
        workflowRunId: input.workflowRunId ?? null,
      });
    });
  }

  async markSkipped(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      reason: string;
      runId: string;
    },
  ): Promise<ScheduleRunRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.markRun(tx, input.companyId, input.runId, {
        completedAt: new Date(),
        errorMessage: null,
        queuedMessageId: null,
        sessionId: null,
        skippedReason: input.reason,
        status: "skipped",
        workflowRunId: null,
      });
    });
  }

  async markFailed(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      errorMessage: string;
      runId: string;
    },
  ): Promise<ScheduleRunRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.markRun(tx, input.companyId, input.runId, {
        completedAt: new Date(),
        errorMessage: input.errorMessage,
        queuedMessageId: null,
        sessionId: null,
        skippedReason: null,
        status: "failed",
        workflowRunId: null,
      });
    });
  }

  private async markRun(
    tx: AppRuntimeTransaction,
    companyId: string,
    runId: string,
    values: {
      completedAt: Date;
      errorMessage: string | null;
      queuedMessageId: string | null;
      sessionId: string | null;
      skippedReason: string | null;
      status: "done" | "failed" | "skipped";
      workflowRunId: string | null;
    },
  ): Promise<ScheduleRunRecord> {
    const [run] = await tx
      .update(scheduleRuns)
      .set({
        completedAt: values.completedAt,
        errorMessage: values.errorMessage,
        queuedMessageId: values.queuedMessageId,
        sessionId: values.sessionId,
        skippedReason: values.skippedReason,
        status: values.status,
        updatedAt: values.completedAt,
        workflowRunId: values.workflowRunId,
      })
      .where(and(
        eq(scheduleRuns.companyId, companyId),
        eq(scheduleRuns.id, runId),
      ))
      .returning(this.getSelection()) as ScheduleRunRecord[];
    if (!run) {
      throw new Error("Schedule run not found.");
    }

    return run;
  }

  private getSelection() {
    return {
      bullmqJobId: scheduleRuns.bullmqJobId,
      companyId: scheduleRuns.companyId,
      completedAt: scheduleRuns.completedAt,
      createdAt: scheduleRuns.createdAt,
      errorMessage: scheduleRuns.errorMessage,
      id: scheduleRuns.id,
      queuedMessageId: scheduleRuns.queuedMessageId,
      scheduleId: scheduleRuns.scheduleId,
      sessionId: scheduleRuns.sessionId,
      skippedReason: scheduleRuns.skippedReason,
      startedAt: scheduleRuns.startedAt,
      status: scheduleRuns.status,
      updatedAt: scheduleRuns.updatedAt,
      workflowRunId: scheduleRuns.workflowRunId,
    };
  }
}
