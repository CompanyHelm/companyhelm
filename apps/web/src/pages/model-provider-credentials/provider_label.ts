export function formatProviderLabel(value: string): string {
  if (value === "openai") {
    return "OpenAI / Codex";
  }

  return value;
}
