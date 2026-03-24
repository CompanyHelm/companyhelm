export function formatProviderLabel(value: string): string {
  if (value === "openai") {
    return "OpenAI / Codex";
  }

  if (value === "anthropic") {
    return "Anthropic";
  }

  return value;
}
