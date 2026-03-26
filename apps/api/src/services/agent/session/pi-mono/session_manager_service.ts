import { inject, injectable } from "inversify";
import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { ImageContent } from "@mariozechner/pi-ai";
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { RedisService } from "../../../redis/service.ts";
import { PiMonoSessionEventHandler } from "./session_event_handler.ts";

type SessionRuntimeConfig = {
  apiKey: string;
  modelId: string;
  providerId: string;
  reasoningLevel?: string | null;
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
    const model = modelRegistry.find(runtimeConfig.providerId, runtimeConfig.modelId);
    if (!model) {
      throw new Error(`Model not found for provider "${runtimeConfig.providerId}": ${runtimeConfig.modelId}`);
    }

    const sessionManager = SessionManager.inMemory();
    sessionManager.newSession({
      id: sessionId,
    });

    const { session } = await createAgentSession({
      authStorage,
      modelRegistry,
      sessionManager,
      model,
      thinkingLevel: this.resolveThinkingLevel(runtimeConfig.reasoningLevel),
    });
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
    sessionId: string,
    message: string,
    images?: ImageContent[],
  ): Promise<void> {
    const session = this.getRequiredSession(sessionId);
    await session.prompt(message, images && images.length > 0 ? { images } : undefined);
  }

  async steer(
    sessionId: string,
    message: string,
    images?: ImageContent[],
  ): Promise<void> {
    const session = this.getRequiredSession(sessionId);
    await session.steer(message, images);
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
}
