export function formatProviderLabel(value: string): string {
  if (value === "openai") {
    return "OpenAI (API key)";
  }

  if (value === "openrouter") {
    return "OpenRouter (API key)";
  }

  if (value === "openai-codex") {
    return "OpenAI (Subscription)";
  }

  if (value === "anthropic") {
    return "Anthropic (API key)";
  }

  return value;
}

export function formatProviderCredentialType(value: string): string {
  if (value === "oauth" || value === "oauth_token" || value === "openai-codex") {
    return "Subscription";
  }

  return "API key";
}
