import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { inject, injectable } from "inversify";
import {
  agentSessions,
  routineRuns,
  routineTriggers,
  routines,
  sessionQueuedMessages,
} from "../../db/schema.ts";
import type { AppRuntimeTransaction, TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { SessionManagerService } from "../agent/session/session_manager_service.ts";
import { SessionPromptService } from "../agent/session/session_prompt_service.ts";
import type { RoutineExecutionInput, RoutineRunRecord } from "./types.ts";

type RoutineExecutionRow = {
  assignedAgentId: string;
  enabled: boolean;
  id: string;
  instructions: string;
  overlapPolicy: "skip";
  sessionId: string | null;
};

type RoutineSessionRow = {
  agentId: string;
  id: string;
  status: string;
};

type RoutineTriggerRow = {
  enabled: boolean;
  id: string;
  routineId: string;
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

type RoutineExecutionTransactionResult = {
  run: RoutineRunRecord;
  sessionIdToNotify: string | null;
};

/**
 * Turns a routine invocation into queued session work. It owns sticky-session selection, first-run
 * session creation, overlap skipping, and run history updates while leaving actual agent execution
 * to the existing session wake worker.
 */
@injectable()
export class RoutineExecutionService {
  private readonly sessionManagerService: SessionManagerService;
  private readonly sessionPromptService: SessionPromptService;

  constructor(
    @inject(SessionManagerService) sessionManagerService: SessionManagerService,
    @inject(SessionPromptService) sessionPromptService: SessionPromptService,
  ) {
    this.sessionManagerService = sessionManagerService;
    this.sessionPromptService = sessionPromptService;
  }

  async execute(
    transactionProvider: TransactionProviderInterface,
    input: RoutineExecutionInput,
  ): Promise<RoutineRunRecord> {
    let createdRunId: string | null = null;
    try {
      const result = await transactionProvider.transaction(async (tx) => {
        const transactionResult = await this.executeInTransaction(tx, input);
        createdRunId = transactionResult.run.id;
        return transactionResult;
      });

      if (result.sessionIdToNotify) {
        await this.sessionManagerService.notifyQueuedSessionMessage(input.companyId, result.sessionIdToNotify, false);
      }

      return result.run;
    } catch (error) {
      if (createdRunId) {
        return this.markFailed(transactionProvider, input.companyId, createdRunId, error);
      }
      throw error;
    }
  }

  private async executeInTransaction(
    tx: AppRuntimeTransaction,
    input: RoutineExecutionInput,
  ): Promise<RoutineExecutionTransactionResult> {
    const routineRow = await this.requireRoutine(tx, input.companyId, input.routineId);
    const triggerRow = input.triggerId
      ? await this.requireTrigger(tx, input.companyId, input.routineId, input.triggerId)
      : null;
    const runId = randomUUID();
    const now = new Date();

    await tx
      .insert(routineRuns)
      .values({
        bullmqJobId: input.bullmqJobId ?? null,
        companyId: input.companyId,
        createdAt: now,
        errorMessage: null,
        finishedAt: null,
        id: runId,
        routineId: input.routineId,
        sessionId: null,
        source: input.source,
        startedAt: now,
        status: "running",
        triggerId: input.triggerId ?? null,
        updatedAt: now,
      });

    if (input.source === "scheduled" && !routineRow.enabled) {
      return this.finishSkipped(tx, input.companyId, runId, "routine_disabled");
    }
    if (input.source === "scheduled" && triggerRow && !triggerRow.enabled) {
      return this.finishSkipped(tx, input.companyId, runId, "trigger_disabled");
    }

    const reusableSession = await this.resolveReusableSession(tx, input.companyId, routineRow);
    if (reusableSession && await this.shouldSkipForOverlap(tx, input.companyId, reusableSession)) {
      return this.finishSkipped(tx, input.companyId, runId, "previous_run_still_active");
    }

    const sessionId = reusableSession
      ? await this.queuePromptForExistingSession(tx, input.companyId, reusableSession.id, routineRow.instructions)
      : await this.createRoutineSession(tx, input.companyId, routineRow);

    const run = await this.finishPromptQueued(tx, input.companyId, runId, sessionId);
    return {
      run,
      sessionIdToNotify: sessionId,
    };
  }

  private async requireRoutine(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineId: string,
  ): Promise<RoutineExecutionRow> {
    const [routineRow] = await tx
      .select({
        assignedAgentId: routines.assignedAgentId,
        enabled: routines.enabled,
        id: routines.id,
        instructions: routines.instructions,
        overlapPolicy: routines.overlapPolicy,
        sessionId: routines.sessionId,
      })
      .from(routines)
      .where(and(
        eq(routines.companyId, companyId),
        eq(routines.id, routineId),
      )) as RoutineExecutionRow[];
    if (!routineRow) {
      throw new Error("Routine not found.");
    }

    return routineRow;
  }

  private async requireTrigger(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineId: string,
    triggerId: string,
  ): Promise<RoutineTriggerRow> {
    const [triggerRow] = await tx
      .select({
        enabled: routineTriggers.enabled,
        id: routineTriggers.id,
        routineId: routineTriggers.routineId,
      })
      .from(routineTriggers)
      .where(and(
        eq(routineTriggers.companyId, companyId),
        eq(routineTriggers.id, triggerId),
        eq(routineTriggers.routineId, routineId),
      )) as RoutineTriggerRow[];
    if (!triggerRow) {
      throw new Error("Routine trigger not found.");
    }

    return triggerRow;
  }

  private async resolveReusableSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineRow: RoutineExecutionRow,
  ): Promise<RoutineSessionRow | null> {
    if (!routineRow.sessionId) {
      return null;
    }

    const [sessionRow] = await tx
      .select({
        agentId: agentSessions.agentId,
        id: agentSessions.id,
        status: agentSessions.status,
      })
      .from(agentSessions)
      .where(and(
        eq(agentSessions.companyId, companyId),
        eq(agentSessions.id, routineRow.sessionId),
      )) as RoutineSessionRow[];

    const canReuseSession = sessionRow
      && sessionRow.agentId === routineRow.assignedAgentId
      && sessionRow.status !== "archived";
    if (canReuseSession) {
      return sessionRow;
    }

    await tx
      .update(routines)
      .set({
        sessionId: null,
        updatedAt: new Date(),
      })
      .where(and(
        eq(routines.companyId, companyId),
        eq(routines.id, routineRow.id),
      ));

    return null;
  }

  private async shouldSkipForOverlap(
    tx: AppRuntimeTransaction,
    companyId: string,
    sessionRow: RoutineSessionRow,
  ): Promise<boolean> {
    if (sessionRow.status === "queued" || sessionRow.status === "running") {
      return true;
    }

    const [queuedMessage] = await tx
      .select({
        id: sessionQueuedMessages.id,
      })
      .from(sessionQueuedMessages)
      .where(and(
        eq(sessionQueuedMessages.companyId, companyId),
        eq(sessionQueuedMessages.sessionId, sessionRow.id),
        inArray(sessionQueuedMessages.status, ["pending", "processing"]),
      )) as Array<{ id: string }>;

    return Boolean(queuedMessage);
  }

  private async createRoutineSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    routineRow: RoutineExecutionRow,
  ): Promise<string> {
    const sessionRecord = await this.sessionManagerService.createSessionInTransaction(
      tx as never,
      tx as never,
      companyId,
      routineRow.assignedAgentId,
      routineRow.instructions,
      {
        userId: null,
      },
    );

    await tx
      .update(routines)
      .set({
        sessionId: sessionRecord.id,
        updatedAt: new Date(),
      })
      .where(and(
        eq(routines.companyId, companyId),
        eq(routines.id, routineRow.id),
      ));

    return sessionRecord.id;
  }

  private async queuePromptForExistingSession(
    tx: AppRuntimeTransaction,
    companyId: string,
    sessionId: string,
    instructions: string,
  ): Promise<string> {
    await this.sessionPromptService.queuePromptInTransaction(
      tx as never,
      tx as never,
      tx as never,
      companyId,
      sessionId,
      instructions,
      {
        shouldSteer: false,
        userId: null,
      },
    );

    return sessionId;
  }

  private async finishSkipped(
    tx: AppRuntimeTransaction,
    companyId: string,
    runId: string,
    reason: string,
  ): Promise<RoutineExecutionTransactionResult> {
    const run = await this.updateRun(tx, companyId, runId, {
      errorMessage: reason,
      finishedAt: new Date(),
      status: "skipped",
    });
    return {
      run,
      sessionIdToNotify: null,
    };
  }

  private async finishPromptQueued(
    tx: AppRuntimeTransaction,
    companyId: string,
    runId: string,
    sessionId: string,
  ): Promise<RoutineRunRecord> {
    return this.updateRun(tx, companyId, runId, {
      finishedAt: new Date(),
      sessionId,
      status: "prompt_queued",
    });
  }

  private async markFailed(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    runId: string,
    error: unknown,
  ): Promise<RoutineRunRecord> {
    return transactionProvider.transaction(async (tx) => {
      return this.updateRun(tx, companyId, runId, {
        errorMessage: error instanceof Error ? error.message : "Unknown routine execution failure.",
        finishedAt: new Date(),
        status: "failed",
      });
    });
  }

  private async updateRun(
    tx: AppRuntimeTransaction,
    companyId: string,
    runId: string,
    values: {
      errorMessage?: string | null;
      finishedAt?: Date | null;
      sessionId?: string | null;
      status: "prompt_queued" | "skipped" | "failed";
    },
  ): Promise<RoutineRunRecord> {
    const now = new Date();
    const [runRow] = await tx
      .update(routineRuns)
      .set({
        ...values,
        updatedAt: now,
      })
      .where(and(
        eq(routineRuns.companyId, companyId),
        eq(routineRuns.id, runId),
      ))
      .returning({
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
      }) as RoutineRunRow[];
    if (!runRow) {
      throw new Error("Routine run not found.");
    }

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
}
