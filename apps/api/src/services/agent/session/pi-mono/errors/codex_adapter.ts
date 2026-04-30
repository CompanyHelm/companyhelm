import type {
  PiMonoProviderErrorAdapterInput,
  PiMonoProviderErrorAdapterInterface,
} from "./provider_error_adapter_interface.ts";

type CodexProviderErrorPayload = {
  error?: {
    code?: unknown;
    message?: unknown;
    type?: unknown;
  };
  type?: unknown;
};

/**
 * Converts known Codex provider errors into product copy that explains the recovery path without
 * leaking raw upstream JSON into the transcript. Unknown Codex failures are left to the default
 * adapter so operators can still see the original message until a deliberate formatter exists.
 */
export class PiMonoCodexProviderErrorAdapter implements PiMonoProviderErrorAdapterInterface {
  private static readonly cyberPolicyErrorMessage = [
    "Codex could not continue because OpenAI flagged this request for possible cybersecurity risk.",
    "",
    "If this is normal coding work, rephrase the request with the intended benign context. You can also try ChatGPT with GPT-5.4 for a conversational coding workflow. Authorized security work may require Trusted Access for Cyber.",
  ].join("\n");

  formatErrorMessage(input: PiMonoProviderErrorAdapterInput): string | null {
    if (!this.isCyberPolicyError(input.errorMessage)) {
      return null;
    }

    return PiMonoCodexProviderErrorAdapter.cyberPolicyErrorMessage;
  }

  private isCyberPolicyError(errorMessage: string): boolean {
    const parsedPayload = this.parseCodexErrorPayload(errorMessage);
    if (parsedPayload?.error?.code === "cyber_policy") {
      return true;
    }

    return errorMessage.includes("cyber_policy");
  }

  private parseCodexErrorPayload(errorMessage: string): CodexProviderErrorPayload | null {
    const jsonStartIndex = errorMessage.indexOf("{");
    if (jsonStartIndex < 0) {
      return null;
    }

    try {
      const parsedPayload = JSON.parse(errorMessage.slice(jsonStartIndex)) as CodexProviderErrorPayload;
      return parsedPayload;
    } catch {
      return null;
    }
  }
}
