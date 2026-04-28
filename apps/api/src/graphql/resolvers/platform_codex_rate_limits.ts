import { asc, eq } from "drizzle-orm";
import { injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformCodexRateLimitSnapshots, platformModelProviderCredentials } from "../../db/schema.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";

type PlatformCodexRateLimitsQueryArguments = {
  platformModelProviderCredentialId: string;
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
 * Reads the platform-owned Codex limit snapshots behind the platform admin LLM credential detail
 * page. Platform credentials are not company scoped, so the resolver opts into the transaction-local
 * platform admin access policy before touching the credential or snapshot tables.
 */
@injectable()
export class PlatformCodexRateLimitsQueryResolver {
  execute = async (
    _root: unknown,
    args: PlatformCodexRateLimitsQueryArguments,
    context: GraphqlRequestContext,
  ): Promise<CodexRateLimitsGraphql> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }

    const credentialId = String(args.platformModelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("Platform model provider credential ID is required.");
    }

    return transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      const [credential] = await tx
        .select({
          id: platformModelProviderCredentials.id,
          modelProvider: platformModelProviderCredentials.modelProvider,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credentialId));
      if (!credential) {
        throw new Error("Platform model provider credential not found.");
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
        .from(platformCodexRateLimitSnapshots)
        .where(eq(platformCodexRateLimitSnapshots.platformModelProviderCredentialId, credentialId))
        .orderBy(asc(platformCodexRateLimitSnapshots.limitId));

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

  private assertPlatformAdmin(context: GraphqlRequestContext): void {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (context.authSession.user.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }

  private serializeDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    return value.toISOString();
  }
}
