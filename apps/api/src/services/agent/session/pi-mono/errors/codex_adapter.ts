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
    "If this is normal coding work and Codex keeps blocking the request, switch this agent to the GPT-5.4 model instead to avoid the Codex cybersecurity block. You can also rephrase the request with the intended benign context. Authorized security work may require Trusted Access for Cyber.",
  ].join("\n");

  private static readonly contextLengthExceededErrorMessage = [
    "Codex could not continue because this request exceeds the current model context window.",
    "",
    "Switch this agent to the GPT-5.4 model and try again. GPT-5.4 can often handle this request where the current Codex model cannot, but you may still need to fork from a smaller context or reduce the prompt if the conversation is very large.",
  ].join("\n");

  formatErrorMessage(input: PiMonoProviderErrorAdapterInput): string | null {
    const errorCode = this.resolveCodexErrorCode(input.errorMessage);
    if (errorCode === "cyber_policy") {
      return PiMonoCodexProviderErrorAdapter.cyberPolicyErrorMessage;
    }
    if (errorCode === "context_length_exceeded") {
      return PiMonoCodexProviderErrorAdapter.contextLengthExceededErrorMessage;
    }

    return null;
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

  private resolveCodexErrorCode(errorMessage: string): string | null {
    const parsedPayload = this.parseCodexErrorPayload(errorMessage);
    if (typeof parsedPayload?.error?.code === "string") {
      return parsedPayload.error.code;
    }

    if (errorMessage.includes("cyber_policy")) {
      return "cyber_policy";
    }
    if (errorMessage.includes("context_length_exceeded")) {
      return "context_length_exceeded";
    }

    return null;
  }
}
