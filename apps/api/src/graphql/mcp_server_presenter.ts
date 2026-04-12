import type { McpServerRecord } from "../services/mcp/service.ts";

export type GraphqlMcpServerRecord = {
  authType: string;
  callTimeoutMs: number;
  companyId: string;
  createdAt: string;
  description: string | null;
  enabled: boolean;
  headersText: string;
  id: string;
  name: string;
  oauthClientId: string | null;
  oauthConnectionStatus: string | null;
  oauthGrantedScopes: string[];
  oauthLastError: string | null;
  oauthRequestedScopes: string[];
  updatedAt: string;
  url: string;
};

export class GraphqlMcpServerPresenter {
  static present(record: McpServerRecord): GraphqlMcpServerRecord {
    return {
      authType: record.authType,
      callTimeoutMs: record.callTimeoutMs,
      companyId: record.companyId,
      createdAt: record.createdAt.toISOString(),
      description: record.description,
      enabled: record.enabled,
      headersText: Object.entries(record.headers)
        .sort(([leftName], [rightName]) => leftName.localeCompare(rightName))
        .map(([name, value]) => `${name}: ${value}`)
        .join("\n"),
      id: record.id,
      name: record.name,
      oauthClientId: record.oauthClientId,
      oauthConnectionStatus: record.oauthConnectionStatus,
      oauthGrantedScopes: record.oauthGrantedScopes,
      oauthLastError: record.oauthLastError,
      oauthRequestedScopes: record.oauthRequestedScopes,
      updatedAt: record.updatedAt.toISOString(),
      url: record.url,
    };
  }
}
