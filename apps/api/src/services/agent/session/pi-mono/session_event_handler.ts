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

type SessionEvent = {
  type?: string;
};

/**
 * Owns PI Mono session-event handling for one live session. Its current scope is intentionally
 * narrow: accept every event emitted by the SDK for a specific session id, write those events to
 * logs, and keep the persisted session status aligned with the PI Mono turn lifecycle.
 */
export class PiMonoSessionEventHandler {
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly sessionId: string;

  constructor(transactionProvider: TransactionProviderInterface, sessionId: string) {
    this.transactionProvider = transactionProvider;
    this.sessionId = sessionId;
  }

  async handle(event: unknown): Promise<void> {
    console.log({
      event,
      sessionId: this.sessionId,
    });

    const sessionEvent = event as SessionEvent;
    if (sessionEvent.type === "turn_start") {
      await this.updateStatus("running");
      return;
    }

    if (sessionEvent.type === "turn_end") {
      await this.updateStatus("stopped");
    }
  }

  private async updateStatus(status: "running" | "stopped"): Promise<void> {
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
}
