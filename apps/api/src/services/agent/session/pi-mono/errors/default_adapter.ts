import type {
  PiMonoProviderErrorAdapterInput,
  PiMonoProviderErrorAdapterInterface,
} from "./provider_error_adapter_interface.ts";

/**
 * Preserves PI Mono's original error text for providers that do not need custom handling. This is
 * intentionally small so new provider adapters can be introduced without changing legacy behavior.
 */
export class PiMonoDefaultProviderErrorAdapter implements PiMonoProviderErrorAdapterInterface {
  formatErrorMessage(input: PiMonoProviderErrorAdapterInput): string {
    return input.errorMessage;
  }
}
