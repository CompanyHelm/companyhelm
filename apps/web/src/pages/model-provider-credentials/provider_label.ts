export function formatProviderLabel(value: string): string {
  if (value === "openai") {
    return "OpenAI";
  }

  if (value === "openai-codex") {
    return "OpenAI Codex";
  }

  if (value === "anthropic") {
    return "Anthropic";
  }

  return value;
}
