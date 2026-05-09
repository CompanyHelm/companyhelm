import { inject, injectable } from "inversify";
import { OrganizationSlugResolverFactory } from "../../auth/organization_slug_resolver_factory.ts";
import { Config } from "../../config/schema.ts";
import { GithubClient } from "../../github/client.ts";
import { GithubInstallationStateService } from "../../github/installation_state_service.ts";
import { CompanyMemberInvitationService } from "../../services/company_member_invitation_service.ts";
import { McpAuthTypeDetectionService } from "../../services/mcp/auth_type_detection.ts";
import { McpOauthClientCredentialsConnectionService } from "../../services/mcp/oauth/client_credentials_connection.ts";
import { McpOauthDiscoveryService } from "../../services/mcp/oauth/discovery.ts";
import { McpOauthTokenService } from "../../services/mcp/oauth/token_service.ts";
import { McpValidationService } from "../../services/mcp/validation_service.ts";
import { McpService } from "../../services/mcp/service.ts";
import { SecretEncryptionService } from "../../services/secrets/encryption.ts";
import { SecretService } from "../../services/secrets/service.ts";
import { SkillGithubCatalog } from "../../services/skills/github/catalog.ts";
import { SkillGithubPublicClient } from "../../services/skills/github/public_client.ts";
import { SkillService } from "../../services/skills/service.ts";
import { AddGithubInstallationMutation } from "../mutations/add_github_installation.ts";
import { CompleteMcpServerOauthMutation } from "../mutations/complete_mcp_server_oauth.ts";
import { ConnectMcpServerOauthClientCredentialsMutation } from "../mutations/connect_mcp_server_oauth_client_credentials.ts";
import { CreateCompanyMutation } from "../mutations/create_company.ts";
import { CreateGithubInstallationUrlMutation } from "../mutations/create_github_installation_url.ts";
import { CreateGithubRepositoryProvisioningMutation } from "../mutations/create_github_repository_provisioning.ts";
import { CreateMcpServerMutation } from "../mutations/create_mcp_server.ts";
import { ValidateMcpServerDraftMutation } from "../mutations/validate_mcp_server_draft.ts";
import { CreateSecretGroupMutation } from "../mutations/create_secret_group.ts";
import { CreateSecretMutation } from "../mutations/create_secret.ts";
import { CreateSkillGroupMutation } from "../mutations/create_skill_group.ts";
import { CreateSkillMutation } from "../mutations/create_skill.ts";
import { DeleteCompanyMutation } from "../mutations/delete_company.ts";
import { DeleteGithubInstallationMutation } from "../mutations/delete_github_installation.ts";
import { DeleteGithubRepositoryProvisioningMutation } from "../mutations/delete_github_repository_provisioning.ts";
import { DeleteMcpServerMutation } from "../mutations/delete_mcp_server.ts";
import { DeleteSecretGroupMutation } from "../mutations/delete_secret_group.ts";
import { DeleteSecretMutation } from "../mutations/delete_secret.ts";
import { DeleteSkillGroupMutation } from "../mutations/delete_skill_group.ts";
import { DeleteSkillMutation } from "../mutations/delete_skill.ts";
import { DisconnectMcpServerOauthMutation } from "../mutations/disconnect_mcp_server_oauth.ts";
import { EnsureCompanyOnboardingMutation } from "../mutations/ensure_company_onboarding.ts";
import { ImportGithubSkillsMutation } from "../mutations/import_github_skills.ts";
import { InviteCompanyMemberMutation } from "../mutations/invite_company_member.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "../mutations/refresh_github_installation_repositories.ts";
import { RemoveCompanyMemberMutation } from "../mutations/remove_company_member.ts";
import { RevokeCompanyMemberInvitationMutation } from "../mutations/revoke_company_member_invitation.ts";
import { SkipCompanyOnboardingMutation } from "../mutations/skip_company_onboarding.ts";
import { StartMcpServerOauthMutation } from "../mutations/start_mcp_server_oauth.ts";
import { UpdateCompanyMemberRoleMutation } from "../mutations/update_company_member_role.ts";
import { UpdateCompanyOnboardingMutation } from "../mutations/update_company_onboarding.ts";
import { UpdateCompanySettingsMutation } from "../mutations/update_company_settings.ts";
import { UpdateMcpServerMutation } from "../mutations/update_mcp_server.ts";
import { UpdateSecretGroupMutation } from "../mutations/update_secret_group.ts";
import { UpdateSecretMutation } from "../mutations/update_secret.ts";
import { UpdateSkillFromRepositoryMutation } from "../mutations/update_skill_from_repository.ts";
import { UpdateSkillGroupMutation } from "../mutations/update_skill_group.ts";
import { UpdateSkillMutation } from "../mutations/update_skill.ts";
import { CodexRateLimitsQueryResolver } from "../resolvers/codex_rate_limits.ts";
import { CompanyMembersQueryResolver } from "../resolvers/company_members.ts";
import { CompanyOnboardingFieldResolver } from "../resolvers/company_onboarding.ts";
import { CompanySettingsQueryResolver } from "../resolvers/company_settings.ts";
import { GithubAppConfigQueryResolver } from "../resolvers/github_app_config.ts";
import { GithubDiscoveredSkillsQueryResolver } from "../resolvers/github_discovered_skills.ts";
import { GithubInstallationsQueryResolver } from "../resolvers/github_installations.ts";
import { GithubRepositoriesQueryResolver } from "../resolvers/github_repositories.ts";
import { GithubRepositoryProvisioningsQueryResolver } from "../resolvers/github_repository_provisionings.ts";
import { GithubSkillBranchesQueryResolver } from "../resolvers/github_skill_branches.ts";
import { HealthQueryResolver } from "../resolvers/health.ts";
import { LlmUsageAggregatesQueryResolver } from "../resolvers/llm_usage_aggregates.ts";
import { LlmUsageProviderCredentialsQueryResolver } from "../resolvers/llm_usage_provider_credentials.ts";
import { McpServerAuthTypeQueryResolver } from "../resolvers/mcp_server_auth_type.ts";
import { McpServersQueryResolver } from "../resolvers/mcp_servers.ts";
import { MeQueryResolver } from "../resolvers/me.ts";
import { SecretGroupsQueryResolver } from "../resolvers/secret_groups.ts";
import { SecretsQueryResolver } from "../resolvers/secrets.ts";
import { SkillGroupsQueryResolver } from "../resolvers/skill_groups.ts";
import { SkillQueryResolver } from "../resolvers/skill.ts";
import { SkillsQueryResolver } from "../resolvers/skills.ts";
import type { GraphqlRegistryInterface, GraphqlResolverFragment } from "./graphql_registry_interface.ts";

/**
 * Collects OSS management GraphQL entry points for company settings, GitHub integration, shared
 * secrets, MCP servers, skills, and usage reporting. Cloud operator backoffice and monetization
 * surfaces intentionally live outside this registry.
 */
@injectable()
export class ManagementGraphqlRegistry implements GraphqlRegistryInterface {
  private readonly addGithubInstallationMutation: AddGithubInstallationMutation;
  private readonly codexRateLimitsQueryResolver: CodexRateLimitsQueryResolver;
  private readonly companyMembersQueryResolver: CompanyMembersQueryResolver;
  private readonly companyOnboardingFieldResolver: CompanyOnboardingFieldResolver;
  private readonly companySettingsQueryResolver: CompanySettingsQueryResolver;
  private readonly completeMcpServerOauthMutation: CompleteMcpServerOauthMutation;
  private readonly connectMcpServerOauthClientCredentialsMutation: ConnectMcpServerOauthClientCredentialsMutation;
  private readonly createCompanyMutation: CreateCompanyMutation;
  private readonly createGithubInstallationUrlMutation: CreateGithubInstallationUrlMutation;
  private readonly createGithubRepositoryProvisioningMutation: CreateGithubRepositoryProvisioningMutation;
  private readonly createMcpServerMutation: CreateMcpServerMutation;
  private readonly validateMcpServerDraftMutation: ValidateMcpServerDraftMutation;
  private readonly createSecretGroupMutation: CreateSecretGroupMutation;
  private readonly createSecretMutation: CreateSecretMutation;
  private readonly createSkillGroupMutation: CreateSkillGroupMutation;
  private readonly createSkillMutation: CreateSkillMutation;
  private readonly deleteCompanyMutation: DeleteCompanyMutation;
  private readonly deleteGithubInstallationMutation: DeleteGithubInstallationMutation;
  private readonly deleteGithubRepositoryProvisioningMutation: DeleteGithubRepositoryProvisioningMutation;
  private readonly deleteMcpServerMutation: DeleteMcpServerMutation;
  private readonly deleteSecretGroupMutation: DeleteSecretGroupMutation;
  private readonly deleteSecretMutation: DeleteSecretMutation;
  private readonly deleteSkillGroupMutation: DeleteSkillGroupMutation;
  private readonly deleteSkillMutation: DeleteSkillMutation;
  private readonly disconnectMcpServerOauthMutation: DisconnectMcpServerOauthMutation;
  private readonly ensureCompanyOnboardingMutation: EnsureCompanyOnboardingMutation;
  private readonly githubAppConfigQueryResolver: GithubAppConfigQueryResolver;
  private readonly githubDiscoveredSkillsQueryResolver: GithubDiscoveredSkillsQueryResolver;
  private readonly githubInstallationsQueryResolver: GithubInstallationsQueryResolver;
  private readonly githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver;
  private readonly githubRepositoryProvisioningsQueryResolver: GithubRepositoryProvisioningsQueryResolver;
  private readonly githubSkillBranchesQueryResolver: GithubSkillBranchesQueryResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly importGithubSkillsMutation: ImportGithubSkillsMutation;
  private readonly inviteCompanyMemberMutation: InviteCompanyMemberMutation;
  private readonly llmUsageAggregatesQueryResolver: LlmUsageAggregatesQueryResolver;
  private readonly llmUsageProviderCredentialsQueryResolver: LlmUsageProviderCredentialsQueryResolver;
  private readonly mcpServerAuthTypeQueryResolver: McpServerAuthTypeQueryResolver;
  private readonly mcpServersQueryResolver: McpServersQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation;
  private readonly removeCompanyMemberMutation: RemoveCompanyMemberMutation;
  private readonly revokeCompanyMemberInvitationMutation: RevokeCompanyMemberInvitationMutation;
  private readonly secretGroupsQueryResolver: SecretGroupsQueryResolver;
  private readonly secretsQueryResolver: SecretsQueryResolver;
  private readonly skillGroupsQueryResolver: SkillGroupsQueryResolver;
  private readonly skillQueryResolver: SkillQueryResolver;
  private readonly skillsQueryResolver: SkillsQueryResolver;
  private readonly skipCompanyOnboardingMutation: SkipCompanyOnboardingMutation;
  private readonly startMcpServerOauthMutation: StartMcpServerOauthMutation;
  private readonly updateCompanyMemberRoleMutation: UpdateCompanyMemberRoleMutation;
  private readonly updateCompanyOnboardingMutation: UpdateCompanyOnboardingMutation;
  private readonly updateCompanySettingsMutation: UpdateCompanySettingsMutation;
  private readonly updateMcpServerMutation: UpdateMcpServerMutation;
  private readonly updateSecretGroupMutation: UpdateSecretGroupMutation;
  private readonly updateSecretMutation: UpdateSecretMutation;
  private readonly updateSkillFromRepositoryMutation: UpdateSkillFromRepositoryMutation;
  private readonly updateSkillGroupMutation: UpdateSkillGroupMutation;
  private readonly updateSkillMutation: UpdateSkillMutation;

  constructor(
    @inject(Config) config: Config,
    @inject(HealthQueryResolver) healthQueryResolver: HealthQueryResolver = new HealthQueryResolver(),
    @inject(MeQueryResolver) meQueryResolver: MeQueryResolver = new MeQueryResolver(),
    @inject(CompanySettingsQueryResolver)
    companySettingsQueryResolver: CompanySettingsQueryResolver = new CompanySettingsQueryResolver(),
    @inject(LlmUsageAggregatesQueryResolver)
    llmUsageAggregatesQueryResolver: LlmUsageAggregatesQueryResolver = new LlmUsageAggregatesQueryResolver(),
    @inject(LlmUsageProviderCredentialsQueryResolver)
    llmUsageProviderCredentialsQueryResolver: LlmUsageProviderCredentialsQueryResolver =
      new LlmUsageProviderCredentialsQueryResolver(),
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
    @inject(ValidateMcpServerDraftMutation)
    validateMcpServerDraftMutation?: ValidateMcpServerDraftMutation,
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
    @inject(DeleteCompanyMutation)
    deleteCompanyMutation: DeleteCompanyMutation = new DeleteCompanyMutation(),
    @inject(CreateCompanyMutation)
    createCompanyMutation: CreateCompanyMutation = new CreateCompanyMutation({} as never),
    @inject(CodexRateLimitsQueryResolver)
    codexRateLimitsQueryResolver: CodexRateLimitsQueryResolver = new CodexRateLimitsQueryResolver(),
    @inject(CompanyOnboardingFieldResolver)
    companyOnboardingFieldResolver: CompanyOnboardingFieldResolver = new CompanyOnboardingFieldResolver(),
    @inject(EnsureCompanyOnboardingMutation)
    ensureCompanyOnboardingMutation: EnsureCompanyOnboardingMutation = new EnsureCompanyOnboardingMutation(),
    @inject(SkipCompanyOnboardingMutation)
    skipCompanyOnboardingMutation: SkipCompanyOnboardingMutation = new SkipCompanyOnboardingMutation(),
    @inject(UpdateCompanyOnboardingMutation)
    updateCompanyOnboardingMutation: UpdateCompanyOnboardingMutation = new UpdateCompanyOnboardingMutation(),
    @inject(InviteCompanyMemberMutation)
    inviteCompanyMemberMutation: InviteCompanyMemberMutation =
      new InviteCompanyMemberMutation(new CompanyMemberInvitationService()),
    @inject(CompanyMembersQueryResolver)
    companyMembersQueryResolver: CompanyMembersQueryResolver =
      new CompanyMembersQueryResolver(new CompanyMemberInvitationService()),
    @inject(RevokeCompanyMemberInvitationMutation)
    revokeCompanyMemberInvitationMutation: RevokeCompanyMemberInvitationMutation =
      new RevokeCompanyMemberInvitationMutation(new CompanyMemberInvitationService()),
    @inject(RemoveCompanyMemberMutation)
    removeCompanyMemberMutation: RemoveCompanyMemberMutation =
      new RemoveCompanyMemberMutation(new CompanyMemberInvitationService()),
    @inject(UpdateCompanyMemberRoleMutation)
    updateCompanyMemberRoleMutation: UpdateCompanyMemberRoleMutation =
      new UpdateCompanyMemberRoleMutation(new CompanyMemberInvitationService()),
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
    const defaultMcpValidationService = new McpValidationService(defaultMcpService);
    const defaultSkillGithubCatalog = new SkillGithubCatalog(
      new SkillGithubPublicClient(config),
      new GithubClient(config),
    );

    this.addGithubInstallationMutation = addGithubInstallationMutation;
    this.codexRateLimitsQueryResolver = codexRateLimitsQueryResolver;
    this.companyMembersQueryResolver = companyMembersQueryResolver;
    this.companyOnboardingFieldResolver = companyOnboardingFieldResolver;
    this.companySettingsQueryResolver = companySettingsQueryResolver;
    this.completeMcpServerOauthMutation = completeMcpServerOauthMutation
      ?? new CompleteMcpServerOauthMutation(
        {} as never,
        {} as never,
        {} as never,
        defaultMcpService,
        defaultMcpValidationService,
        {} as never,
      );
    this.connectMcpServerOauthClientCredentialsMutation = connectMcpServerOauthClientCredentialsMutation
      ?? new ConnectMcpServerOauthClientCredentialsMutation(
        defaultMcpService,
        defaultMcpOauthClientCredentialsConnectionService,
        defaultMcpValidationService,
      );
    this.createCompanyMutation = createCompanyMutation;
    this.createGithubInstallationUrlMutation = createGithubInstallationUrlMutation;
    this.createGithubRepositoryProvisioningMutation = createGithubRepositoryProvisioningMutation;
    this.createMcpServerMutation = createMcpServerMutation
      ?? new CreateMcpServerMutation(defaultMcpService, defaultMcpValidationService);
    this.validateMcpServerDraftMutation = validateMcpServerDraftMutation
      ?? new ValidateMcpServerDraftMutation(defaultMcpService, defaultMcpValidationService);
    this.createSecretGroupMutation = createSecretGroupMutation ?? new CreateSecretGroupMutation(defaultSecretService);
    this.createSecretMutation = createSecretMutation ?? new CreateSecretMutation(defaultSecretService);
    this.createSkillGroupMutation = createSkillGroupMutation ?? new CreateSkillGroupMutation(defaultSkillService);
    this.createSkillMutation = createSkillMutation ?? new CreateSkillMutation(defaultSkillService);
    this.deleteCompanyMutation = deleteCompanyMutation;
    this.deleteGithubInstallationMutation = deleteGithubInstallationMutation;
    this.deleteGithubRepositoryProvisioningMutation = deleteGithubRepositoryProvisioningMutation;
    this.deleteMcpServerMutation = deleteMcpServerMutation ?? new DeleteMcpServerMutation(defaultMcpService);
    this.deleteSecretGroupMutation = deleteSecretGroupMutation ?? new DeleteSecretGroupMutation(defaultSecretService);
    this.deleteSecretMutation = deleteSecretMutation ?? new DeleteSecretMutation(defaultSecretService);
    this.deleteSkillGroupMutation = deleteSkillGroupMutation ?? new DeleteSkillGroupMutation(defaultSkillService);
    this.deleteSkillMutation = deleteSkillMutation ?? new DeleteSkillMutation(defaultSkillService);
    this.disconnectMcpServerOauthMutation = disconnectMcpServerOauthMutation
      ?? new DisconnectMcpServerOauthMutation(defaultMcpService);
    this.ensureCompanyOnboardingMutation = ensureCompanyOnboardingMutation;
    this.githubAppConfigQueryResolver = githubAppConfigQueryResolver;
    this.githubDiscoveredSkillsQueryResolver = githubDiscoveredSkillsQueryResolver
      ?? new GithubDiscoveredSkillsQueryResolver(defaultSkillGithubCatalog);
    this.githubInstallationsQueryResolver = githubInstallationsQueryResolver;
    this.githubRepositoriesQueryResolver = githubRepositoriesQueryResolver;
    this.githubRepositoryProvisioningsQueryResolver = githubRepositoryProvisioningsQueryResolver;
    this.githubSkillBranchesQueryResolver = githubSkillBranchesQueryResolver
      ?? new GithubSkillBranchesQueryResolver(defaultSkillGithubCatalog);
    this.healthQueryResolver = healthQueryResolver;
    this.importGithubSkillsMutation = importGithubSkillsMutation
      ?? new ImportGithubSkillsMutation(defaultSkillGithubCatalog);
    this.inviteCompanyMemberMutation = inviteCompanyMemberMutation;
    this.llmUsageAggregatesQueryResolver = llmUsageAggregatesQueryResolver;
    this.llmUsageProviderCredentialsQueryResolver = llmUsageProviderCredentialsQueryResolver;
    this.mcpServerAuthTypeQueryResolver = mcpServerAuthTypeQueryResolver
      ?? new McpServerAuthTypeQueryResolver(defaultMcpAuthTypeDetectionService);
    this.mcpServersQueryResolver = mcpServersQueryResolver ?? new McpServersQueryResolver(defaultMcpService);
    this.meQueryResolver = meQueryResolver;
    this.refreshGithubInstallationRepositoriesMutation = refreshGithubInstallationRepositoriesMutation;
    this.removeCompanyMemberMutation = removeCompanyMemberMutation;
    this.revokeCompanyMemberInvitationMutation = revokeCompanyMemberInvitationMutation;
    this.secretGroupsQueryResolver = secretGroupsQueryResolver ?? new SecretGroupsQueryResolver(defaultSecretService);
    this.secretsQueryResolver = secretsQueryResolver ?? new SecretsQueryResolver(defaultSecretService);
    this.skillGroupsQueryResolver = skillGroupsQueryResolver ?? new SkillGroupsQueryResolver(defaultSkillService);
    this.skillQueryResolver = skillQueryResolver ?? new SkillQueryResolver(defaultSkillService);
    this.skillsQueryResolver = skillsQueryResolver ?? new SkillsQueryResolver(defaultSkillService);
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
    this.updateCompanyMemberRoleMutation = updateCompanyMemberRoleMutation;
    this.updateCompanyOnboardingMutation = updateCompanyOnboardingMutation;
    this.updateCompanySettingsMutation = updateCompanySettingsMutation;
    this.updateMcpServerMutation = updateMcpServerMutation
      ?? new UpdateMcpServerMutation(defaultMcpService, defaultMcpValidationService);
    this.updateSecretGroupMutation = updateSecretGroupMutation ?? new UpdateSecretGroupMutation(defaultSecretService);
    this.updateSecretMutation = updateSecretMutation ?? new UpdateSecretMutation(defaultSecretService);
    this.updateSkillFromRepositoryMutation = updateSkillFromRepositoryMutation
      ?? new UpdateSkillFromRepositoryMutation({} as never);
    this.updateSkillGroupMutation = updateSkillGroupMutation ?? new UpdateSkillGroupMutation(defaultSkillService);
    this.updateSkillMutation = updateSkillMutation ?? new UpdateSkillMutation(defaultSkillService);
  }

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        AddGithubInstallation: this.addGithubInstallationMutation.execute,
        CompleteMcpServerOAuth: this.completeMcpServerOauthMutation.execute,
        ConnectMcpServerOAuthClientCredentials: this.connectMcpServerOauthClientCredentialsMutation.execute,
        CreateCompany: this.createCompanyMutation.execute,
        CreateGithubInstallationUrl: this.createGithubInstallationUrlMutation.execute,
        CreateGithubRepositoryProvisioning: this.createGithubRepositoryProvisioningMutation.execute,
        CreateMcpServer: this.createMcpServerMutation.execute,
        ValidateMcpServerDraft: this.validateMcpServerDraftMutation.execute,
        CreateSecret: this.createSecretMutation.execute,
        CreateSecretGroup: this.createSecretGroupMutation.execute,
        CreateSkill: this.createSkillMutation.execute,
        CreateSkillGroup: this.createSkillGroupMutation.execute,
        DeleteCompany: this.deleteCompanyMutation.execute,
        DeleteGithubInstallation: this.deleteGithubInstallationMutation.execute,
        DeleteGithubRepositoryProvisioning: this.deleteGithubRepositoryProvisioningMutation.execute,
        DeleteMcpServer: this.deleteMcpServerMutation.execute,
        DeleteSecret: this.deleteSecretMutation.execute,
        DeleteSecretGroup: this.deleteSecretGroupMutation.execute,
        DeleteSkill: this.deleteSkillMutation.execute,
        DeleteSkillGroup: this.deleteSkillGroupMutation.execute,
        DisconnectMcpServerOAuth: this.disconnectMcpServerOauthMutation.execute,
        EnsureCompanyOnboarding: this.ensureCompanyOnboardingMutation.execute,
        ImportGithubSkills: this.importGithubSkillsMutation.execute,
        InviteCompanyMember: this.inviteCompanyMemberMutation.execute,
        RefreshGithubInstallationRepositories: this.refreshGithubInstallationRepositoriesMutation.execute,
        RemoveCompanyMember: this.removeCompanyMemberMutation.execute,
        RevokeCompanyMemberInvitation: this.revokeCompanyMemberInvitationMutation.execute,
        SkipCompanyOnboarding: this.skipCompanyOnboardingMutation.execute,
        StartMcpServerOAuth: this.startMcpServerOauthMutation.execute,
        UpdateCompanyMemberRole: this.updateCompanyMemberRoleMutation.execute,
        UpdateCompanyOnboarding: this.updateCompanyOnboardingMutation.execute,
        UpdateCompanySettings: this.updateCompanySettingsMutation.execute,
        UpdateMcpServer: this.updateMcpServerMutation.execute,
        UpdateSecret: this.updateSecretMutation.execute,
        UpdateSecretGroup: this.updateSecretGroupMutation.execute,
        UpdateSkill: this.updateSkillMutation.execute,
        UpdateSkillFromRepository: this.updateSkillFromRepositoryMutation.execute,
        UpdateSkillGroup: this.updateSkillGroupMutation.execute,
      },
      Query: {
        CodexRateLimits: this.codexRateLimitsQueryResolver.execute,
        CompanyMembers: this.companyMembersQueryResolver.execute,
        CompanySettings: this.companySettingsQueryResolver.execute,
        GithubAppConfig: this.githubAppConfigQueryResolver.execute,
        GithubDiscoveredSkills: this.githubDiscoveredSkillsQueryResolver.execute,
        GithubInstallations: this.githubInstallationsQueryResolver.execute,
        GithubRepositories: this.githubRepositoriesQueryResolver.execute,
        GithubRepositoryProvisionings: this.githubRepositoryProvisioningsQueryResolver.execute,
        GithubSkillBranches: this.githubSkillBranchesQueryResolver.execute,
        LlmUsageAggregates: this.llmUsageAggregatesQueryResolver.execute,
        LlmUsageProviderCredentials: this.llmUsageProviderCredentialsQueryResolver.execute,
        McpServerAuthType: this.mcpServerAuthTypeQueryResolver.execute,
        McpServers: this.mcpServersQueryResolver.execute,
        Me: this.meQueryResolver.execute,
        SecretGroups: this.secretGroupsQueryResolver.execute,
        Secrets: this.secretsQueryResolver.execute,
        Skill: this.skillQueryResolver.execute,
        SkillGroups: this.skillGroupsQueryResolver.execute,
        Skills: this.skillsQueryResolver.execute,
        health: this.healthQueryResolver.execute,
      },
      AuthenticatedCompany: {
        onboarding: this.companyOnboardingFieldResolver.execute,
      },
    };
  }
}
