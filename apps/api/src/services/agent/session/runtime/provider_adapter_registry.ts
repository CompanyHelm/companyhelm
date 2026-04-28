import { injectable } from "inversify";
import { CompanyHelmRuntimeProviderAdapter } from "./provider_adapters/companyhelm.ts";
import { IdentityRuntimeProviderAdapter } from "./provider_adapters/identity.ts";
import { OpenAiRuntimeProviderAdapter } from "./provider_adapters/openai.ts";
import type {
  RuntimeProviderAdapterInterface,
  RuntimeProviderAdapterInput,
  RuntimeProviderResolution,
} from "./runtime_provider_adapter_interface.ts";

/**
 * Centralizes the provider-id translation that happens immediately before PI Mono runtime boot.
 * Product-facing providers and DB credential providers can differ, so callers ask this registry
 * for the concrete runtime provider instead of encoding provider quirks inline.
 */
@injectable()
export class RuntimeProviderAdapterRegistry {
  private readonly adapters: Map<string, RuntimeProviderAdapterInterface>;

  constructor() {
    this.adapters = new Map<string, RuntimeProviderAdapterInterface>([
      ["anthropic", new IdentityRuntimeProviderAdapter("anthropic")],
      ["companyhelm", new CompanyHelmRuntimeProviderAdapter()],
      ["google-gemini-cli", new IdentityRuntimeProviderAdapter("google-gemini-cli")],
      ["openai", new OpenAiRuntimeProviderAdapter()],
      ["openai-codex", new IdentityRuntimeProviderAdapter("openai-codex")],
      ["openai-compatible", new IdentityRuntimeProviderAdapter("openai-compatible")],
      ["openrouter", new IdentityRuntimeProviderAdapter("openrouter")],
    ]);
  }

  resolve(credentialProviderId: string, input: RuntimeProviderAdapterInput): RuntimeProviderResolution {
    const adapter = this.adapters.get(credentialProviderId);
    if (!adapter) {
      throw new Error(`Unsupported runtime model provider: ${credentialProviderId}`);
    }

    return adapter.resolve(input);
  }
}
