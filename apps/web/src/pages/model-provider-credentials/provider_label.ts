export function formatProviderLabel(value: string, options: {
  isManaged?: boolean;
} = {}): string {
  if (options.isManaged) {
    return "CompanyHelm";
  }

  if (value === "openai") {
    return "OpenAI (API key)";
  }

  if (value === "openrouter") {
    return "OpenRouter (API key)";
  }

  if (value === "openai-codex") {
    return "OpenAI (Subscription)";
  }

  if (value === "google-gemini-cli") {
    return "Google Gemini CLI (Subscription)";
  }

  if (value === "anthropic") {
    return "Anthropic (API key)";
  }

  return value;
}

export function formatProviderCredentialType(value: string): string {
  if (value === "oauth" || value === "oauth_token" || value === "openai-codex" || value === "google-gemini-cli") {
    return "Subscription";
  }

  return "API key";
}
