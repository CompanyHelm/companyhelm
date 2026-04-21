/**
 * Describes the small slice of the Amplitude unified browser API the web app relies on so runtime
 * session replay wiring can be tested without loading the real analytics SDK in Node-based tests.
 */
export interface AmplitudeClientInterface {
  /**
   * Boots the unified Amplitude client with the analytics and session replay configuration needed
   * by the web app's browser telemetry entrypoint.
   */
  initAll(apiKey: string, configuration: Record<string, unknown>): void | Promise<unknown>;

  /**
   * Associates subsequent telemetry with the authenticated application user, or clears that link
   * when the user signs out.
   */
  setUserId(userId: string | undefined): void;

  /**
   * Publishes an analytics event with the event properties collected from routed pages and UI
   * interaction surfaces.
   */
  track(eventType: string, eventProperties: Record<string, unknown>): void;

  /**
   * Clears the current analytics identity and device-scoped session state after logout so the next
   * signed-in user starts from a clean replay and analytics session.
   */
  reset(): void;
}
