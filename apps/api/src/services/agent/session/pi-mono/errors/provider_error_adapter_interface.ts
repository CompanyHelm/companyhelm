export type PiMonoProviderErrorAdapterInput = {
  errorMessage: string;
  modelProvider: string | null;
};

/**
 * Formats provider-specific PI Mono error text before it is persisted into the transcript. The
 * adapter boundary keeps raw SDK and upstream-provider shapes out of session-message persistence
 * while still allowing provider-specific recovery guidance when a known error is encountered.
 */
export interface PiMonoProviderErrorAdapterInterface {
  /**
   * Returns a user-facing error message for a known provider error, or null when the adapter does
   * not recognize the input and the caller should fall back to the default formatting path.
   */
  formatErrorMessage(input: PiMonoProviderErrorAdapterInput): string | null;
}
