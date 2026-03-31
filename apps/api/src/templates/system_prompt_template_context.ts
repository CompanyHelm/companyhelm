/**
 * Carries the session-scoped identity metadata injected into the CompanyHelm system prompt so the
 * runtime can accurately refer to itself without relying on tool output or inferred state.
 */
export class SystemPromptTemplateContext {
  readonly agentId: string;
  readonly agentName: string;
  readonly sessionId: string;

  constructor(agentId: string, agentName: string, sessionId: string) {
    this.agentId = agentId;
    this.agentName = agentName;
    this.sessionId = sessionId;
  }
}
