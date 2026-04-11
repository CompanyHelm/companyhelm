import assert from "node:assert/strict";
import { test } from "vitest";
import {
  agentSessions,
  agents,
  modelProviderCredentialModels,
  modelProviderCredentials,
} from "../src/db/schema.ts";
import { DeleteModelProviderCredentialMutation } from "../src/graphql/mutations/delete_model_provider_credential.ts";

type CredentialRow = {
  companyId: string;
  createdAt: Date;
  errorMessage: string | null;
  id: string;
  isDefault: boolean;
  modelProvider: "anthropic" | "openai" | "openai-codex" | "openrouter";
  name: string;
  refreshToken: string | null;
  refreshedAt: Date | null;
  status: "active" | "error";
  type: "api_key" | "oauth_token";
  updatedAt: Date;
};

type CredentialModelRow = {
  id: string;
  isDefault: boolean;
  modelId: string;
  modelProviderCredentialId: string;
  reasoningLevels: string[] | null;
};

type AgentRow = {
  defaultModelProviderCredentialModelId: string | null;
  defaultReasoningLevel: string | null;
  id: string;
  name: string;
};

type SessionRow = {
  currentModelProviderCredentialModelId: string;
  currentReasoningLevel: string;
  id: string;
};

/**
 * Emulates the narrow transactional surface used by the delete mutation so tests can assert
 * reference analysis, reassignment, and default promotion without the overhead of a live server.
 */
class DeleteModelProviderCredentialMutationTestHarness {
  private readonly targetCredentialId: string;
  private readonly replacementCredentialId: string | null;
  private readonly companyId: string;
  private readonly credentialRows: CredentialRow[];
  private readonly targetCredentialModels: CredentialModelRow[];
  private readonly replacementCredentialModels: CredentialModelRow[];
  private readonly agentRows: AgentRow[];
  private readonly sessionRows: SessionRow[];
  private readonly deletedCredentialIds: string[];
  private credentialSelectCount: number;
  private credentialModelSelectCount: number;
  private agentUpdateCount: number;
  private sessionUpdateCount: number;

  constructor(input: {
    agentRows?: AgentRow[];
    companyId?: string;
    credentialRows: CredentialRow[];
    replacementCredentialId?: string | null;
    replacementCredentialModels?: CredentialModelRow[];
    sessionRows?: SessionRow[];
    targetCredentialId: string;
    targetCredentialModels: CredentialModelRow[];
  }) {
    this.targetCredentialId = input.targetCredentialId;
    this.replacementCredentialId = input.replacementCredentialId ?? null;
    this.companyId = input.companyId ?? "company-123";
    this.credentialRows = input.credentialRows.map((credentialRow) => ({ ...credentialRow }));
    this.targetCredentialModels = input.targetCredentialModels.map((credentialModelRow) => ({
      ...credentialModelRow,
      reasoningLevels: credentialModelRow.reasoningLevels ? [...credentialModelRow.reasoningLevels] : null,
    }));
    this.replacementCredentialModels = (input.replacementCredentialModels ?? []).map((credentialModelRow) => ({
      ...credentialModelRow,
      reasoningLevels: credentialModelRow.reasoningLevels ? [...credentialModelRow.reasoningLevels] : null,
    }));
    this.agentRows = (input.agentRows ?? []).map((agentRow) => ({ ...agentRow }));
    this.sessionRows = (input.sessionRows ?? []).map((sessionRow) => ({ ...sessionRow }));
    this.deletedCredentialIds = [];
    this.credentialSelectCount = 0;
    this.credentialModelSelectCount = 0;
    this.agentUpdateCount = 0;
    this.sessionUpdateCount = 0;
  }

  getContext() {
    return {
      authSession: {
        company: {
          id: this.companyId,
          name: "Example Org",
        },
      },
      app_runtime_transaction_provider: {
        transaction: async <T>(callback: (tx: unknown) => Promise<T>): Promise<T> => {
          return callback(this.createTransaction());
        },
      },
    } as never;
  }

  getAgents(): AgentRow[] {
    return this.agentRows;
  }

  getDeletedCredentialIds(): string[] {
    return this.deletedCredentialIds;
  }

  getCredentials(): CredentialRow[] {
    return this.credentialRows;
  }

  getSessions(): SessionRow[] {
    return this.sessionRows;
  }

  private createTransaction() {
    return {
      delete: (table: unknown) => ({
        where: () => ({
          returning: async () => {
            if (table !== modelProviderCredentials) {
              return [];
            }

            const credentialIndex = this.credentialRows.findIndex((credentialRow) => credentialRow.id === this.targetCredentialId);
            if (credentialIndex < 0) {
              return [];
            }

            const [deletedCredential] = this.credentialRows.splice(credentialIndex, 1);
            if (!deletedCredential) {
              return [];
            }

            this.deletedCredentialIds.push(deletedCredential.id);
            return [deletedCredential];
          },
        }),
      }),
      select: () => ({
        from: (table: unknown) => ({
          where: async () => {
            if (table === modelProviderCredentials) {
              return this.selectCredentialRows();
            }
            if (table === modelProviderCredentialModels) {
              return this.selectCredentialModelRows();
            }
            if (table === agents) {
              return this.agentRows;
            }
            if (table === agentSessions) {
              return this.sessionRows;
            }

            return [];
          },
        }),
      }),
      update: (table: unknown) => ({
        set: (value: Record<string, unknown>) => ({
          where: async () => {
            if (table === agents) {
              this.updateAgentRow(value);
              return;
            }
            if (table === agentSessions) {
              this.updateSessionRow(value);
              return;
            }
            if (table !== modelProviderCredentials) {
              return;
            }

            if (value.isDefault === false) {
              this.credentialRows.forEach((credentialRow) => {
                credentialRow.isDefault = false;
              });
              return;
            }
            if (value.isDefault === true) {
              const [fallbackCredential] = [...this.credentialRows]
                .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
              if (fallbackCredential) {
                fallbackCredential.isDefault = true;
              }
            }
          },
        }),
      }),
    };
  }

  private selectCredentialModelRows(): CredentialModelRow[] {
    this.credentialModelSelectCount += 1;
    if (this.credentialModelSelectCount === 1) {
      return this.targetCredentialModels;
    }
    if (this.credentialModelSelectCount === 2 && this.replacementCredentialId) {
      return this.replacementCredentialModels;
    }

    return [];
  }

  private selectCredentialRows(): CredentialRow[] {
    this.credentialSelectCount += 1;
    if (this.credentialSelectCount === 1) {
      return this.credentialRows.filter((credentialRow) => credentialRow.id === this.targetCredentialId);
    }
    if (
      this.credentialSelectCount === 2
      && this.replacementCredentialId
      && (this.agentRows.length > 0 || this.sessionRows.length > 0)
    ) {
      return this.credentialRows.filter((credentialRow) => credentialRow.id === this.replacementCredentialId);
    }

    return [...this.credentialRows];
  }

  private updateAgentRow(value: Record<string, unknown>): void {
    const agentRow = this.agentRows[this.agentUpdateCount];
    this.agentUpdateCount += 1;
    if (!agentRow) {
      return;
    }

    agentRow.defaultModelProviderCredentialModelId = String(
      value.defaultModelProviderCredentialModelId ?? agentRow.defaultModelProviderCredentialModelId ?? "",
    ) || null;
    agentRow.defaultReasoningLevel = value.default_reasoning_level === null
      ? null
      : String(value.default_reasoning_level ?? agentRow.defaultReasoningLevel ?? "");
  }

  private updateSessionRow(value: Record<string, unknown>): void {
    const sessionRow = this.sessionRows[this.sessionUpdateCount];
    this.sessionUpdateCount += 1;
    if (!sessionRow) {
      return;
    }

    sessionRow.currentModelProviderCredentialModelId = String(
      value.currentModelProviderCredentialModelId ?? sessionRow.currentModelProviderCredentialModelId,
    );
    sessionRow.currentReasoningLevel = String(
      value.currentReasoningLevel ?? sessionRow.currentReasoningLevel,
    );
  }
}

test("DeleteModelProviderCredentialMutation deletes an unused default credential and promotes a fallback", async () => {
  const harness = new DeleteModelProviderCredentialMutationTestHarness({
    credentialRows: [{
      companyId: "company-123",
      createdAt: new Date("2026-04-04T10:00:00.000Z"),
      errorMessage: null,
      id: "credential-1",
      isDefault: true,
      modelProvider: "openai-codex",
      name: "Codex Primary",
      refreshToken: "refresh-token-1",
      refreshedAt: new Date("2026-04-04T10:05:00.000Z"),
      status: "active",
      type: "oauth_token",
      updatedAt: new Date("2026-04-04T10:06:00.000Z"),
    }, {
      companyId: "company-123",
      createdAt: new Date("2026-04-03T10:00:00.000Z"),
      errorMessage: null,
      id: "credential-2",
      isDefault: false,
      modelProvider: "openai",
      name: "OpenAI Backup",
      refreshToken: null,
      refreshedAt: null,
      status: "active",
      type: "api_key",
      updatedAt: new Date("2026-04-05T09:00:00.000Z"),
    }],
    targetCredentialId: "credential-1",
    targetCredentialModels: [{
      id: "model-1",
      isDefault: true,
      modelId: "gpt-5-codex",
      modelProviderCredentialId: "credential-1",
      reasoningLevels: ["medium", "high"],
    }],
  });

  const mutation = new DeleteModelProviderCredentialMutation();
  const deletedCredential = await mutation.execute(
    null,
    {
      input: {
        id: "credential-1",
      },
    },
    harness.getContext(),
  );

  assert.equal(deletedCredential.id, "credential-1");
  assert.deepEqual(harness.getDeletedCredentialIds(), ["credential-1"]);
  assert.equal(harness.getCredentials().length, 1);
  assert.equal(harness.getCredentials()[0]?.id, "credential-2");
  assert.equal(harness.getCredentials()[0]?.isDefault, true);
});

test("DeleteModelProviderCredentialMutation blocks deleting a credential that still has agents or sessions without replacement", async () => {
  const harness = new DeleteModelProviderCredentialMutationTestHarness({
    agentRows: [{
      defaultModelProviderCredentialModelId: "model-1",
      defaultReasoningLevel: "high",
      id: "agent-1",
      name: "Research Assistant",
    }],
    credentialRows: [{
      companyId: "company-123",
      createdAt: new Date("2026-04-04T10:00:00.000Z"),
      errorMessage: null,
      id: "credential-1",
      isDefault: false,
      modelProvider: "openai",
      name: "OpenAI Primary",
      refreshToken: null,
      refreshedAt: null,
      status: "active",
      type: "api_key",
      updatedAt: new Date("2026-04-04T10:06:00.000Z"),
    }],
    sessionRows: [{
      currentModelProviderCredentialModelId: "model-1",
      currentReasoningLevel: "high",
      id: "session-1",
    }],
    targetCredentialId: "credential-1",
    targetCredentialModels: [{
      id: "model-1",
      isDefault: true,
      modelId: "gpt-5",
      modelProviderCredentialId: "credential-1",
      reasoningLevels: ["medium", "high"],
    }],
  });

  const mutation = new DeleteModelProviderCredentialMutation();

  await assert.rejects(
    mutation.execute(
      null,
      {
        input: {
          id: "credential-1",
        },
      },
      harness.getContext(),
    ),
    new Error(
      "This credential is still used by agent Research Assistant and 1 existing session. Select a replacement credential before deleting it.",
    ),
  );
  assert.deepEqual(harness.getDeletedCredentialIds(), []);
  assert.equal(harness.getCredentials().length, 1);
});

test("DeleteModelProviderCredentialMutation reassigns affected agents and sessions before deleting", async () => {
  const harness = new DeleteModelProviderCredentialMutationTestHarness({
    agentRows: [{
      defaultModelProviderCredentialModelId: "model-1",
      defaultReasoningLevel: "high",
      id: "agent-1",
      name: "Research Assistant",
    }],
    credentialRows: [{
      companyId: "company-123",
      createdAt: new Date("2026-04-04T10:00:00.000Z"),
      errorMessage: null,
      id: "credential-1",
      isDefault: false,
      modelProvider: "openai",
      name: "OpenAI Primary",
      refreshToken: null,
      refreshedAt: null,
      status: "active",
      type: "api_key",
      updatedAt: new Date("2026-04-04T10:06:00.000Z"),
    }, {
      companyId: "company-123",
      createdAt: new Date("2026-04-05T10:00:00.000Z"),
      errorMessage: null,
      id: "credential-2",
      isDefault: true,
      modelProvider: "anthropic",
      name: "Anthropic Backup",
      refreshToken: null,
      refreshedAt: null,
      status: "active",
      type: "api_key",
      updatedAt: new Date("2026-04-05T10:06:00.000Z"),
    }],
    replacementCredentialId: "credential-2",
    replacementCredentialModels: [{
      id: "model-2",
      isDefault: true,
      modelId: "claude-sonnet-4-20250514",
      modelProviderCredentialId: "credential-2",
      reasoningLevels: ["medium", "high"],
    }],
    sessionRows: [{
      currentModelProviderCredentialModelId: "model-1",
      currentReasoningLevel: "high",
      id: "session-1",
    }],
    targetCredentialId: "credential-1",
    targetCredentialModels: [{
      id: "model-1",
      isDefault: true,
      modelId: "gpt-5",
      modelProviderCredentialId: "credential-1",
      reasoningLevels: ["medium", "high"],
    }],
  });

  const mutation = new DeleteModelProviderCredentialMutation();
  const deletedCredential = await mutation.execute(
    null,
    {
      input: {
        id: "credential-1",
        replacementCredentialId: "credential-2",
      },
    },
    harness.getContext(),
  );

  assert.equal(deletedCredential.id, "credential-1");
  assert.deepEqual(harness.getDeletedCredentialIds(), ["credential-1"]);
  assert.equal(harness.getAgents()[0]?.defaultModelProviderCredentialModelId, "model-2");
  assert.equal(harness.getAgents()[0]?.defaultReasoningLevel, "high");
  assert.equal(harness.getSessions()[0]?.currentModelProviderCredentialModelId, "model-2");
  assert.equal(harness.getSessions()[0]?.currentReasoningLevel, "high");
  assert.equal(harness.getCredentials().length, 1);
  assert.equal(harness.getCredentials()[0]?.id, "credential-2");
});
