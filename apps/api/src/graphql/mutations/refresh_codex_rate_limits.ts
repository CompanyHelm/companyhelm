import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { modelProviderCredentials } from "../../db/schema.ts";
import { CodexRateLimitService } from "../../services/ai_providers/codex_rate_limit_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { CodexRateLimitsQueryResolver } from "../resolvers/codex_rate_limits.ts";
import { Mutation } from "./mutation.ts";

type RefreshCodexRateLimitsMutationArguments = {
  input: {
    modelProviderCredentialId: string;
  };
};

type CredentialRecord = {
  baseUrl: string | null;
  encryptedApiKey: string;
  id: string;
  modelProvider: string;
};

type CodexRateLimitsGraphql = Awaited<ReturnType<CodexRateLimitsQueryResolver["execute"]>>;

/**
 * Forces a company-owned Codex limit refresh for operators who need the Limit tab to reflect the
 * current upstream ChatGPT account state before the next assistant response completes.
 */
@injectable()
export class RefreshCodexRateLimitsMutation extends Mutation<
  RefreshCodexRateLimitsMutationArguments,
  CodexRateLimitsGraphql
> {
  private readonly codexRateLimitService: CodexRateLimitService;

  constructor(
    @inject(CodexRateLimitService)
    codexRateLimitService: CodexRateLimitService = new CodexRateLimitService(),
  ) {
    super();
    this.codexRateLimitService = codexRateLimitService;
  }

  protected resolve = async (
    arguments_: RefreshCodexRateLimitsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CodexRateLimitsGraphql> => {
    const authSession = context.authSession;
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!authSession?.company?.id || !transactionProvider) {
      throw new Error("Authentication required.");
    }
    const credentialId = String(arguments_.input.modelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("modelProviderCredentialId is required.");
    }
    const companyId = authSession.company.id;

    const [credential] = await transactionProvider.transaction(async (tx) =>
      tx
        .select({
          baseUrl: modelProviderCredentials.baseUrl,
          encryptedApiKey: modelProviderCredentials.encryptedApiKey,
          id: modelProviderCredentials.id,
          modelProvider: modelProviderCredentials.modelProvider,
        })
        .from(modelProviderCredentials)
        .where(and(
          eq(modelProviderCredentials.companyId, companyId),
          eq(modelProviderCredentials.id, credentialId),
        )) as Promise<CredentialRecord[]>
    );
    if (!credential) {
      throw new Error("Model provider credential not found.");
    }

    await this.codexRateLimitService.refreshCredentialLimits(
      transactionProvider,
      {
        apiKey: credential.encryptedApiKey,
        baseUrl: credential.baseUrl,
        companyId,
        credentialId: credential.id,
        credentialSource: "user_provided",
        modelProvider: credential.modelProvider,
      },
      new Date(),
      { force: true },
    );

    return new CodexRateLimitsQueryResolver(this.codexRateLimitService).execute(
      null,
      { modelProviderCredentialId: credential.id },
      context,
    );
  };
}
