import type { Logger as PinoLogger } from "pino";
import pino from "pino";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { SessionTurnUsageProcessor } from "./session_turn_usage_processor.ts";
import type { SessionTurnUsageQueueService } from "./session_turn_usage_queue.ts";

export type SessionTurnUsagePayload = {
  input?: number;
  output?: number;
  cacheRead?: number;
  cacheWrite?: number;
  totalTokens?: number;
  cost?: {
    input?: number;
    output?: number;
    cacheRead?: number;
    cacheWrite?: number;
    total?: number;
  };
};

export type SessionTurnUsageCostKind = "actual" | "virtual";

export type SessionTurnUsageRecordInput = {
  agentId: string;
  companyId: string;
  costKind?: SessionTurnUsageCostKind;
  modelProviderCredentialId: string;
  recordedAt: Date;
  sessionId: string;
  turnId: string;
  usage: SessionTurnUsagePayload;
};

/**
 * Accepts finalized assistant usage from the PI Mono event handler. Its scope is deciding whether
 * usage is processed inline for tests or best-effort enqueued for production so session finalizers
 * stay resilient when accounting side effects fail.
 */
export class SessionTurnUsageService {
  private static readonly fallbackLogger = pino({ level: "silent" });
  private readonly logger: PinoLogger;
  private readonly processor: SessionTurnUsageProcessor;
  private readonly queueService: SessionTurnUsageQueueService | null;

  constructor(
    processor: SessionTurnUsageProcessor = new SessionTurnUsageProcessor(),
    queueService: SessionTurnUsageQueueService | null = null,
    logger: PinoLogger = SessionTurnUsageService.fallbackLogger,
  ) {
    this.processor = processor;
    this.queueService = queueService;
    this.logger = logger;
  }

  async recordUsage(
    transactionProvider: TransactionProviderInterface,
    input: SessionTurnUsageRecordInput,
  ): Promise<void> {
    if (!this.queueService) {
      await this.processor.processUsage(transactionProvider, input);
      return;
    }

    try {
      await this.queueService.enqueueUsage(input);
    } catch (error) {
      this.logger.error({
        companyId: input.companyId,
        err: error,
        session_id: input.sessionId,
        turn_id: input.turnId,
      }, "failed to enqueue session turn usage job");
    }
  }
}
