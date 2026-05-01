import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { PlatformAdminAccess } from "../../db/platform_admin_access.ts";
import { platformModelProviderCredentials } from "../../db/schema.ts";
import { PlatformModelProviderCredentialService } from "../../services/ai_providers/platform_model_provider_credential_service.ts";
import type {
  GraphqlPlatformModelProviderCredentialModelRecord,
} from "../platform_model_provider_credential_record.ts";
import { PlatformModelProviderCredentialRecordPresenter } from "../platform_model_provider_credential_record.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import type { GraphqlRequestContext } from "../graphql_request_context.ts";
import { Mutation } from "./mutation.ts";

type RefreshPlatformModelProviderCredentialModelsMutationArguments = {
  input: {
    platformModelProviderCredentialId: string;
  };
};

type CredentialRecord = {
  id: string;
  baseUrl: string | null;
  encryptedApiKey: string;
  modelProvider: string;
};

/**
 * Revalidates a platform credential and reconciles its provider model catalog into platform model
 * rows, leaving all company credential models untouched.
 */
@injectable()
export class RefreshPlatformModelProviderCredentialModelsMutation extends Mutation<
  RefreshPlatformModelProviderCredentialModelsMutationArguments,
  GraphqlPlatformModelProviderCredentialModelRecord[]
> {
  private readonly platformCredentialService: PlatformModelProviderCredentialService;
  private readonly presenter: PlatformModelProviderCredentialRecordPresenter;

  constructor(
    @inject(PlatformModelProviderCredentialService)
    platformCredentialService: PlatformModelProviderCredentialService,
    @inject(ModelRegistry) modelRegistry: ModelRegistry = new ModelRegistry(),
  ) {
    super();
    this.platformCredentialService = platformCredentialService;
    this.presenter = new PlatformModelProviderCredentialRecordPresenter(modelRegistry);
  }

  protected resolve = async (
    arguments_: RefreshPlatformModelProviderCredentialModelsMutationArguments,
    context: GraphqlRequestContext,
  ): Promise<GraphqlPlatformModelProviderCredentialModelRecord[]> => {
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
          id: platformModelProviderCredentials.id,
          baseUrl: platformModelProviderCredentials.baseUrl,
          encryptedApiKey: platformModelProviderCredentials.encryptedApiKey,
          modelProvider: platformModelProviderCredentials.modelProvider,
        })
        .from(platformModelProviderCredentials)
        .where(eq(platformModelProviderCredentials.id, credentialId)) as Promise<CredentialRecord[]>;
    });
    if (!credential) {
      throw new Error("Platform model provider credential not found.");
    }

    const models = await this.platformCredentialService.refreshStoredModels({
      apiKey: credential.encryptedApiKey,
      baseUrl: credential.baseUrl,
      modelProvider: credential.modelProvider,
      platformModelProviderCredentialId: credential.id,
      transactionProvider,
    });

    return models.map((model) => this.presenter.serializeModel(model));
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
