import { and, eq, inArray } from "drizzle-orm";
import { injectable } from "inversify";
import { agents, agentDefaultMcpServers, mcpServers } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";

export type McpServerRecord = {
  callTimeoutMs: number;
  companyId: string;
  createdAt: Date;
  description: string | null;
  enabled: boolean;
  headers: Record<string, string>;
  id: string;
  name: string;
  updatedAt: Date;
  url: string;
};

type AgentRecord = {
  id: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type InsertableDatabase = {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

type UpdatableDatabase = {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): {
        returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
      };
    };
  };
};

type DeletableDatabase = {
  delete(table: unknown): {
    where(condition: unknown): {
      returning?(selection?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
    };
  };
};

@injectable()
export class McpService {
  async createMcpServer(
    transactionProvider: TransactionProviderInterface,
    input: {
      callTimeoutMs?: number | null;
      companyId: string;
      description?: string | null;
      enabled?: boolean | null;
      headersText?: string | null;
      name: string;
      url: string;
      userId: string;
    },
  ): Promise<McpServerRecord> {
    const name = this.requireNonEmptyValue(input.name, "MCP server name");
    const url = this.requireHttpUrl(input.url);
    const description = this.normalizeOptionalText(input.description);
    const headers = this.parseHeadersText(input.headersText);
    const callTimeoutMs = this.resolveCallTimeoutMs(input.callTimeoutMs ?? undefined);
    const enabled = input.enabled ?? true;

    return transactionProvider.transaction(async (tx) => {
      const insertableDatabase = tx as InsertableDatabase;
      const now = new Date();
      const [createdServer] = await insertableDatabase
        .insert(mcpServers)
        .values({
          callTimeoutMs,
          companyId: input.companyId,
          createdAt: now,
          createdByUserId: input.userId,
          description,
          enabled,
          headers,
          name,
          updatedAt: now,
          updatedByUserId: input.userId,
          url,
        })
        .returning?.(this.mcpServerSelection()) as McpServerRecord[];

      if (!createdServer) {
        throw new Error("Failed to create MCP server.");
      }

      return createdServer;
    });
  }

  async updateMcpServer(
    transactionProvider: TransactionProviderInterface,
    input: {
      callTimeoutMs?: number | null;
      companyId: string;
      description?: string | null;
      enabled?: boolean | null;
      headersText?: string | null;
      mcpServerId: string;
      name?: string | null;
      url?: string | null;
      userId: string;
    },
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const updatableDatabase = tx as UpdatableDatabase;
      const existingServer = await this.requireMcpServer(selectableDatabase, input.companyId, input.mcpServerId);
      const [updatedServer] = await updatableDatabase
        .update(mcpServers)
        .set({
          callTimeoutMs: input.callTimeoutMs === undefined
            ? existingServer.callTimeoutMs
            : this.resolveCallTimeoutMs(input.callTimeoutMs),
          description: input.description === undefined
            ? existingServer.description
            : this.normalizeOptionalText(input.description),
          enabled: input.enabled ?? existingServer.enabled,
          headers: input.headersText === undefined
            ? existingServer.headers
            : this.parseHeadersText(input.headersText),
          name: input.name == null
            ? existingServer.name
            : this.requireNonEmptyValue(input.name, "MCP server name"),
          updatedAt: new Date(),
          updatedByUserId: input.userId,
          url: input.url == null
            ? existingServer.url
            : this.requireHttpUrl(input.url),
        })
        .where(and(
          eq(mcpServers.companyId, input.companyId),
          eq(mcpServers.id, input.mcpServerId),
        ))
        .returning?.(this.mcpServerSelection()) as McpServerRecord[];

      if (!updatedServer) {
        throw new Error("Failed to update MCP server.");
      }

      return updatedServer;
    });
  }

  async deleteMcpServer(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    mcpServerId: string,
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const deletableDatabase = tx as DeletableDatabase;
      const [deletedServer] = await deletableDatabase
        .delete(mcpServers)
        .where(and(
          eq(mcpServers.companyId, companyId),
          eq(mcpServers.id, mcpServerId),
        ))
        .returning?.(this.mcpServerSelection()) as McpServerRecord[];

      if (!deletedServer) {
        throw new Error("MCP server not found.");
      }

      return deletedServer;
    });
  }

  async listMcpServers(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
  ): Promise<McpServerRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const records = await selectableDatabase
        .select(this.mcpServerSelection())
        .from(mcpServers)
        .where(eq(mcpServers.companyId, companyId)) as McpServerRecord[];

      return [...records].sort((left, right) => left.name.localeCompare(right.name));
    });
  }

  async listAgentMcpServers(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<McpServerRecord[]> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      await this.requireAgent(selectableDatabase, companyId, agentId);
      const attachments = await selectableDatabase
        .select({
          mcpServerId: agentDefaultMcpServers.mcpServerId,
        })
        .from(agentDefaultMcpServers)
        .where(and(
          eq(agentDefaultMcpServers.companyId, companyId),
          eq(agentDefaultMcpServers.agentId, agentId),
        )) as Array<{ mcpServerId: string }>;

      return this.listMcpServersByIds(
        selectableDatabase,
        companyId,
        attachments.map((attachment) => attachment.mcpServerId),
      );
    });
  }

  async attachMcpServerToAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      mcpServerId: string;
      userId: string;
    },
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const insertableDatabase = tx as InsertableDatabase;
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);
      const server = await this.requireMcpServer(selectableDatabase, input.companyId, input.mcpServerId);

      await insertableDatabase
        .insert(agentDefaultMcpServers)
        .values({
          agentId: input.agentId,
          companyId: input.companyId,
          createdAt: new Date(),
          createdByUserId: input.userId,
          mcpServerId: input.mcpServerId,
        })
        .returning?.();

      return server;
    }).catch((error) => {
      if (error instanceof Error && /duplicate key value/i.test(error.message)) {
        throw new Error("MCP server already attached to agent.");
      }

      throw error;
    });
  }

  async detachMcpServerFromAgent(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      mcpServerId: string;
    },
  ): Promise<McpServerRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const deletableDatabase = tx as DeletableDatabase;
      const server = await this.requireMcpServer(selectableDatabase, input.companyId, input.mcpServerId);
      await this.requireAgent(selectableDatabase, input.companyId, input.agentId);

      const [deletedRecord] = await deletableDatabase
        .delete(agentDefaultMcpServers)
        .where(and(
          eq(agentDefaultMcpServers.companyId, input.companyId),
          eq(agentDefaultMcpServers.agentId, input.agentId),
          eq(agentDefaultMcpServers.mcpServerId, input.mcpServerId),
        ))
        .returning?.({
          mcpServerId: agentDefaultMcpServers.mcpServerId,
        }) as Array<{ mcpServerId: string }>;

      if (!deletedRecord) {
        throw new Error("MCP server is not attached to this agent.");
      }

      return server;
    });
  }

  private async listMcpServersByIds(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    mcpServerIds: string[],
  ): Promise<McpServerRecord[]> {
    const normalizedIds = [...new Set(mcpServerIds.filter((id) => id.length > 0))];
    if (normalizedIds.length === 0) {
      return [];
    }

    const records = await selectableDatabase
      .select(this.mcpServerSelection())
      .from(mcpServers)
      .where(and(
        eq(mcpServers.companyId, companyId),
        inArray(mcpServers.id, normalizedIds),
      )) as McpServerRecord[];

    return [...records].sort((left, right) => left.name.localeCompare(right.name));
  }

  private async requireAgent(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    agentId: string,
  ): Promise<AgentRecord> {
    const [agent] = await selectableDatabase
      .select({
        id: agents.id,
      })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.id, agentId),
      )) as AgentRecord[];

    if (!agent) {
      throw new Error("Agent not found.");
    }

    return agent;
  }

  private async requireMcpServer(
    selectableDatabase: SelectableDatabase,
    companyId: string,
    mcpServerId: string,
  ): Promise<McpServerRecord> {
    const [server] = await selectableDatabase
      .select(this.mcpServerSelection())
      .from(mcpServers)
      .where(and(
        eq(mcpServers.companyId, companyId),
        eq(mcpServers.id, mcpServerId),
      )) as McpServerRecord[];

    if (!server) {
      throw new Error("MCP server not found.");
    }

    return server;
  }

  private mcpServerSelection() {
    return {
      callTimeoutMs: mcpServers.callTimeoutMs,
      companyId: mcpServers.companyId,
      createdAt: mcpServers.createdAt,
      description: mcpServers.description,
      enabled: mcpServers.enabled,
      headers: mcpServers.headers,
      id: mcpServers.id,
      name: mcpServers.name,
      updatedAt: mcpServers.updatedAt,
      url: mcpServers.url,
    };
  }

  private requireNonEmptyValue(value: string, label: string): string {
    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      throw new Error(`${label} is required.`);
    }

    return normalizedValue;
  }

  private normalizeOptionalText(value: string | null | undefined): string | null {
    const normalizedValue = String(value ?? "").trim();
    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private requireHttpUrl(value: string): string {
    const normalizedValue = this.requireNonEmptyValue(value, "MCP server URL");
    let url: URL;
    try {
      url = new URL(normalizedValue);
    } catch {
      throw new Error("MCP server URL must be a valid absolute URL.");
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("MCP server URL must use http or https.");
    }

    return url.toString();
  }

  private resolveCallTimeoutMs(value: number | null | undefined): number {
    const normalizedValue = Number(value ?? 10_000);
    if (!Number.isFinite(normalizedValue) || normalizedValue < 1) {
      throw new Error("Call timeout must be a positive number of milliseconds.");
    }

    return Math.floor(normalizedValue);
  }

  private parseHeadersText(value: string | null | undefined): Record<string, string> {
    const normalizedValue = String(value ?? "").trim();
    if (normalizedValue.length === 0) {
      return {};
    }

    const headers: Record<string, string> = {};
    for (const line of normalizedValue.split(/\r?\n/u)) {
      const trimmedLine = line.trim();
      if (trimmedLine.length === 0) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf(":");
      if (separatorIndex <= 0) {
        throw new Error("Each header line must use the format 'Name: Value'.");
      }

      const name = trimmedLine.slice(0, separatorIndex).trim();
      const headerValue = trimmedLine.slice(separatorIndex + 1).trim();
      if (name.length === 0 || headerValue.length === 0) {
        throw new Error("Each header line must use the format 'Name: Value'.");
      }

      headers[name] = headerValue;
    }

    return headers;
  }
}
