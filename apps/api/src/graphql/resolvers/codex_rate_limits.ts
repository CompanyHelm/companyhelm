import { and, asc, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { codexRateLimitSnapshots, modelProviderCredentials } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { CodexRateLimitService } from "../../services/ai_providers/codex_rate_limit_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type CodexRateLimitsQueryArguments = {
  modelProviderCredentialId: string;
};

type CodexRateLimitWindowGraphql = {
  resetsAt: string | null;
  usedPercent: number | null;
  windowMinutes: number | null;
};

type CodexRateLimitCreditsGraphql = {
  balance: string | null;
  hasCredits: boolean | null;
  unlimited: boolean | null;
};

type CodexRateLimitSnapshotGraphql = {
  credits: CodexRateLimitCreditsGraphql;
  lastError: string | null;
  limitId: string;
  limitName: string | null;
  planType: string | null;
  primary: CodexRateLimitWindowGraphql;
  rateLimitReachedType: string | null;
  refreshedAt: string;
  secondary: CodexRateLimitWindowGraphql;
};

type CodexRateLimitsGraphql = {
  isCodexCredential: boolean;
  modelProviderCredentialId: string;
  snapshots: CodexRateLimitSnapshotGraphql[];
};

type CodexRateLimitCredentialRecord = {
  baseUrl: string | null;
  companyId: string;
  encryptedApiKey: string;
  id: string;
  modelProvider: string;
};

type CodexRateLimitsReadResult = CodexRateLimitsGraphql & {
  credential: CodexRateLimitCredentialRecord | null;
};

/**
 * Reads the latest persisted Codex limit snapshots for a company-owned credential. The first empty
 * read bootstraps the snapshot from ChatGPT so the Limit tab is useful before an assistant response
 * has completed with this credential.
 */
@injectable()
export class CodexRateLimitsQueryResolver {
  private readonly codexRateLimitService: CodexRateLimitService;

  constructor(codexRateLimitService: CodexRateLimitService = new CodexRateLimitService()) {
    this.codexRateLimitService = codexRateLimitService;
  }

  execute = async (
    _root: unknown,
    args: CodexRateLimitsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<CodexRateLimitsGraphql> => {
    const authSession = context.authSession;
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!authSession?.company?.id || !transactionProvider) {
      throw new Error("Authentication required.");
    }
    const companyId = authSession.company.id;

    const credentialId = String(args.modelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("Credential ID is required.");
    }

    let rateLimits = await this.readRateLimits(transactionProvider, companyId, credentialId);
    if (!rateLimits.isCodexCredential || rateLimits.snapshots.length > 0) {
      return this.presentRateLimits(rateLimits);
    }

    let refreshError: unknown = null;
    try {
      await this.codexRateLimitService.refreshCredentialLimits(transactionProvider, {
        apiKey: rateLimits.credential?.encryptedApiKey ?? "",
        baseUrl: rateLimits.credential?.baseUrl ?? null,
        companyId,
        credentialId,
        credentialSource: "user_provided",
        modelProvider: rateLimits.credential?.modelProvider ?? "",
      });
    } catch (error: unknown) {
      refreshError = error;
    }

    rateLimits = await this.readRateLimits(transactionProvider, companyId, credentialId);
    if (rateLimits.snapshots.length === 0 && refreshError) {
      throw refreshError instanceof Error ? refreshError : new Error("Codex usage request failed.");
    }

    return this.presentRateLimits(rateLimits);
  };

  private async readRateLimits(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    credentialId: string,
  ): Promise<CodexRateLimitsReadResult> {
    return transactionProvider.transaction(async (tx) => {
      const [credential] = await tx
        .select({
          baseUrl: modelProviderCredentials.baseUrl,
          companyId: modelProviderCredentials.companyId,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
          id: modelProviderCredentials.id,
          modelProvider: modelProviderCredentials.modelProvider,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credentialId),
        ));
      if (!credential) {
        throw new Error("Model provider credential not found.");
      }

      if (credential.modelProvider !== "openai-codex") {
        return {
          credential,
          isCodexCredential: false,
          modelProviderCredentialId: credentialId,
          snapshots: [],
        };
      }

      const snapshots = await tx
        .select()
        .from(codexRateLimitSnapshots)
        .where(and(
          eq(codexRateLimitSnapshots.companyId, companyId),
          eq(codexRateLimitSnapshots.credentialId, credentialId),
        ))
        .orderBy(asc(codexRateLimitSnapshots.limitId));

      return {
        credential,
        isCodexCredential: true,
        modelProviderCredentialId: credentialId,
        snapshots: snapshots.map((snapshot) => this.serializeSnapshot(snapshot)),
      };
    });
  }

  private presentRateLimits(rateLimits: CodexRateLimitsReadResult): CodexRateLimitsGraphql {
    return {
      isCodexCredential: rateLimits.isCodexCredential,
      modelProviderCredentialId: rateLimits.modelProviderCredentialId,
      snapshots: rateLimits.snapshots,
    };
  }

  private serializeSnapshot(snapshot: typeof codexRateLimitSnapshots.$inferSelect): CodexRateLimitSnapshotGraphql {
    return {
      credits: {
        balance: snapshot.creditsBalance,
        hasCredits: snapshot.creditsHasCredits,
        unlimited: snapshot.creditsUnlimited,
      },
      lastError: snapshot.lastError,
      limitId: snapshot.limitId,
      limitName: snapshot.limitName,
      planType: snapshot.planType,
      primary: {
        resetsAt: this.serializeDate(snapshot.primaryResetsAt),
        usedPercent: snapshot.primaryUsedPercent,
        windowMinutes: snapshot.primaryWindowMinutes,
      },
      rateLimitReachedType: snapshot.rateLimitReachedType,
      refreshedAt: this.serializeDate(snapshot.refreshedAt) ?? new Date(0).toISOString(),
      secondary: {
        resetsAt: this.serializeDate(snapshot.secondaryResetsAt),
        usedPercent: snapshot.secondaryUsedPercent,
        windowMinutes: snapshot.secondaryWindowMinutes,
      },
    };
  }

  private serializeDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    return value.toISOString();
  }
}
