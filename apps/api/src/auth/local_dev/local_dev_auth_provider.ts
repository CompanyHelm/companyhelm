import { eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { AuthProvider, type AuthSession, type AuthenticateBearerTokenHeaders } from "../auth_provider.ts";
import { Config } from "../../config/schema.ts";
import { AppRuntimeDatabase } from "../../db/app_runtime_database.ts";
import type { DatabaseClientInterface } from "../../db/database_interface.ts";
import { companies, users } from "../../db/schema.ts";
import { CompanyBootstrapService } from "../../services/bootstrap/company.ts";
import { UserBootstrapService } from "../../services/bootstrap/user.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import { CompanyHelmLlmProviderService } from "../../services/ai_providers/companyhelm_service.ts";
import { CompanyHelmComputeProviderService } from "../../services/compute_provider_definitions/companyhelm_service.ts";
import { LocalDevPreviewSeedService } from "./local_dev_preview_seed_service.ts";

const LOCAL_DEV_COMPANY_NAME = "CompanyHelm Local Dev";
const LOCAL_DEV_COMPANY_SUBJECT = "companyhelm-local-dev-org";
const LOCAL_DEV_COMPANY_SLUG = "local-dev";
const LOCAL_DEV_USER_EMAIL = "local-dev@companyhelm.local";
const LOCAL_DEV_USER_FIRST_NAME = "Local";
const LOCAL_DEV_USER_LAST_NAME = "Developer";
const LOCAL_DEV_USER_SUBJECT = "companyhelm-local-dev-user";

type UpdatableDatabase = DatabaseClientInterface & {
  update(table: unknown): {
    set(value: Record<string, unknown>): {
      where(condition: unknown): Promise<unknown>;
    };
  };
};

/**
 * Replaces Clerk token verification during local preview sessions, provisions one deterministic
 * company/user pair, and seeds preview data so the real app can be inspected end-to-end.
 */
@injectable()
export class LocalDevAuthProvider extends AuthProvider {
  readonly name = "clerk" as const;
  private readonly companyBootstrapService: CompanyBootstrapService;
  private readonly localDevPreviewSeedService: LocalDevPreviewSeedService;
  private readonly userBootstrapService: UserBootstrapService;

  constructor(
    @inject(Config) config: Config,
    @inject(UserBootstrapService) userBootstrapService: UserBootstrapService = new UserBootstrapService(),
    @inject(CompanyBootstrapService) companyBootstrapService: CompanyBootstrapService = new CompanyBootstrapService(
      new CompanyHelmComputeProviderService(config),
      new CompanyHelmLlmProviderService(config, new ModelRegistry()),
    ),
    @inject(LocalDevPreviewSeedService)
    localDevPreviewSeedService: LocalDevPreviewSeedService = new LocalDevPreviewSeedService(),
  ) {
    super();
    this.companyBootstrapService = companyBootstrapService;
    this.localDevPreviewSeedService = localDevPreviewSeedService;
    this.userBootstrapService = userBootstrapService;
  }

  async authenticateBearerToken(
    database: AppRuntimeDatabase,
    token: string,
    headers: AuthenticateBearerTokenHeaders = {},
  ): Promise<AuthSession> {
    void headers;
    const db = database.getDatabase();
    if (!db.transaction) {
      throw new Error("Configured database does not support transactions.");
    }

    return db.transaction(async (transaction) => {
      const user = await this.userBootstrapService.findOrCreateUser(transaction, {
        loadUser: async () => ({
          email: LOCAL_DEV_USER_EMAIL,
          firstName: LOCAL_DEV_USER_FIRST_NAME,
          lastName: LOCAL_DEV_USER_LAST_NAME,
        }),
        providerSubject: LOCAL_DEV_USER_SUBJECT,
      });
      await (transaction as unknown as UpdatableDatabase)
        .update(users)
        .set({
          isPlatformAdmin: true,
          updated_at: new Date(),
        })
        .where(eq(users.id, user.id));
      const company = await this.companyBootstrapService.findOrCreateCompany(transaction, {
        name: LOCAL_DEV_COMPANY_NAME,
        providerSubject: LOCAL_DEV_COMPANY_SUBJECT,
      });
      await (transaction as unknown as UpdatableDatabase)
        .update(companies)
        .set({
          slug: LOCAL_DEV_COMPANY_SLUG,
        })
        .where(eq(companies.id, company.id));
      await database.applyCompanyContext(transaction as DatabaseClientInterface, company.id);
      await this.companyBootstrapService.ensureMembership(transaction, {
        companyId: company.id,
        userId: user.id,
      });
      await this.companyBootstrapService.ensureCompanyDefaults(transaction, company.id, {
        seedAgent: company.wasCreated,
      });
      await this.localDevPreviewSeedService.ensurePreviewData(transaction, {
        companyId: company.id,
        userId: user.id,
      });

      return {
        token,
        user: {
          email: user.email,
          firstName: user.first_name,
          id: user.id,
          isPlatformAdmin: true,
          lastName: user.last_name,
          provider: "clerk",
          providerSubject: LOCAL_DEV_USER_SUBJECT,
        },
        company: {
          id: company.id,
          name: company.name,
        },
      };
    });
  }
}
