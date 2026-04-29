import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { OrganizationSlugResolverFactory } from "../../auth/organization_slug_resolver_factory.ts";
import { GithubClient } from "../../github/client.ts";
import { GithubInstallationStateService } from "../../github/installation_state_service.ts";
import { SecretEncryptionService } from "../../services/secrets/encryption.ts";
import { SecretService } from "../../services/secrets/service.ts";
import { SkillGithubPublicClient } from "../../services/skills/github/public_client.ts";
import { SkillGithubCatalog } from "../../services/skills/github/catalog.ts";
import { SkillService } from "../../services/skills/service.ts";
import { ModelRegistry } from "../../services/ai_providers/model_registry.ts";
import { ModelService } from "../../services/ai_providers/model_service.ts";
import { PlatformModelProviderCredentialService } from "../../services/ai_providers/platform_model_provider_credential_service.ts";
import { McpService } from "../../services/mcp/service.ts";
import { AddGithubInstallationMutation } from "../mutations/add_github_installation.ts";
import { AddPlatformModelProviderCredentialMutation } from "../mutations/add_platform_model_provider_credential.ts";
import { CreateGithubInstallationUrlMutation } from "../mutations/create_github_installation_url.ts";
import { CreateGithubRepositoryProvisioningMutation } from "../mutations/create_github_repository_provisioning.ts";
import { CreateCompanyMutation } from "../mutations/create_company.ts";
import { CreatePlatformModelMutation } from "../mutations/create_platform_model.ts";
import { CreateSecretMutation } from "../mutations/create_secret.ts";
import { CreateSecretGroupMutation } from "../mutations/create_secret_group.ts";
import { CreateMcpServerMutation } from "../mutations/create_mcp_server.ts";
import { CreateSkillGroupMutation } from "../mutations/create_skill_group.ts";
import { CreateSkillMutation } from "../mutations/create_skill.ts";
import { ConnectMcpServerOauthClientCredentialsMutation } from "../mutations/connect_mcp_server_oauth_client_credentials.ts";
import { CompleteMcpServerOauthMutation } from "../mutations/complete_mcp_server_oauth.ts";
import { DeleteCompanyMutation } from "../mutations/delete_company.ts";
import { DeleteGithubInstallationMutation } from "../mutations/delete_github_installation.ts";
import { DeleteGithubRepositoryProvisioningMutation } from "../mutations/delete_github_repository_provisioning.ts";
import { DeletePlatformModelMutation } from "../mutations/delete_platform_model.ts";
import { DeletePlatformModelProviderCredentialMutation } from "../mutations/delete_platform_model_provider_credential.ts";
import { DisconnectMcpServerOauthMutation } from "../mutations/disconnect_mcp_server_oauth.ts";
import { DeleteSecretMutation } from "../mutations/delete_secret.ts";
import { DeleteSecretGroupMutation } from "../mutations/delete_secret_group.ts";
import { DeleteMcpServerMutation } from "../mutations/delete_mcp_server.ts";
import { DeleteSkillGroupMutation } from "../mutations/delete_skill_group.ts";
import { DeleteSkillMutation } from "../mutations/delete_skill.ts";
import { EnsureCompanyOnboardingMutation } from "../mutations/ensure_company_onboarding.ts";
import { GrantPlatformAdminMutation } from "../mutations/grant_platform_admin.ts";
import { ImportGithubSkillsMutation } from "../mutations/import_github_skills.ts";
import { ImportPlatformModelMutation } from "../mutations/import_platform_model.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "../mutations/refresh_github_installation_repositories.ts";
import { RefreshPlatformCodexRateLimitsMutation } from "../mutations/refresh_platform_codex_rate_limits.ts";
import { RefreshPlatformModelProviderCredentialModelsMutation } from "../mutations/refresh_platform_model_provider_credential_models.ts";
import { RefreshPlatformModelProviderCredentialTokenMutation } from "../mutations/refresh_platform_model_provider_credential_token.ts";
import { SetDefaultPlatformModelProviderCredentialModelMutation } from "../mutations/set_default_platform_model_provider_credential_model.ts";
import { SetPlatformModelRoutesMutation } from "../mutations/set_platform_model_routes.ts";
import { SkipCompanyOnboardingMutation } from "../mutations/skip_company_onboarding.ts";
import { StartMcpServerOauthMutation } from "../mutations/start_mcp_server_oauth.ts";
import { UpdateCompanyOnboardingMutation } from "../mutations/update_company_onboarding.ts";
import { UpdateCompanySettingsMutation } from "../mutations/update_company_settings.ts";
import { UpdatePlatformAdminCompanyEnhancedLoggingMutation } from "../mutations/update_platform_admin_company_enhanced_logging.ts";
import { UpdatePlatformModelMutation } from "../mutations/update_platform_model.ts";
import { UpdateSecretMutation } from "../mutations/update_secret.ts";
import { UpdateSecretGroupMutation } from "../mutations/update_secret_group.ts";
import { UpdateMcpServerMutation } from "../mutations/update_mcp_server.ts";
import { UpdateSkillFromRepositoryMutation } from "../mutations/update_skill_from_repository.ts";
import { UpdateSkillMutation } from "../mutations/update_skill.ts";
import { UpdateSkillGroupMutation } from "../mutations/update_skill_group.ts";
import { CodexRateLimitsQueryResolver } from "../resolvers/codex_rate_limits.ts";
import { CompanyManagedLlmBudgetQueryResolver } from "../resolvers/company_managed_llm_budget.ts";
import { FreeCompanyCreationEligibilityQueryResolver } from "../resolvers/free_company_creation_eligibility.ts";
import { CompanyOnboardingFieldResolver } from "../resolvers/company_onboarding.ts";
import { CompanySettingsQueryResolver } from "../resolvers/company_settings.ts";
import { GithubAppConfigQueryResolver } from "../resolvers/github_app_config.ts";
import { GithubDiscoveredSkillsQueryResolver } from "../resolvers/github_discovered_skills.ts";
import { GithubInstallationsQueryResolver } from "../resolvers/github_installations.ts";
import { GithubRepositoryProvisioningsQueryResolver } from "../resolvers/github_repository_provisionings.ts";
import { GithubRepositoriesQueryResolver } from "../resolvers/github_repositories.ts";
import { GithubSkillBranchesQueryResolver } from "../resolvers/github_skill_branches.ts";
import { HealthQueryResolver } from "../resolvers/health.ts";
import { LlmUsageAggregatesQueryResolver } from "../resolvers/llm_usage_aggregates.ts";
import { MeQueryResolver } from "../resolvers/me.ts";
import { McpServerAuthTypeQueryResolver } from "../resolvers/mcp_server_auth_type.ts";
import { PlatformAdminCompaniesQueryResolver } from "../resolvers/platform_admin_companies.ts";
import { PlatformCodexRateLimitsQueryResolver } from "../resolvers/platform_codex_rate_limits.ts";
import { PlatformModelRoutesQueryResolver } from "../resolvers/platform_model_routes.ts";
import { PlatformModelsQueryResolver } from "../resolvers/platform_models.ts";
import { PlatformModelProviderCredentialModelsQueryResolver } from "../resolvers/platform_model_provider_credential_models.ts";
import { PlatformModelProviderCredentialsQueryResolver } from "../resolvers/platform_model_provider_credentials.ts";
import { PlatformAdminUsersQueryResolver } from "../resolvers/platform_admin_users.ts";
import { SecretsQueryResolver } from "../resolvers/secrets.ts";
import { SecretGroupsQueryResolver } from "../resolvers/secret_groups.ts";
import { McpServersQueryResolver } from "../resolvers/mcp_servers.ts";
import { SkillGroupsQueryResolver } from "../resolvers/skill_groups.ts";
import { SkillQueryResolver } from "../resolvers/skill.ts";
import { SkillsQueryResolver } from "../resolvers/skills.ts";
import { McpAuthTypeDetectionService } from "../../services/mcp/auth_type_detection.ts";
import { McpOauthClientCredentialsConnectionService } from "../../services/mcp/oauth/client_credentials_connection.ts";
import { McpOauthDiscoveryService } from "../../services/mcp/oauth/discovery.ts";
import { McpOauthTokenService } from "../../services/mcp/oauth/token_service.ts";
import type { GraphqlResolverFragment, GraphqlRegistryInterface } from "./graphql_registry_interface.ts";

/**
 * Collects management-oriented GraphQL entry points such as company settings, GitHub integration,
 * shared secrets, and skill catalog administration.
 */
@injectable()
export class ManagementGraphqlRegistry implements GraphqlRegistryInterface {
  private readonly addGithubInstallationMutation: AddGithubInstallationMutation;
  private readonly addPlatformModelProviderCredentialMutation: AddPlatformModelProviderCredentialMutation;
  private readonly codexRateLimitsQueryResolver: CodexRateLimitsQueryResolver;
  private readonly companyManagedLlmBudgetQueryResolver: CompanyManagedLlmBudgetQueryResolver;
  private readonly companyOnboardingFieldResolver: CompanyOnboardingFieldResolver;
  private readonly companySettingsQueryResolver: CompanySettingsQueryResolver;
  private readonly connectMcpServerOauthClientCredentialsMutation: ConnectMcpServerOauthClientCredentialsMutation;
  private readonly createCompanyMutation: CreateCompanyMutation;
  private readonly createGithubInstallationUrlMutation: CreateGithubInstallationUrlMutation;
  private readonly createGithubRepositoryProvisioningMutation: CreateGithubRepositoryProvisioningMutation;
  private readonly createPlatformModelMutation: CreatePlatformModelMutation;
  private readonly createSecretMutation: CreateSecretMutation;
  private readonly createSecretGroupMutation: CreateSecretGroupMutation;
  private readonly createMcpServerMutation: CreateMcpServerMutation;
  private readonly completeMcpServerOauthMutation: CompleteMcpServerOauthMutation;
  private readonly createSkillMutation: CreateSkillMutation;
  private readonly createSkillGroupMutation: CreateSkillGroupMutation;
  private readonly deleteGithubInstallationMutation: DeleteGithubInstallationMutation;
  private readonly deleteGithubRepositoryProvisioningMutation: DeleteGithubRepositoryProvisioningMutation;
  private readonly deletePlatformModelMutation: DeletePlatformModelMutation;
  private readonly deletePlatformModelProviderCredentialMutation: DeletePlatformModelProviderCredentialMutation;
  private readonly disconnectMcpServerOauthMutation: DisconnectMcpServerOauthMutation;
  private readonly deleteSecretMutation: DeleteSecretMutation;
  private readonly deleteSecretGroupMutation: DeleteSecretGroupMutation;
  private readonly deleteMcpServerMutation: DeleteMcpServerMutation;
  private readonly deleteCompanyMutation: DeleteCompanyMutation;
  private readonly deleteSkillMutation: DeleteSkillMutation;
  private readonly deleteSkillGroupMutation: DeleteSkillGroupMutation;
  private readonly ensureCompanyOnboardingMutation: EnsureCompanyOnboardingMutation;
  private readonly githubAppConfigQueryResolver: GithubAppConfigQueryResolver;
  private readonly githubDiscoveredSkillsQueryResolver: GithubDiscoveredSkillsQueryResolver;
  private readonly githubInstallationsQueryResolver: GithubInstallationsQueryResolver;
  private readonly githubRepositoryProvisioningsQueryResolver: GithubRepositoryProvisioningsQueryResolver;
  private readonly githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver;
  private readonly githubSkillBranchesQueryResolver: GithubSkillBranchesQueryResolver;
  private readonly freeCompanyCreationEligibilityQueryResolver: FreeCompanyCreationEligibilityQueryResolver;
  private readonly grantPlatformAdminMutation: GrantPlatformAdminMutation;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly importGithubSkillsMutation: ImportGithubSkillsMutation;
  private readonly importPlatformModelMutation: ImportPlatformModelMutation;
  private readonly llmUsageAggregatesQueryResolver: LlmUsageAggregatesQueryResolver;
  private readonly mcpServerAuthTypeQueryResolver: McpServerAuthTypeQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation;
  private readonly refreshPlatformModelProviderCredentialModelsMutation: RefreshPlatformModelProviderCredentialModelsMutation;
  private readonly refreshPlatformModelProviderCredentialTokenMutation: RefreshPlatformModelProviderCredentialTokenMutation;
  private readonly platformAdminCompaniesQueryResolver: PlatformAdminCompaniesQueryResolver;
  private readonly platformCodexRateLimitsQueryResolver: PlatformCodexRateLimitsQueryResolver;
  private readonly platformModelRoutesQueryResolver: PlatformModelRoutesQueryResolver;
  private readonly platformModelsQueryResolver: PlatformModelsQueryResolver;
  private readonly platformModelProviderCredentialModelsQueryResolver: PlatformModelProviderCredentialModelsQueryResolver;
  private readonly platformModelProviderCredentialsQueryResolver: PlatformModelProviderCredentialsQueryResolver;
  private readonly platformAdminUsersQueryResolver: PlatformAdminUsersQueryResolver;
  private readonly refreshPlatformCodexRateLimitsMutation: RefreshPlatformCodexRateLimitsMutation;
  private readonly secretsQueryResolver: SecretsQueryResolver;
  private readonly secretGroupsQueryResolver: SecretGroupsQueryResolver;
  private readonly mcpServersQueryResolver: McpServersQueryResolver;
  private readonly startMcpServerOauthMutation: StartMcpServerOauthMutation;
  private readonly skipCompanyOnboardingMutation: SkipCompanyOnboardingMutation;
  private readonly skillGroupsQueryResolver: SkillGroupsQueryResolver;
  private readonly skillQueryResolver: SkillQueryResolver;
  private readonly skillsQueryResolver: SkillsQueryResolver;
  private readonly setDefaultPlatformModelProviderCredentialModelMutation: SetDefaultPlatformModelProviderCredentialModelMutation;
  private readonly setPlatformModelRoutesMutation: SetPlatformModelRoutesMutation;
  private readonly updateCompanySettingsMutation: UpdateCompanySettingsMutation;
  private readonly updateCompanyOnboardingMutation: UpdateCompanyOnboardingMutation;
  private readonly updatePlatformAdminCompanyEnhancedLoggingMutation: UpdatePlatformAdminCompanyEnhancedLoggingMutation;
  private readonly updatePlatformModelMutation: UpdatePlatformModelMutation;
  private readonly updateSecretMutation: UpdateSecretMutation;
  private readonly updateSecretGroupMutation: UpdateSecretGroupMutation;
  private readonly updateMcpServerMutation: UpdateMcpServerMutation;
  private readonly updateSkillFromRepositoryMutation: UpdateSkillFromRepositoryMutation;
  private readonly updateSkillMutation: UpdateSkillMutation;
  private readonly updateSkillGroupMutation: UpdateSkillGroupMutation;

  constructor(
    @inject(Config) config: Config,
    @inject(HealthQueryResolver) healthQueryResolver: HealthQueryResolver = new HealthQueryResolver(),
    @inject(MeQueryResolver) meQueryResolver: MeQueryResolver = new MeQueryResolver(),
    @inject(CompanySettingsQueryResolver)
    companySettingsQueryResolver: CompanySettingsQueryResolver = new CompanySettingsQueryResolver(),
    @inject(LlmUsageAggregatesQueryResolver)
    llmUsageAggregatesQueryResolver: LlmUsageAggregatesQueryResolver = new LlmUsageAggregatesQueryResolver(),
    @inject(GithubAppConfigQueryResolver)
    githubAppConfigQueryResolver: GithubAppConfigQueryResolver =
      new GithubAppConfigQueryResolver(new GithubClient(config)),
    @inject(GithubInstallationsQueryResolver)
    githubInstallationsQueryResolver: GithubInstallationsQueryResolver = new GithubInstallationsQueryResolver(),
    @inject(GithubRepositoriesQueryResolver)
    githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver = new GithubRepositoriesQueryResolver(),
    @inject(CreateGithubInstallationUrlMutation)
    createGithubInstallationUrlMutation: CreateGithubInstallationUrlMutation =
      new CreateGithubInstallationUrlMutation(
        new GithubClient({} as Config),
        new GithubInstallationStateService({} as Config),
        OrganizationSlugResolverFactory.create({} as Config),
      ),
    @inject(AddGithubInstallationMutation)
    addGithubInstallationMutation: AddGithubInstallationMutation =
      new AddGithubInstallationMutation(
        new GithubClient({} as Config),
        new GithubInstallationStateService({} as Config),
        {} as never,
      ),
    @inject(AddPlatformModelProviderCredentialMutation)
    addPlatformModelProviderCredentialMutation: AddPlatformModelProviderCredentialMutation =
      new AddPlatformModelProviderCredentialMutation(
        new PlatformModelProviderCredentialService(
          new ModelRegistry(),
          new ModelService(new ModelRegistry()),
        ),
      ),
    @inject(DeleteGithubInstallationMutation)
    deleteGithubInstallationMutation: DeleteGithubInstallationMutation = new DeleteGithubInstallationMutation(),
    @inject(RefreshGithubInstallationRepositoriesMutation)
    refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation =
      new RefreshGithubInstallationRepositoriesMutation(new GithubClient({} as Config)),
    @inject(CreateSecretMutation)
    createSecretMutation?: CreateSecretMutation,
    @inject(CreateSecretGroupMutation)
    createSecretGroupMutation?: CreateSecretGroupMutation,
    @inject(CreateMcpServerMutation)
    createMcpServerMutation?: CreateMcpServerMutation,
    @inject(ConnectMcpServerOauthClientCredentialsMutation)
    connectMcpServerOauthClientCredentialsMutation?: ConnectMcpServerOauthClientCredentialsMutation,
    @inject(StartMcpServerOauthMutation)
    startMcpServerOauthMutation?: StartMcpServerOauthMutation,
    @inject(CompleteMcpServerOauthMutation)
    completeMcpServerOauthMutation?: CompleteMcpServerOauthMutation,
    @inject(DeleteSecretMutation)
    deleteSecretMutation?: DeleteSecretMutation,
    @inject(DeleteSecretGroupMutation)
    deleteSecretGroupMutation?: DeleteSecretGroupMutation,
    @inject(DeleteMcpServerMutation)
    deleteMcpServerMutation?: DeleteMcpServerMutation,
    @inject(DisconnectMcpServerOauthMutation)
    disconnectMcpServerOauthMutation?: DisconnectMcpServerOauthMutation,
    @inject(UpdateSecretMutation)
    updateSecretMutation?: UpdateSecretMutation,
    @inject(UpdateSecretGroupMutation)
    updateSecretGroupMutation?: UpdateSecretGroupMutation,
    @inject(UpdateMcpServerMutation)
    updateMcpServerMutation?: UpdateMcpServerMutation,
    @inject(SecretsQueryResolver)
    secretsQueryResolver?: SecretsQueryResolver,
    @inject(SecretGroupsQueryResolver)
    secretGroupsQueryResolver?: SecretGroupsQueryResolver,
    @inject(McpServerAuthTypeQueryResolver)
    mcpServerAuthTypeQueryResolver?: McpServerAuthTypeQueryResolver,
    @inject(McpServersQueryResolver)
    mcpServersQueryResolver?: McpServersQueryResolver,
    @inject(UpdateCompanySettingsMutation)
    updateCompanySettingsMutation: UpdateCompanySettingsMutation = new UpdateCompanySettingsMutation(),
    @inject(CreateSkillMutation)
    createSkillMutation?: CreateSkillMutation,
    @inject(UpdateSkillMutation)
    updateSkillMutation?: UpdateSkillMutation,
    @inject(UpdateSkillFromRepositoryMutation)
    updateSkillFromRepositoryMutation?: UpdateSkillFromRepositoryMutation,
    @inject(SkillGroupsQueryResolver)
    skillGroupsQueryResolver?: SkillGroupsQueryResolver,
    @inject(SkillQueryResolver)
    skillQueryResolver?: SkillQueryResolver,
    @inject(SkillsQueryResolver)
    skillsQueryResolver?: SkillsQueryResolver,
    @inject(CreateSkillGroupMutation)
    createSkillGroupMutation?: CreateSkillGroupMutation,
    @inject(DeleteSkillMutation)
    deleteSkillMutation?: DeleteSkillMutation,
    @inject(DeleteSkillGroupMutation)
    deleteSkillGroupMutation?: DeleteSkillGroupMutation,
    @inject(GithubSkillBranchesQueryResolver)
    githubSkillBranchesQueryResolver?: GithubSkillBranchesQueryResolver,
    @inject(GithubDiscoveredSkillsQueryResolver)
    githubDiscoveredSkillsQueryResolver?: GithubDiscoveredSkillsQueryResolver,
    @inject(ImportGithubSkillsMutation)
    importGithubSkillsMutation?: ImportGithubSkillsMutation,
    @inject(UpdateSkillGroupMutation)
    updateSkillGroupMutation?: UpdateSkillGroupMutation,
    @inject(GithubRepositoryProvisioningsQueryResolver)
    githubRepositoryProvisioningsQueryResolver: GithubRepositoryProvisioningsQueryResolver =
      new GithubRepositoryProvisioningsQueryResolver(),
    @inject(CreateGithubRepositoryProvisioningMutation)
    createGithubRepositoryProvisioningMutation: CreateGithubRepositoryProvisioningMutation =
      new CreateGithubRepositoryProvisioningMutation(),
    @inject(DeleteGithubRepositoryProvisioningMutation)
    deleteGithubRepositoryProvisioningMutation: DeleteGithubRepositoryProvisioningMutation =
      new DeleteGithubRepositoryProvisioningMutation(),
    @inject(DeletePlatformModelMutation)
    deletePlatformModelMutation: DeletePlatformModelMutation = new DeletePlatformModelMutation(),
    @inject(DeletePlatformModelProviderCredentialMutation)
    deletePlatformModelProviderCredentialMutation: DeletePlatformModelProviderCredentialMutation =
      new DeletePlatformModelProviderCredentialMutation(),
    @inject(DeleteCompanyMutation)
    deleteCompanyMutation: DeleteCompanyMutation = new DeleteCompanyMutation(),
    @inject(CreateCompanyMutation)
    createCompanyMutation: CreateCompanyMutation = new CreateCompanyMutation({} as never),
    @inject(CompanyManagedLlmBudgetQueryResolver)
    companyManagedLlmBudgetQueryResolver: CompanyManagedLlmBudgetQueryResolver =
      new CompanyManagedLlmBudgetQueryResolver(),
    @inject(FreeCompanyCreationEligibilityQueryResolver)
    freeCompanyCreationEligibilityQueryResolver: FreeCompanyCreationEligibilityQueryResolver =
      new FreeCompanyCreationEligibilityQueryResolver({} as never),
    @inject(CodexRateLimitsQueryResolver)
    codexRateLimitsQueryResolver: CodexRateLimitsQueryResolver = new CodexRateLimitsQueryResolver(),
    @inject(CompanyOnboardingFieldResolver)
    companyOnboardingFieldResolver: CompanyOnboardingFieldResolver = new CompanyOnboardingFieldResolver(),
    @inject(EnsureCompanyOnboardingMutation)
    ensureCompanyOnboardingMutation: EnsureCompanyOnboardingMutation = new EnsureCompanyOnboardingMutation(),
    @inject(SkipCompanyOnboardingMutation)
    skipCompanyOnboardingMutation: SkipCompanyOnboardingMutation = new SkipCompanyOnboardingMutation(),
    @inject(PlatformAdminCompaniesQueryResolver)
    platformAdminCompaniesQueryResolver: PlatformAdminCompaniesQueryResolver =
      new PlatformAdminCompaniesQueryResolver(),
    @inject(PlatformCodexRateLimitsQueryResolver)
    platformCodexRateLimitsQueryResolver: PlatformCodexRateLimitsQueryResolver =
      new PlatformCodexRateLimitsQueryResolver(),
    @inject(PlatformAdminUsersQueryResolver)
    platformAdminUsersQueryResolver: PlatformAdminUsersQueryResolver = new PlatformAdminUsersQueryResolver(),
    @inject(PlatformModelsQueryResolver)
    platformModelsQueryResolver: PlatformModelsQueryResolver = new PlatformModelsQueryResolver(),
    @inject(CreatePlatformModelMutation)
    createPlatformModelMutation: CreatePlatformModelMutation = new CreatePlatformModelMutation(),
    @inject(ImportPlatformModelMutation)
    importPlatformModelMutation: ImportPlatformModelMutation = new ImportPlatformModelMutation(),
    @inject(UpdatePlatformModelMutation)
    updatePlatformModelMutation: UpdatePlatformModelMutation = new UpdatePlatformModelMutation(),
    @inject(PlatformModelRoutesQueryResolver)
    platformModelRoutesQueryResolver: PlatformModelRoutesQueryResolver = new PlatformModelRoutesQueryResolver(),
    @inject(PlatformModelProviderCredentialsQueryResolver)
    platformModelProviderCredentialsQueryResolver: PlatformModelProviderCredentialsQueryResolver =
      new PlatformModelProviderCredentialsQueryResolver(),
    @inject(PlatformModelProviderCredentialModelsQueryResolver)
    platformModelProviderCredentialModelsQueryResolver: PlatformModelProviderCredentialModelsQueryResolver =
      new PlatformModelProviderCredentialModelsQueryResolver(),
    @inject(RefreshPlatformModelProviderCredentialModelsMutation)
    refreshPlatformModelProviderCredentialModelsMutation: RefreshPlatformModelProviderCredentialModelsMutation =
      new RefreshPlatformModelProviderCredentialModelsMutation(
        new PlatformModelProviderCredentialService(
          new ModelRegistry(),
          new ModelService(new ModelRegistry()),
        ),
      ),
    @inject(RefreshPlatformModelProviderCredentialTokenMutation)
    refreshPlatformModelProviderCredentialTokenMutation: RefreshPlatformModelProviderCredentialTokenMutation =
      new RefreshPlatformModelProviderCredentialTokenMutation(),
    @inject(RefreshPlatformCodexRateLimitsMutation)
    refreshPlatformCodexRateLimitsMutation: RefreshPlatformCodexRateLimitsMutation =
      new RefreshPlatformCodexRateLimitsMutation(),
    @inject(SetDefaultPlatformModelProviderCredentialModelMutation)
    setDefaultPlatformModelProviderCredentialModelMutation: SetDefaultPlatformModelProviderCredentialModelMutation =
      new SetDefaultPlatformModelProviderCredentialModelMutation(),
    @inject(SetPlatformModelRoutesMutation)
    setPlatformModelRoutesMutation: SetPlatformModelRoutesMutation = new SetPlatformModelRoutesMutation(),
    @inject(GrantPlatformAdminMutation)
    grantPlatformAdminMutation: GrantPlatformAdminMutation = new GrantPlatformAdminMutation(),
    @inject(UpdateCompanyOnboardingMutation)
    updateCompanyOnboardingMutation: UpdateCompanyOnboardingMutation = new UpdateCompanyOnboardingMutation(),
    @inject(UpdatePlatformAdminCompanyEnhancedLoggingMutation)
    updatePlatformAdminCompanyEnhancedLoggingMutation: UpdatePlatformAdminCompanyEnhancedLoggingMutation =
      new UpdatePlatformAdminCompanyEnhancedLoggingMutation(),
  ) {
    const defaultSecretService = new SecretService(new SecretEncryptionService(config));
    const defaultSkillService = new SkillService();
    const defaultMcpService = new McpService();
    const defaultMcpOauthDiscoveryService = new McpOauthDiscoveryService();
    const defaultMcpAuthTypeDetectionService = new McpAuthTypeDetectionService(defaultMcpOauthDiscoveryService);
    const defaultMcpOauthTokenService = new McpOauthTokenService();
    const defaultMcpOauthClientCredentialsConnectionService = new McpOauthClientCredentialsConnectionService(
      defaultMcpAuthTypeDetectionService,
      defaultMcpOauthDiscoveryService,
      new SecretEncryptionService(config),
      defaultMcpOauthTokenService,
    );
    const defaultSkillGithubCatalog = new SkillGithubCatalog(new SkillGithubPublicClient(config), new GithubClient(config));

    this.addGithubInstallationMutation = addGithubInstallationMutation;
    this.addPlatformModelProviderCredentialMutation = addPlatformModelProviderCredentialMutation;
    this.codexRateLimitsQueryResolver = codexRateLimitsQueryResolver;
    this.companyManagedLlmBudgetQueryResolver = companyManagedLlmBudgetQueryResolver;
    this.companyOnboardingFieldResolver = companyOnboardingFieldResolver;
    this.companySettingsQueryResolver = companySettingsQueryResolver;
    this.connectMcpServerOauthClientCredentialsMutation = connectMcpServerOauthClientCredentialsMutation
      ?? new ConnectMcpServerOauthClientCredentialsMutation(
        defaultMcpService,
        defaultMcpOauthClientCredentialsConnectionService,
      );
    this.createCompanyMutation = createCompanyMutation;
    this.completeMcpServerOauthMutation = completeMcpServerOauthMutation
      ?? new CompleteMcpServerOauthMutation({} as never, {} as never, {} as never, defaultMcpService, {} as never);
    this.createGithubInstallationUrlMutation = createGithubInstallationUrlMutation;
    this.createGithubRepositoryProvisioningMutation = createGithubRepositoryProvisioningMutation;
    this.createSecretMutation = createSecretMutation ?? new CreateSecretMutation(defaultSecretService);
    this.createSecretGroupMutation = createSecretGroupMutation ?? new CreateSecretGroupMutation(defaultSecretService);
    this.createMcpServerMutation = createMcpServerMutation ?? new CreateMcpServerMutation(defaultMcpService);
    this.createSkillMutation = createSkillMutation ?? new CreateSkillMutation(defaultSkillService);
    this.createSkillGroupMutation = createSkillGroupMutation ?? new CreateSkillGroupMutation(defaultSkillService);
    this.deleteGithubInstallationMutation = deleteGithubInstallationMutation;
    this.deleteGithubRepositoryProvisioningMutation = deleteGithubRepositoryProvisioningMutation;
    this.deletePlatformModelMutation = deletePlatformModelMutation;
    this.deletePlatformModelProviderCredentialMutation = deletePlatformModelProviderCredentialMutation;
    this.disconnectMcpServerOauthMutation = disconnectMcpServerOauthMutation
      ?? new DisconnectMcpServerOauthMutation(defaultMcpService);
    this.deleteSecretMutation = deleteSecretMutation ?? new DeleteSecretMutation(defaultSecretService);
    this.deleteSecretGroupMutation = deleteSecretGroupMutation ?? new DeleteSecretGroupMutation(defaultSecretService);
    this.deleteMcpServerMutation = deleteMcpServerMutation ?? new DeleteMcpServerMutation(defaultMcpService);
    this.deleteCompanyMutation = deleteCompanyMutation;
    this.deleteSkillMutation = deleteSkillMutation ?? new DeleteSkillMutation(defaultSkillService);
    this.deleteSkillGroupMutation = deleteSkillGroupMutation ?? new DeleteSkillGroupMutation(defaultSkillService);
    this.ensureCompanyOnboardingMutation = ensureCompanyOnboardingMutation;
    this.githubAppConfigQueryResolver = githubAppConfigQueryResolver;
    this.githubDiscoveredSkillsQueryResolver = githubDiscoveredSkillsQueryResolver
      ?? new GithubDiscoveredSkillsQueryResolver(defaultSkillGithubCatalog);
    this.githubInstallationsQueryResolver = githubInstallationsQueryResolver;
    this.githubRepositoryProvisioningsQueryResolver = githubRepositoryProvisioningsQueryResolver;
    this.githubRepositoriesQueryResolver = githubRepositoriesQueryResolver;
    this.githubSkillBranchesQueryResolver = githubSkillBranchesQueryResolver
      ?? new GithubSkillBranchesQueryResolver(defaultSkillGithubCatalog);
    this.freeCompanyCreationEligibilityQueryResolver = freeCompanyCreationEligibilityQueryResolver;
    this.grantPlatformAdminMutation = grantPlatformAdminMutation;
    this.healthQueryResolver = healthQueryResolver;
    this.createPlatformModelMutation = createPlatformModelMutation;
    this.importGithubSkillsMutation = importGithubSkillsMutation
      ?? new ImportGithubSkillsMutation(defaultSkillGithubCatalog);
    this.importPlatformModelMutation = importPlatformModelMutation;
    this.llmUsageAggregatesQueryResolver = llmUsageAggregatesQueryResolver;
    this.mcpServerAuthTypeQueryResolver = mcpServerAuthTypeQueryResolver
      ?? new McpServerAuthTypeQueryResolver(defaultMcpAuthTypeDetectionService);
    this.meQueryResolver = meQueryResolver;
    this.platformAdminCompaniesQueryResolver = platformAdminCompaniesQueryResolver;
    this.platformCodexRateLimitsQueryResolver = platformCodexRateLimitsQueryResolver;
    this.platformModelRoutesQueryResolver = platformModelRoutesQueryResolver;
    this.platformModelsQueryResolver = platformModelsQueryResolver;
    this.platformModelProviderCredentialModelsQueryResolver = platformModelProviderCredentialModelsQueryResolver;
    this.platformModelProviderCredentialsQueryResolver = platformModelProviderCredentialsQueryResolver;
    this.platformAdminUsersQueryResolver = platformAdminUsersQueryResolver;
    this.refreshGithubInstallationRepositoriesMutation = refreshGithubInstallationRepositoriesMutation;
    this.refreshPlatformCodexRateLimitsMutation = refreshPlatformCodexRateLimitsMutation;
    this.refreshPlatformModelProviderCredentialModelsMutation = refreshPlatformModelProviderCredentialModelsMutation;
    this.refreshPlatformModelProviderCredentialTokenMutation = refreshPlatformModelProviderCredentialTokenMutation;
    this.secretsQueryResolver = secretsQueryResolver ?? new SecretsQueryResolver(defaultSecretService);
    this.secretGroupsQueryResolver = secretGroupsQueryResolver ?? new SecretGroupsQueryResolver(defaultSecretService);
    this.mcpServersQueryResolver = mcpServersQueryResolver ?? new McpServersQueryResolver(defaultMcpService);
    this.skipCompanyOnboardingMutation = skipCompanyOnboardingMutation;
    this.startMcpServerOauthMutation = startMcpServerOauthMutation
      ?? new StartMcpServerOauthMutation(
        config,
        defaultMcpService,
        {} as never,
        {} as never,
        {} as never,
        new SecretEncryptionService(config),
        {} as never,
        OrganizationSlugResolverFactory.create(config),
      );
    this.skillGroupsQueryResolver = skillGroupsQueryResolver ?? new SkillGroupsQueryResolver(defaultSkillService);
    this.skillQueryResolver = skillQueryResolver ?? new SkillQueryResolver(defaultSkillService);
    this.skillsQueryResolver = skillsQueryResolver ?? new SkillsQueryResolver(defaultSkillService);
    this.setDefaultPlatformModelProviderCredentialModelMutation = setDefaultPlatformModelProviderCredentialModelMutation;
    this.setPlatformModelRoutesMutation = setPlatformModelRoutesMutation;
    this.updateCompanyOnboardingMutation = updateCompanyOnboardingMutation;
    this.updatePlatformAdminCompanyEnhancedLoggingMutation = updatePlatformAdminCompanyEnhancedLoggingMutation;
    this.updatePlatformModelMutation = updatePlatformModelMutation;
    this.updateCompanySettingsMutation = updateCompanySettingsMutation;
    this.updateSecretMutation = updateSecretMutation ?? new UpdateSecretMutation(defaultSecretService);
    this.updateSecretGroupMutation = updateSecretGroupMutation ?? new UpdateSecretGroupMutation(defaultSecretService);
    this.updateMcpServerMutation = updateMcpServerMutation ?? new UpdateMcpServerMutation(defaultMcpService);
    this.updateSkillFromRepositoryMutation = updateSkillFromRepositoryMutation
      ?? new UpdateSkillFromRepositoryMutation({} as never);
    this.updateSkillMutation = updateSkillMutation ?? new UpdateSkillMutation(defaultSkillService);
    this.updateSkillGroupMutation = updateSkillGroupMutation ?? new UpdateSkillGroupMutation(defaultSkillService);
  }

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        AddGithubInstallation: this.addGithubInstallationMutation.execute,
        AddPlatformModelProviderCredential: this.addPlatformModelProviderCredentialMutation.execute,
        ConnectMcpServerOAuthClientCredentials: this.connectMcpServerOauthClientCredentialsMutation.execute,
        CreateGithubInstallationUrl: this.createGithubInstallationUrlMutation.execute,
        CreateSecret: this.createSecretMutation.execute,
        CreateSecretGroup: this.createSecretGroupMutation.execute,
        CreateMcpServer: this.createMcpServerMutation.execute,
        StartMcpServerOAuth: this.startMcpServerOauthMutation.execute,
        CompleteMcpServerOAuth: this.completeMcpServerOauthMutation.execute,
        CreateGithubRepositoryProvisioning: this.createGithubRepositoryProvisioningMutation.execute,
        CreateCompany: this.createCompanyMutation.execute,
        CreatePlatformModel: this.createPlatformModelMutation.execute,
        CreateSkill: this.createSkillMutation.execute,
        CreateSkillGroup: this.createSkillGroupMutation.execute,
        DeleteGithubInstallation: this.deleteGithubInstallationMutation.execute,
        DeleteGithubRepositoryProvisioning: this.deleteGithubRepositoryProvisioningMutation.execute,
        DeletePlatformModel: this.deletePlatformModelMutation.execute,
        DeletePlatformModelProviderCredential: this.deletePlatformModelProviderCredentialMutation.execute,
        DisconnectMcpServerOAuth: this.disconnectMcpServerOauthMutation.execute,
        DeleteCompany: this.deleteCompanyMutation.execute,
        DeleteSecret: this.deleteSecretMutation.execute,
        DeleteSecretGroup: this.deleteSecretGroupMutation.execute,
        DeleteMcpServer: this.deleteMcpServerMutation.execute,
        DeleteSkill: this.deleteSkillMutation.execute,
        DeleteSkillGroup: this.deleteSkillGroupMutation.execute,
        EnsureCompanyOnboarding: this.ensureCompanyOnboardingMutation.execute,
        GrantPlatformAdmin: this.grantPlatformAdminMutation.execute,
        ImportGithubSkills: this.importGithubSkillsMutation.execute,
        ImportPlatformModel: this.importPlatformModelMutation.execute,
        RefreshGithubInstallationRepositories: this.refreshGithubInstallationRepositoriesMutation.execute,
        RefreshPlatformCodexRateLimits: this.refreshPlatformCodexRateLimitsMutation.execute,
        RefreshPlatformModelProviderCredentialModels: this.refreshPlatformModelProviderCredentialModelsMutation.execute,
        RefreshPlatformModelProviderCredentialToken: this.refreshPlatformModelProviderCredentialTokenMutation.execute,
        SetDefaultPlatformModelProviderCredentialModel: this.setDefaultPlatformModelProviderCredentialModelMutation.execute,
        SetPlatformModelRoutes: this.setPlatformModelRoutesMutation.execute,
        SkipCompanyOnboarding: this.skipCompanyOnboardingMutation.execute,
        UpdateCompanyOnboarding: this.updateCompanyOnboardingMutation.execute,
        UpdatePlatformAdminCompanyEnhancedLogging: this.updatePlatformAdminCompanyEnhancedLoggingMutation.execute,
        UpdateCompanySettings: this.updateCompanySettingsMutation.execute,
        UpdatePlatformModel: this.updatePlatformModelMutation.execute,
        UpdateSecret: this.updateSecretMutation.execute,
        UpdateSecretGroup: this.updateSecretGroupMutation.execute,
        UpdateMcpServer: this.updateMcpServerMutation.execute,
        UpdateSkillFromRepository: this.updateSkillFromRepositoryMutation.execute,
        UpdateSkill: this.updateSkillMutation.execute,
        UpdateSkillGroup: this.updateSkillGroupMutation.execute,
      },
      Query: {
        CodexRateLimits: this.codexRateLimitsQueryResolver.execute,
        CompanyManagedLlmBudget: this.companyManagedLlmBudgetQueryResolver.execute,
        FreeCompanyCreationEligibility: this.freeCompanyCreationEligibilityQueryResolver.execute,
        CompanySettings: this.companySettingsQueryResolver.execute,
        GithubAppConfig: this.githubAppConfigQueryResolver.execute,
        GithubDiscoveredSkills: this.githubDiscoveredSkillsQueryResolver.execute,
        GithubInstallations: this.githubInstallationsQueryResolver.execute,
        GithubRepositoryProvisionings: this.githubRepositoryProvisioningsQueryResolver.execute,
        GithubRepositories: this.githubRepositoriesQueryResolver.execute,
        GithubSkillBranches: this.githubSkillBranchesQueryResolver.execute,
        health: this.healthQueryResolver.execute,
        LlmUsageAggregates: this.llmUsageAggregatesQueryResolver.execute,
        Me: this.meQueryResolver.execute,
        McpServerAuthType: this.mcpServerAuthTypeQueryResolver.execute,
        PlatformAdminCompanies: this.platformAdminCompaniesQueryResolver.execute,
        PlatformCodexRateLimits: this.platformCodexRateLimitsQueryResolver.execute,
        PlatformModels: this.platformModelsQueryResolver.execute,
        PlatformModelRoutes: this.platformModelRoutesQueryResolver.execute,
        PlatformModelProviderCredentials: this.platformModelProviderCredentialsQueryResolver.execute,
        PlatformModelProviderCredentialModels: this.platformModelProviderCredentialModelsQueryResolver.execute,
        PlatformAdminUsers: this.platformAdminUsersQueryResolver.execute,
        Secrets: this.secretsQueryResolver.execute,
        SecretGroups: this.secretGroupsQueryResolver.execute,
        McpServers: this.mcpServersQueryResolver.execute,
        Skill: this.skillQueryResolver.execute,
        SkillGroups: this.skillGroupsQueryResolver.execute,
        Skills: this.skillsQueryResolver.execute,
      },
      AuthenticatedCompany: {
        onboarding: this.companyOnboardingFieldResolver.execute,
      },
    };
  }
}
