import type {
  RuntimeProviderAdapterInput,
  RuntimeProviderAdapterInterface,
  RuntimeProviderResolution,
} from "../runtime_provider_adapter_interface.ts";

/**
 * Handles providers whose persisted credential provider id is already the PI Mono runtime
 * provider id. It keeps the default path explicit without one-off branches in session execution.
 */
export class IdentityRuntimeProviderAdapter implements RuntimeProviderAdapterInterface {
  private readonly providerId: string;

  constructor(providerId: string) {
    this.providerId = providerId;
  }

  resolve(input: RuntimeProviderAdapterInput): RuntimeProviderResolution {
    const resolution: RuntimeProviderResolution = {
      apiKey: input.apiKey,
      providerId: this.providerId,
    };
    if (input.baseUrl) {
      resolution.baseUrl = input.baseUrl;
    }

    return resolution;
  }
}
