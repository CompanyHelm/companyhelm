import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformModelProviderCredentials } from "../../db/schema.ts";
import { CodexRateLimitService } from "../../services/ai_providers/codex_rate_limit_service.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { PlatformCodexRateLimitsQueryResolver } from "../resolvers/platform_codex_rate_limits.ts";
import { Mutation } from "./mutation.ts";

type RefreshPlatformCodexRateLimitsMutationArguments = {
  input: {
    platformModelProviderCredentialId: string;
  };
};

type CredentialRecord = {
  baseUrl: string | null;
  encryptedApiKey: string;
  id: string;
  modelProvider: string;
};

type CodexRateLimitsGraphql = Awaited<ReturnType<PlatformCodexRateLimitsQueryResolver["execute"]>>;

/**
 * Forces a platform Codex limit refresh from the platform admin credential detail page. It writes
 * only platform snapshot rows and requires the same platform-admin guard as the read-side resolver.
 */
@injectable()
export class RefreshPlatformCodexRateLimitsMutation extends Mutation<
  RefreshPlatformCodexRateLimitsMutationArguments,
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
    arguments_: RefreshPlatformCodexRateLimitsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<CodexRateLimitsGraphql> => {
    this.assertPlatformAdmin(context);
    const transactionProvider = context.app_runtime_transaction_provider;
    if (!transactionProvider) {
      throw new Error("Authentication required.");
    }
    const credentialId = String(arguments_.input.platformModelProviderCredentialId || "").trim();
    if (!credentialId) {
      throw new Error("platformModelProviderCredentialId is required.");
    }

    const [credential] = await transactionProvider.transaction(async (tx) => {
      await PlatformAdminAccess.enable(tx);
      return tx
        .select({
          baseUrl: platformModelProviderCredentials.baseUrl,
          encryptedApiKey: platformModelProviderCredentials.encryptedApiKey,
          id: platformModelProviderCredentials.id,
          modelProvider: platformModelProviderCredentials.modelProvider,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credentialId)) as Promise<CredentialRecord[]>;
    });
    if (!credential) {
      throw new Error("Platform model provider credential not found.");
    }

    await this.codexRateLimitService.refreshCredentialLimits(
      transactionProvider,
      {
        apiKey: credential.encryptedApiKey,
        baseUrl: credential.baseUrl,
        companyId: context.authSession?.company?.id ?? "",
        credentialId: credential.id,
        credentialSource: "platform",
        modelProvider: credential.modelProvider,
      },
      new Date(),
      { force: true },
    );

    return new PlatformCodexRateLimitsQueryResolver().execute(
      null,
      { platformModelProviderCredentialId: credential.id },
      context,
    );
  };

  private assertPlatformAdmin(context: GraphqlRequestContext): void {
    if (!context.authSession?.user) {
      throw new Error("Authentication required.");
    }
    if (context.isPlatformAdmin !== true) {
      throw new Error("Platform admin access required.");
    }
  }
}
