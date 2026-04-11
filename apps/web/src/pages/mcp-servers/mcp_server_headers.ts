export const DEFAULT_MCP_SERVER_CALL_TIMEOUT_MS = 10_000;

export type McpServerHeaderDraft = {
  name: string;
  value: string;
};

export function parseMcpServerHeadersText(headersText: string): McpServerHeaderDraft[] {
  const normalizedValue = headersText.trim();
  if (normalizedValue.length === 0) {
    return [];
  }

  return normalizedValue
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) {
        return {
          name: line,
          value: "",
        };
      }

      return {
        name: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      };
    });
}

export function serializeMcpServerHeaders(headers: McpServerHeaderDraft[]): string | undefined {
  const normalizedHeaders = headers
    .map((header) => ({
      name: header.name.trim(),
      value: header.value.trim(),
    }))
    .filter((header) => header.name.length > 0 || header.value.length > 0);

  if (normalizedHeaders.length === 0) {
    return undefined;
  }

  return normalizedHeaders
    .map((header) => `${header.name}: ${header.value}`)
    .join("\n");
}

export function hasIncompleteMcpServerHeaders(headers: McpServerHeaderDraft[]): boolean {
  return headers.some((header) => {
    const hasName = header.name.trim().length > 0;
    const hasValue = header.value.trim().length > 0;
    return hasName !== hasValue;
  });
}

export function formatMcpServerCallTimeout(callTimeoutMs: number): string {
  return callTimeoutMs % 1000 === 0
    ? `${callTimeoutMs / 1000} s`
    : `${callTimeoutMs} ms`;
}
