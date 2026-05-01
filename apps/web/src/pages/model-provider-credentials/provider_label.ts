import { ModelProviderCredentialCatalog } from "./provider_catalog";

export function formatProviderLabel(value: string, options: {
  baseUrl?: string | null;
} = {}): string {
  if (ModelProviderCredentialCatalog.isNvidiaCredential({ baseUrl: options.baseUrl, modelProvider: value })) {
    return "NVIDIA";
  }

  if (value === "openai") {
    return "OpenAI";
  }

  if (value === "companyhelm") {
    return "CompanyHelm";
  }

  if (value === "openrouter") {
    return "OpenRouter";
  }

  if (value === "openai-compatible") {
    return "OpenAI Compatible";
  }

  if (value === "openai-codex") {
    return "Codex";
  }

  if (value === "google") {
    return "Google Gemini API";
  }

  if (value === "anthropic") {
    return "Anthropic";
  }

  return value;
}

export function formatProviderCredentialType(value: string): string {
  if (value === "oauth" || value === "oauth_token" || value === "openai-codex") {
    return "Subscription";
  }

  return "API key";
}
