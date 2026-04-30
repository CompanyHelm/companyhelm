import { PiMonoCodexProviderErrorAdapter } from "./codex_adapter.ts";
import { PiMonoDefaultProviderErrorAdapter } from "./default_adapter.ts";
import type {
  PiMonoProviderErrorAdapterInput,
  PiMonoProviderErrorAdapterInterface,
} from "./provider_error_adapter_interface.ts";

/**
 * Selects the error formatter for the stored model provider on a session message. The registry is
 * the only place that knows provider-to-adapter mappings, which keeps message persistence focused
 * on transcript state rather than upstream-provider quirks.
 */
export class PiMonoProviderErrorAdapterRegistry {
  private readonly adaptersByProvider: Map<string, PiMonoProviderErrorAdapterInterface>;
  private readonly defaultAdapter: PiMonoProviderErrorAdapterInterface;

  constructor(
    defaultAdapter: PiMonoProviderErrorAdapterInterface = new PiMonoDefaultProviderErrorAdapter(),
  ) {
    this.defaultAdapter = defaultAdapter;
    this.adaptersByProvider = new Map<string, PiMonoProviderErrorAdapterInterface>([
      ["openai-codex", new PiMonoCodexProviderErrorAdapter()],
    ]);
  }

  formatErrorMessage(input: PiMonoProviderErrorAdapterInput): string {
    const adapter = input.modelProvider ? this.adaptersByProvider.get(input.modelProvider) : undefined;
    const formattedErrorMessage = adapter?.formatErrorMessage(input);
    if (typeof formattedErrorMessage === "string") {
      return formattedErrorMessage;
    }

    return this.defaultAdapter.formatErrorMessage(input) ?? input.errorMessage;
  }
}
