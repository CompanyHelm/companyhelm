import * as amplitude from "@amplitude/unified";
import type { AmplitudeClientInterface } from "./amplitude_client_interface";

/**
 * Adapts the Amplitude unified SDK module into a small class-based surface so the browser runtime
 * code can depend on a stable interface while tests swap in lightweight in-memory fakes.
 */
export class UnifiedAmplitudeClient implements AmplitudeClientInterface {
  initAll(apiKey: string, configuration: Record<string, unknown>): void | Promise<unknown> {
    return amplitude.initAll(apiKey, configuration);
  }

  reset(): void {
    amplitude.reset();
  }

  setUserId(userId: string | undefined): void {
    amplitude.setUserId(userId);
  }

  track(eventType: string, eventProperties: Record<string, unknown>): void {
    amplitude.track(eventType, eventProperties);
  }
}
