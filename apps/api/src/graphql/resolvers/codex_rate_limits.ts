import { and, asc, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { codexRateLimitSnapshots, modelProviderCredentials } from "../../db/schema.ts";
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

/**
 * Reads the latest persisted Codex limit snapshots for a company-owned credential. Network refresh
 * happens on the assistant-message write path, so this query stays cheap and predictable.
 */
@injectable()
export class CodexRateLimitsQueryResolver {
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

    return transactionProvider.transaction(async (tx) => {
      const [credential] = await tx
        .select({
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
          isCodexCredential: false,
          modelProviderCredentialId: credentialId,
          snapshots: [],
        };
      }

      const snapshots = await tx
        .select()
        .from(codexRateLimitSnapshots)
        .where(and(
          eq(codexRateLimitSnapshots.credentialSource, "user_provided"),
          eq(codexRateLimitSnapshots.credentialId, credentialId),
        ))
        .orderBy(asc(codexRateLimitSnapshots.limitId));

      return {
        isCodexCredential: true,
        modelProviderCredentialId: credentialId,
        snapshots: snapshots.map((snapshot) => ({
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
        })),
      };
    });
  };

  private serializeDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    return value.toISOString();
  }
}
