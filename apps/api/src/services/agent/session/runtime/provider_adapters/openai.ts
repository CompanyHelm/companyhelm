import type {
  RuntimeProviderAdapterInput,
  RuntimeProviderAdapterInterface,
  RuntimeProviderResolution,
} from "../runtime_provider_adapter_interface.ts";

/**
 * Maps standard OpenAI credentials directly into PI Mono's built-in OpenAI provider.
 */
export class OpenAiRuntimeProviderAdapter implements RuntimeProviderAdapterInterface {
  resolve(input: RuntimeProviderAdapterInput): RuntimeProviderResolution {
    const resolution: RuntimeProviderResolution = {
      apiKey: input.apiKey,
      providerId: "openai",
    };
    if (input.baseUrl) {
      resolution.baseUrl = input.baseUrl;
    }

    return resolution;
  }
}
