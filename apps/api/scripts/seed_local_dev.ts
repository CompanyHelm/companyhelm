import "reflect-metadata";
import { and, eq } from "drizzle-orm";
import pino from "pino";
import { ApiContainer } from "../src/api_container.ts";
import { ApiCli } from "../src/cli/api_cli.ts";
import { ConfigLoader } from "../src/config/config_loader.ts";
import { Config, ConfigDocument } from "../src/config/schema.ts";
import { AdminDatabase } from "../src/db/admin_database.ts";
import { DbBootstrap } from "../src/db/bootstrap/bootstrap.ts";
import type { DatabaseTransactionInterface } from "../src/db/database_interface.ts";
import { agents, companies, companyMembers, users } from "../src/db/schema.ts";
import { ApiLogger } from "../src/log/api_logger.ts";
import { CompanyHelmLlmProviderService } from "../src/services/ai_providers/companyhelm_service.ts";
import { ModelService } from "../src/services/ai_providers/model_service.ts";
import { CompanyBootstrapService } from "../src/services/bootstrap/company.ts";

const LOCAL_DEV_USER_ID = "00000000-0000-4000-8000-000000000001";
const LOCAL_DEV_COMPANY_ID = "00000000-0000-4000-8000-000000000002";
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
    this.applyOpenAiFallback();
    const argumentsDocument = new ApiCli().parse(argv);
    const config = new Config(ConfigLoader.load(argumentsDocument.configPath, ConfigDocument));
    this.assertCompanyHelmProviderConfigured(config);

    const container = new ApiContainer().build(config);
    const logger = pino(ApiLogger.createOptions(config)).child({ component: "local_dev_seed" });
    const adminDatabase = container.get(AdminDatabase);

    try {
      await container.get(CompanyHelmLlmProviderService).refreshAvailableSeedModels(
        container.get(ModelService),
        logger,
      );
      await container.get(DbBootstrap).run();
      const seeded = await this.seed(adminDatabase, container.get(CompanyBootstrapService));
      logger.info(seeded, "seeded local development data");
    } finally {
      await adminDatabase.close();
    }
  }

  private applyOpenAiFallback(): void {
    if (!process.env.COMPANYHELM_OPENAI_API_KEY && process.env.OPENAI_API_KEY) {
      process.env.COMPANYHELM_OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    }
  }

  private assertCompanyHelmProviderConfigured(config: Config): void {
    if (!config.companyhelm.llm?.openai_api_key) {
      throw new Error("COMPANYHELM_OPENAI_API_KEY or OPENAI_API_KEY is required so local dev can seed the CEO agent with the CompanyHelm provider.");
    }
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
          deletionStatus: "active",
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

await new LocalDevSeedScript().run(process.argv);
