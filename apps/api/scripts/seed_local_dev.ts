import "reflect-metadata";
import { pathToFileURL } from "node:url";
import { and, eq } from "drizzle-orm";
import pino from "pino";
import { ApiContainer } from "../src/api_container.ts";
import { ApiCli } from "../src/cli/api_cli.ts";
import { ConfigLoader } from "../src/config/config_loader.ts";
import { Config, ConfigDocument } from "../src/config/schema.ts";
import { AdminDatabase } from "../src/db/admin_database.ts";
import { DbBootstrap } from "../src/db/bootstrap/bootstrap.ts";
import type { DatabaseTransactionInterface } from "../src/db/database_interface.ts";
import { PlatformAdminAccess } from "../src/db/platform_admin_access.ts";
import {
  agents,
  companies,
  companyMembers,
  platformModelProviderCredentials,
  platformModels,
  users,
} from "../src/db/schema.ts";
import type { TransactionProviderInterface } from "../src/db/transaction_provider_interface.ts";
import { ApiLogger } from "../src/log/api_logger.ts";
import { ModelRegistry } from "../src/services/ai_providers/model_registry.ts";
import { ModelService } from "../src/services/ai_providers/model_service.ts";
import { PlatformModelProviderCredentialService } from "../src/services/ai_providers/platform_model_provider_credential_service.ts";
import { CompanyBootstrapService } from "../src/services/bootstrap/company.ts";

const LOCAL_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
const LOCAL_DEV_COMPANY_ID = "00000000-0000-4000-8000-000000000002";
const LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID = "00000000-0000-4000-8000-000000000003";
const LOCAL_DEV_OPENAI_API_KEY_ENV_VAR = "COMPANYHELM_LOCAL_OPENAI_API_KEY";
const LOCAL_DEV_SEED_OPENAI_FLAG = "--seed-openai-from-env";
const LOCAL_DEV_USER_EMAIL = "andrea.local@companyhelm.dev";
const LOCAL_DEV_COMPANY_SLUG = "companyhelm-local";

type LocalDevUserRecord = {
  id: string;
};

type LocalDevCompanyRecord = {
  id: string;
};

type LocalDevAgentRecord = {
  id: string;
};

type LocalDevPlatformCredentialRecord = {
  id: string;
};

type LocalDevPlatformModelRecord = {
  id: string;
};

type LocalDevSeedOptions = {
  configPath: string;
  shouldSeedOpenAiFromEnv: boolean;
};

type LocalDevMutableDatabase = DatabaseTransactionInterface & {
  insert(table: unknown): {
    values(value: Record<string, unknown>): {
      onConflictDoNothing(): Promise<unknown>;
    };
  };
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

/**
 * Seeds the deterministic dev-auth user, company, and CEO agent used by local-dev and local-e2b.
 * It reuses the normal company bootstrap path so the agent is wired to the CompanyHelm-managed
 * model provider and the default CompanyHelm compute provider exactly like product onboarding.
 */
export class LocalDevSeedScript {
  async run(argv: string[] = process.argv): Promise<void> {
    const seedOptions = this.parseSeedOptions(argv);
    const config = new Config(ConfigLoader.load(seedOptions.configPath, ConfigDocument));
    const openAiApiKey = this.resolveOpenAiApiKey(seedOptions);

    const container = new ApiContainer().build(config);
    const logger = pino(ApiLogger.createOptions(config)).child({ component: "local_dev_seed" });
    const adminDatabase = container.get(AdminDatabase);

    try {
      await container.get(DbBootstrap).run();
      if (openAiApiKey) {
        await this.seedPlatformOpenAiCredential(
          adminDatabase,
          openAiApiKey,
          new PlatformModelProviderCredentialService(
            new ModelRegistry(),
            container.get(ModelService),
          ),
        );
      }
      const seeded = await this.seed(adminDatabase, container.get(CompanyBootstrapService));
      logger.info(seeded, "seeded local development data");
    } finally {
      await adminDatabase.close();
    }
  }

  parseSeedOptions(argv: string[]): LocalDevSeedOptions {
    const shouldSeedOpenAiFromEnv = argv.includes(LOCAL_DEV_SEED_OPENAI_FLAG);
    const apiArgv = argv.filter((argument) => argument !== LOCAL_DEV_SEED_OPENAI_FLAG);
    const argumentsDocument = new ApiCli().parse(apiArgv);

    return {
      configPath: argumentsDocument.configPath,
      shouldSeedOpenAiFromEnv,
    };
  }

  resolveOpenAiApiKey(seedOptions: LocalDevSeedOptions): string | null {
    if (!seedOptions.shouldSeedOpenAiFromEnv) {
      return null;
    }

    const openAiApiKey = String(process.env[LOCAL_DEV_OPENAI_API_KEY_ENV_VAR] || "").trim();
    if (!openAiApiKey) {
      throw new Error(`${LOCAL_DEV_OPENAI_API_KEY_ENV_VAR} is required when ${LOCAL_DEV_SEED_OPENAI_FLAG} is passed.`);
    }

    return openAiApiKey;
  }

  async validateOpenAiApiKey(
    openAiApiKey: string,
    platformCredentialService: Pick<PlatformModelProviderCredentialService, "fetchModels">,
  ): Promise<void> {
    await platformCredentialService.fetchModels({
      apiKey: openAiApiKey,
      baseUrl: null,
      modelProvider: "openai",
    });
  }

  private async seedPlatformOpenAiCredential(
    adminDatabase: AdminDatabase,
    openAiApiKey: string,
    platformCredentialService: PlatformModelProviderCredentialService,
  ): Promise<void> {
    const database = adminDatabase.getDatabase();
    if (!database.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    await this.validateOpenAiApiKey(openAiApiKey, platformCredentialService);

    await database.transaction(async (transaction) => {
      await this.upsertPlatformOpenAiCredential(transaction as DatabaseTransactionInterface, openAiApiKey);
    });
    const transactionProvider: TransactionProviderInterface = {
      transaction: async (callback) => database.transaction((transaction) => callback(transaction as never)),
    };

    await platformCredentialService.refreshStoredModels({
      apiKey: openAiApiKey,
      baseUrl: null,
      modelProvider: "openai",
      platformModelProviderCredentialId: LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID,
      transactionProvider,
    });

    await database.transaction(async (transaction) => {
      await this.setDefaultPlatformOpenAiModel(transaction as DatabaseTransactionInterface);
    });
  }

  private async upsertPlatformOpenAiCredential(
    transaction: DatabaseTransactionInterface,
    openAiApiKey: string,
  ): Promise<void> {
    await PlatformAdminAccess.enable(transaction);
    const [existingCredential] = await transaction
      .select({ id: platformModelProviderCredentials.id })
      .from(platformModelProviderCredentials)
      .where(eq(platformModelProviderCredentials.id, LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID))
      .limit(1) as LocalDevPlatformCredentialRecord[];
    const now = new Date();
    const database = transaction as LocalDevMutableDatabase;
    if (existingCredential) {
      await database
        .update(platformModelProviderCredentials)
        .set({
          name: "Local OpenAI",
          modelProvider: "openai",
          type: "api_key",
          encryptedApiKey: openAiApiKey,
          baseUrl: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshedAt: null,
          status: "active",
          errorMessage: null,
          updatedAt: now,
        })
        .where(eq(platformModelProviderCredentials.id, existingCredential.id));
      return;
    }

    await transaction
      .insert(platformModelProviderCredentials)
      .values({
        id: LOCAL_DEV_PLATFORM_OPENAI_CREDENTIAL_ID,
        name: "Local OpenAI",
        modelProvider: "openai",
        type: "api_key",
        encryptedApiKey: openAiApiKey,
        baseUrl: null,
        refreshToken: null,
        accessTokenExpiresAt: null,
        refreshedAt: null,
        status: "active",
        errorMessage: null,
        createdByUserId: null,
        createdAt: now,
        updatedAt: now,
      });
  }

  private async setDefaultPlatformOpenAiModel(transaction: DatabaseTransactionInterface): Promise<void> {
    await PlatformAdminAccess.enable(transaction);
    const modelRegistry = new ModelRegistry();
    const defaultModelId = modelRegistry.getDefaultModelForProvider("openai");
    const [preferredPlatformModel] = await transaction
      .select({ id: platformModels.id })
      .from(platformModels)
      .where(eq(platformModels.key, `openai:${defaultModelId}`))
      .limit(1) as LocalDevPlatformModelRecord[];
    const [fallbackPlatformModel] = preferredPlatformModel
      ? [preferredPlatformModel]
      : await transaction
        .select({ id: platformModels.id })
        .from(platformModels)
        .where(eq(platformModels.modelProvider, "openai"))
        .limit(1) as LocalDevPlatformModelRecord[];
    if (!fallbackPlatformModel) {
      throw new Error("Failed to seed any OpenAI platform models.");
    }

    const now = new Date();
    const database = transaction as LocalDevMutableDatabase;
    await database
      .update(platformModels)
      .set({
        isDefault: false,
        updatedAt: now,
      })
      .where(eq(platformModels.isDefault, true));
    await database
      .update(platformModels)
      .set({
        isDefault: true,
        updatedAt: now,
      })
      .where(eq(platformModels.id, fallbackPlatformModel.id));
  }

  private async seed(
    adminDatabase: AdminDatabase,
    companyBootstrapService: CompanyBootstrapService,
  ): Promise<{ agentId: string; companyId: string; userId: string }> {
    const database = adminDatabase.getDatabase();
    if (!database.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    return database.transaction(async (transaction) => {
      const userId = await this.ensureUser(transaction as DatabaseTransactionInterface);
      const companyId = await this.ensureCompany(transaction as DatabaseTransactionInterface);
      await this.ensureMembership(transaction as DatabaseTransactionInterface, companyId, userId);
      await companyBootstrapService.ensureCompanyDefaults(transaction as DatabaseTransactionInterface, companyId);
      await companyBootstrapService.ensureOnboardingAssets(transaction as DatabaseTransactionInterface, {
        companyId,
        llmSetupStatus: "company_managed",
      });
      const agentId = await this.loadSeedAgentId(transaction as DatabaseTransactionInterface, companyId);
      return { agentId, companyId, userId };
    });
  }

  private async ensureUser(transaction: DatabaseTransactionInterface): Promise<string> {
    const [existingUser] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, LOCAL_DEV_USER_EMAIL))
      .limit(1) as LocalDevUserRecord[];
    const now = new Date();
    if (existingUser) {
      await (transaction as LocalDevMutableDatabase)
        .update(users)
        .set({
          first_name: "Andrea",
          isPlatformAdmin: true,
          last_name: "Local",
          updated_at: now,
        })
        .where(eq(users.id, existingUser.id));
      return existingUser.id;
    }

    await transaction
      .insert(users)
      .values({
        clerkUserId: null,
        created_at: now,
        email: LOCAL_DEV_USER_EMAIL,
        first_name: "Andrea",
        id: LOCAL_DEV_USER_ID,
        isPlatformAdmin: true,
        last_name: "Local",
        updated_at: now,
      });
    return LOCAL_DEV_USER_ID;
  }

  private async ensureCompany(transaction: DatabaseTransactionInterface): Promise<string> {
    const [existingCompany] = await transaction
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, LOCAL_DEV_COMPANY_SLUG))
      .limit(1) as LocalDevCompanyRecord[];
    if (existingCompany) {
      await (transaction as LocalDevMutableDatabase)
        .update(companies)
        .set({
          name: "CompanyHelm Local",
          plan: "pro",
        })
        .where(eq(companies.id, existingCompany.id));
      return existingCompany.id;
    }

    await transaction
      .insert(companies)
      .values({
        clerkOrganizationId: null,
        id: LOCAL_DEV_COMPANY_ID,
        name: "CompanyHelm Local",
        plan: "pro",
        slug: LOCAL_DEV_COMPANY_SLUG,
      });
    return LOCAL_DEV_COMPANY_ID;
  }

  private async ensureMembership(
    transaction: DatabaseTransactionInterface,
    companyId: string,
    userId: string,
  ): Promise<void> {
    await (transaction as LocalDevMutableDatabase)
      .insert(companyMembers)
      .values({ companyId, userId })
      .onConflictDoNothing();
  }

  private async loadSeedAgentId(transaction: DatabaseTransactionInterface, companyId: string): Promise<string> {
    const [agent] = await transaction
      .select({ id: agents.id })
      .from(agents)
      .where(and(
        eq(agents.companyId, companyId),
        eq(agents.name, CompanyBootstrapService.SEED_AGENT_NAME),
      ))
      .limit(1) as LocalDevAgentRecord[];
    if (!agent) {
      throw new Error("Failed to seed the local CEO agent.");
    }

    return agent.id;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await new LocalDevSeedScript().run(process.argv);
}
