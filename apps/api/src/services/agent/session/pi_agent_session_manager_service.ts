import { injectable } from "inversify";
import {
  type AgentSession,
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  SessionManager,
} from "@mariozechner/pi-coding-agent";

/**
 * Creates and keeps PI agent sessions entirely in memory so callers can bind an externally managed
 * CompanyHelm session id to the live PI SDK session object without touching disk-backed state.
 */
@injectable()
export class PiAgentSessionManagerService {
  private readonly sessionsById = new Map<string, AgentSession>();

  async create(sessionId: string, apiKey: string, providerId: string): Promise<AgentSession> {
    const existingSession = this.sessionsById.get(sessionId);
    if (existingSession) {
      existingSession.dispose();
    }

    const authStorage = AuthStorage.inMemory();
    authStorage.setRuntimeApiKey(providerId, apiKey);

    const sessionManager = SessionManager.inMemory();
    sessionManager.newSession({
      id: sessionId,
    });

    const { session } = await createAgentSession({
      authStorage,
      modelRegistry: new ModelRegistry(authStorage),
      sessionManager,
    });

    this.sessionsById.set(sessionId, session);
    return session;
  }

  get(sessionId: string): AgentSession | undefined {
    return this.sessionsById.get(sessionId);
  }
}
