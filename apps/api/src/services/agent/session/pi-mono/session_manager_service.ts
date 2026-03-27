import { inject, injectable } from "inversify";
import { eq } from "drizzle-orm";
import type { AgentMessage, ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { ImageContent } from "@mariozechner/pi-ai";
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import { agentSessions } from "../../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { RedisService } from "../../../redis/service.ts";
import { PiMonoSessionEventHandler } from "./session_event_handler.ts";
import { PiMonoToolsService } from "./tools/service.ts";

type SessionRuntimeConfig = {
  agentId: string;
  apiKey: string;
  modelId: string;
  providerId: string;
  reasoningLevel?: string | null;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<void>;
    };
  };
};

/**
 * Owns the process-local PI Mono runtime sessions keyed by CompanyHelm session id. Its scope is
 * reusing a live SDK session when the same process handles later wake jobs, while lazily creating a
 * new runtime session when this process becomes the active worker for a session.
 */
@injectable()
export class PiMonoSessionManagerService {
  private readonly sessionsById = new Map<string, AgentSession>();
  private readonly redisService: RedisService;

  constructor(@inject(RedisService) redisService: RedisService) {
    this.redisService = redisService;
  }

  async ensureSession(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    runtimeConfig: SessionRuntimeConfig,
  ): Promise<AgentSession> {
    const existingSession = this.sessionsById.get(sessionId);
    if (existingSession) {
      return existingSession;
    }

    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(runtimeConfig.providerId, runtimeConfig.apiKey);
    const modelRegistry = new ModelRegistry(authStorage);
    const piMonoToolsService = new PiMonoToolsService(
      runtimeConfig.agentId,
      transactionProvider,
      sessionId,
    );
    const model = modelRegistry.find(runtimeConfig.providerId, runtimeConfig.modelId);
    if (!model) {
      throw new Error(`Model not found for provider "${runtimeConfig.providerId}": ${runtimeConfig.modelId}`);
    }

    const sessionManager = SessionManager.inMemory();
    sessionManager.newSession({
      id: sessionId,
    });
    const storedContextMessages = await this.loadStoredContextMessages(transactionProvider, sessionId);

    const { session } = await createAgentSession({
      authStorage,
      modelRegistry,
      sessionManager,
      model,
      // Keep the built-in active set empty at startup and register our CompanyHelm tools through
      // `customTools`, because the PI SDK only treats `tools` as an active-name selector.
      tools: [],
      customTools: piMonoToolsService.getTools(),
      thinkingLevel: this.resolveThinkingLevel(runtimeConfig.reasoningLevel),
    });
    session.setActiveToolsByName(piMonoToolsService.getTools().map((tool) => tool.name));
    session.agent.replaceMessages(storedContextMessages);
    const sessionEventHandler = new PiMonoSessionEventHandler(
      transactionProvider,
      sessionId,
      this.redisService,
    );

    session.subscribe((event) => {
      void sessionEventHandler.handle(event);
    });

    this.sessionsById.set(sessionId, session);
    return session;
  }

  async prompt(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    message: string,
    images?: ImageContent[],
  ): Promise<void> {
    const session = this.getRequiredSession(sessionId);
    await session.prompt(message, images && images.length > 0 ? { images } : undefined);
    await this.persistContextMessages(transactionProvider, sessionId, session.agent.state.messages);
  }

  async steer(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    message: string,
    images?: ImageContent[],
  ): Promise<void> {
    const session = this.getRequiredSession(sessionId);
    await session.steer(message, images);
    await this.persistContextMessages(transactionProvider, sessionId, session.agent.state.messages);
  }

  async abort(sessionId: string): Promise<void> {
    const session = this.sessionsById.get(sessionId);
    if (!session) {
      return;
    }

    await session.abort();
  }

  get(sessionId: string): AgentSession | undefined {
    return this.sessionsById.get(sessionId);
  }

  dispose(sessionId: string): void {
    const session = this.sessionsById.get(sessionId);
    if (!session) {
      return;
    }

    session.dispose();
    this.sessionsById.delete(sessionId);
  }

  private getRequiredSession(sessionId: string): AgentSession {
    const session = this.sessionsById.get(sessionId);
    if (!session) {
      throw new Error("Session not found.");
    }

    return session;
  }

  private resolveThinkingLevel(reasoningLevel?: string | null): ThinkingLevel | undefined {
    if (!reasoningLevel) {
      return undefined;
    }

    return reasoningLevel as ThinkingLevel;
  }

  private async loadStoredContextMessages(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
  ): Promise<AgentMessage[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [sessionRecord] = await selectableDatabase
        .select({
          contextMessages: agentSessions.context_messages,
        })
        .from(agentSessions)
        .where(eq(agentSessions.id, sessionId));
      if (!Array.isArray(sessionRecord?.contextMessages)) {
        return [];
      }

      return sessionRecord.contextMessages as AgentMessage[];
    });
  }

  private async persistContextMessages(
    transactionProvider: TransactionProviderInterface,
    sessionId: string,
    messages: AgentMessage[],
  ): Promise<void> {
    await transactionProvider.transaction(async (tx) => {
      const updatableDatabase = tx as UpdatableDatabase;
      await updatableDatabase
        .update(agentSessions)
        .set({
          context_messages: messages,
          updated_at: new Date(),
        })
        .where(eq(agentSessions.id, sessionId));
    });
  }
}
