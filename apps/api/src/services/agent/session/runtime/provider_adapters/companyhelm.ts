import type {
  RuntimeProviderAdapterInput,
  RuntimeProviderAdapterInterface,
  RuntimeProviderResolution,
} from "../runtime_provider_adapter_interface.ts";
import { OpenAiRuntimeProviderAdapter } from "./openai.ts";

/**
 * Bridges legacy CompanyHelm-managed credential rows into their current concrete runtime provider.
 * New platform-model routing should normally resolve to the routed credential provider before this
 * adapter is needed, but existing rows may still store `companyhelm` as the credential provider.
 */
export class CompanyHelmRuntimeProviderAdapter implements RuntimeProviderAdapterInterface {
  private readonly openAiAdapter: OpenAiRuntimeProviderAdapter;

  constructor(openAiAdapter: OpenAiRuntimeProviderAdapter = new OpenAiRuntimeProviderAdapter()) {
    this.openAiAdapter = openAiAdapter;
  }

  resolve(input: RuntimeProviderAdapterInput): RuntimeProviderResolution {
    return this.openAiAdapter.resolve(input);
  }
}
