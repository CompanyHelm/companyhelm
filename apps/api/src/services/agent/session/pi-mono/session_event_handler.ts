import { eq } from "drizzle-orm";
import { agentSessions } from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

type SessionMessage = {
  role?: string;
};

type SessionEvent = {
  type?: string;
  args?: unknown;
  message?: SessionMessage;
  partialResult?: unknown;
  result?: unknown;
  toolCallId?: string;
  toolName?: string;
  toolResults?: unknown;
};

/**
 * Owns PI Mono session-event handling for one live session. Its scope is to classify the runtime
 * events emitted by the SDK, keep the persisted session lifecycle aligned with agent execution,
 * and make unsupported event shapes noisy in logs so persistence work can expand deliberately.
 */
export class PiMonoSessionEventHandler {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly sessionId: string;

  constructor(transactionProvider: TransactionProviderInterface, sessionId: string) {
    this.transactionProvider = transactionProvider;
    this.sessionId = sessionId;
  }

  async handle(event: unknown): Promise<void> {
    const sessionEvent = event as SessionEvent;
    switch (sessionEvent.type) {
      case "agent_start":
        await this.handleAgentStart(sessionEvent);
        return;
      case "agent_end":
        await this.handleAgentEnd(sessionEvent);
        return;
      case "turn_start":
        this.logInfo("pi mono turn started", sessionEvent);
        return;
      case "turn_end":
        this.logInfo("pi mono turn ended", sessionEvent);
        return;
      case "message_start":
        this.handleMessageStart(sessionEvent);
        return;
      case "message_update":
        this.handleMessageUpdate(sessionEvent);
        return;
      case "message_end":
        this.handleMessageEnd(sessionEvent);
        return;
      case "tool_execution_start":
        this.logInfo("pi mono tool execution started", sessionEvent);
        return;
      case "tool_execution_update":
        this.logInfo("pi mono tool execution updated", sessionEvent);
        return;
      case "tool_execution_end":
        this.logInfo("pi mono tool execution ended", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono session event", sessionEvent);
    }
  }

  private async updateSessionStatus(status: "running" | "stopped"): Promise<void> {
    await this.transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentSessions)
        .set({
          status,
          updated_at: new Date(),
        })
        .where(eq(agentSessions.id, this.sessionId));
    });
  }

  private async handleAgentStart(sessionEvent: SessionEvent): Promise<void> {
    this.logInfo("pi mono agent started", sessionEvent);
    await this.updateSessionStatus("running");
  }

  private async handleAgentEnd(sessionEvent: SessionEvent): Promise<void> {
    this.logInfo("pi mono agent ended", sessionEvent);
    await this.updateSessionStatus("stopped");
  }

  private handleMessageStart(sessionEvent: SessionEvent): void {
    switch (sessionEvent.message?.role) {
      case "user":
        this.logInfo("ignoring pi mono user message start", sessionEvent);
        return;
      case "assistant":
        this.logInfo("pi mono assistant message started", sessionEvent);
        return;
      case "toolResult":
        this.logInfo("pi mono tool result message started", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono message_start event", sessionEvent);
    }
  }

  private handleMessageUpdate(sessionEvent: SessionEvent): void {
    if (sessionEvent.message?.role === "assistant") {
      this.logInfo("pi mono assistant message updated", sessionEvent);
      return;
    }

    this.logError("unhandled pi mono message_update event", sessionEvent);
  }

  private handleMessageEnd(sessionEvent: SessionEvent): void {
    switch (sessionEvent.message?.role) {
      case "user":
        this.logInfo("pi mono user message completed", sessionEvent);
        return;
      case "assistant":
        this.logInfo("pi mono assistant message completed", sessionEvent);
        return;
      case "toolResult":
        this.logInfo("pi mono tool result message completed", sessionEvent);
        return;
      default:
        this.logError("unhandled pi mono message_end event", sessionEvent);
    }
  }

  private logInfo(logMessage: string, event: SessionEvent): void {
    console.info({
      event,
      logMessage,
      sessionId: this.sessionId,
    });
  }

  private logError(logMessage: string, event: SessionEvent): void {
    console.error({
      event,
      logMessage,
      sessionId: this.sessionId,
    });
  }
}
