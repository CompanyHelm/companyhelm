export function formatProviderLabel(value: string): string {
  if (value === "openai") {
    return "OpenAI (API key)";
  }

  if (value === "openai-codex") {
    return "OpenAI (Subscription)";
  }

  if (value === "anthropic") {
    return "Anthropic (API Key)";
  }

  return value;
}

export function formatProviderCredentialType(value: string): string {
  if (value === "openai-codex") {
    return "Subscription";
  }

  return "API key";
}
