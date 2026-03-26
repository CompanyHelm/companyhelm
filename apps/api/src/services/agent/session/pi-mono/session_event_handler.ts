/**
 * Owns PI Mono session-event handling for one live session. Its current scope is intentionally
 * narrow: accept every event emitted by the SDK for a specific session id and write those events
 * to logs until richer persistence or fan-out behavior is introduced.
 */
export class PiMonoSessionEventHandler {
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  handle(event: unknown): void {
    console.log({
      event,
      sessionId: this.sessionId,
    });
  }
}
