import { inject, injectable } from "inversify";
import { Config } from "../../config/schema.ts";
import { GithubClient } from "../../github/client.ts";
import { GithubInstallationStateService } from "../../github/installation_state_service.ts";
import { SecretEncryptionService } from "../../services/secrets/encryption.ts";
import { SecretService } from "../../services/secrets/service.ts";
import { SkillGithubCatalog } from "../../services/skills/github/catalog.ts";
import { SkillService } from "../../services/skills/service.ts";
import { McpService } from "../../services/mcp/service.ts";
import { AddGithubInstallationMutation } from "../mutations/add_github_installation.ts";
import { CreateGithubInstallationUrlMutation } from "../mutations/create_github_installation_url.ts";
import { CreateSecretMutation } from "../mutations/create_secret.ts";
import { CreateMcpServerMutation } from "../mutations/create_mcp_server.ts";
import { CreateSkillGroupMutation } from "../mutations/create_skill_group.ts";
import { CreateSkillMutation } from "../mutations/create_skill.ts";
import { ConnectMcpServerOauthClientCredentialsMutation } from "../mutations/connect_mcp_server_oauth_client_credentials.ts";
import { CompleteMcpServerOauthMutation } from "../mutations/complete_mcp_server_oauth.ts";
import { DeleteGithubInstallationMutation } from "../mutations/delete_github_installation.ts";
import { DisconnectMcpServerOauthMutation } from "../mutations/disconnect_mcp_server_oauth.ts";
import { DeleteSecretMutation } from "../mutations/delete_secret.ts";
import { DeleteMcpServerMutation } from "../mutations/delete_mcp_server.ts";
import { DeleteSkillGroupMutation } from "../mutations/delete_skill_group.ts";
import { DeleteSkillMutation } from "../mutations/delete_skill.ts";
import { ImportGithubSkillsMutation } from "../mutations/import_github_skills.ts";
import { RefreshGithubInstallationRepositoriesMutation } from "../mutations/refresh_github_installation_repositories.ts";
import { StartMcpServerOauthMutation } from "../mutations/start_mcp_server_oauth.ts";
import { UpdateCompanySettingsMutation } from "../mutations/update_company_settings.ts";
import { UpdateSecretMutation } from "../mutations/update_secret.ts";
import { UpdateMcpServerMutation } from "../mutations/update_mcp_server.ts";
import { UpdateSkillMutation } from "../mutations/update_skill.ts";
import { UpdateSkillGroupMutation } from "../mutations/update_skill_group.ts";
import { CompanySettingsQueryResolver } from "../resolvers/company_settings.ts";
import { GithubAppConfigQueryResolver } from "../resolvers/github_app_config.ts";
import { GithubDiscoveredSkillsQueryResolver } from "../resolvers/github_discovered_skills.ts";
import { GithubInstallationsQueryResolver } from "../resolvers/github_installations.ts";
import { GithubRepositoriesQueryResolver } from "../resolvers/github_repositories.ts";
import { GithubSkillBranchesQueryResolver } from "../resolvers/github_skill_branches.ts";
import { HealthQueryResolver } from "../resolvers/health.ts";
import { MeQueryResolver } from "../resolvers/me.ts";
import { McpServerAuthTypeQueryResolver } from "../resolvers/mcp_server_auth_type.ts";
import { SecretsQueryResolver } from "../resolvers/secrets.ts";
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
  private readonly companySettingsQueryResolver: CompanySettingsQueryResolver;
  private readonly connectMcpServerOauthClientCredentialsMutation: ConnectMcpServerOauthClientCredentialsMutation;
  private readonly createGithubInstallationUrlMutation: CreateGithubInstallationUrlMutation;
  private readonly createSecretMutation: CreateSecretMutation;
  private readonly createMcpServerMutation: CreateMcpServerMutation;
  private readonly completeMcpServerOauthMutation: CompleteMcpServerOauthMutation;
  private readonly createSkillMutation: CreateSkillMutation;
  private readonly createSkillGroupMutation: CreateSkillGroupMutation;
  private readonly deleteGithubInstallationMutation: DeleteGithubInstallationMutation;
  private readonly disconnectMcpServerOauthMutation: DisconnectMcpServerOauthMutation;
  private readonly deleteSecretMutation: DeleteSecretMutation;
  private readonly deleteMcpServerMutation: DeleteMcpServerMutation;
  private readonly deleteSkillMutation: DeleteSkillMutation;
  private readonly deleteSkillGroupMutation: DeleteSkillGroupMutation;
  private readonly githubAppConfigQueryResolver: GithubAppConfigQueryResolver;
  private readonly githubDiscoveredSkillsQueryResolver: GithubDiscoveredSkillsQueryResolver;
  private readonly githubInstallationsQueryResolver: GithubInstallationsQueryResolver;
  private readonly githubRepositoriesQueryResolver: GithubRepositoriesQueryResolver;
  private readonly githubSkillBranchesQueryResolver: GithubSkillBranchesQueryResolver;
  private readonly healthQueryResolver: HealthQueryResolver;
  private readonly importGithubSkillsMutation: ImportGithubSkillsMutation;
  private readonly mcpServerAuthTypeQueryResolver: McpServerAuthTypeQueryResolver;
  private readonly meQueryResolver: MeQueryResolver;
  private readonly refreshGithubInstallationRepositoriesMutation: RefreshGithubInstallationRepositoriesMutation;
  private readonly secretsQueryResolver: SecretsQueryResolver;
  private readonly mcpServersQueryResolver: McpServersQueryResolver;
  private readonly startMcpServerOauthMutation: StartMcpServerOauthMutation;
  private readonly skillGroupsQueryResolver: SkillGroupsQueryResolver;
  private readonly skillQueryResolver: SkillQueryResolver;
  private readonly skillsQueryResolver: SkillsQueryResolver;
  private readonly updateCompanySettingsMutation: UpdateCompanySettingsMutation;
  private readonly updateSecretMutation: UpdateSecretMutation;
  private readonly updateMcpServerMutation: UpdateMcpServerMutation;
  private readonly updateSkillMutation: UpdateSkillMutation;
  private readonly updateSkillGroupMutation: UpdateSkillGroupMutation;

  constructor(
    @inject(Config) config: Config,
    @inject(HealthQueryResolver) healthQueryResolver: HealthQueryResolver = new HealthQueryResolver(),
    @inject(MeQueryResolver) meQueryResolver: MeQueryResolver = new MeQueryResolver(),
    @inject(CompanySettingsQueryResolver)
    companySettingsQueryResolver: CompanySettingsQueryResolver = new CompanySettingsQueryResolver(),
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
    @inject(DeleteMcpServerMutation)
    deleteMcpServerMutation?: DeleteMcpServerMutation,
    @inject(DisconnectMcpServerOauthMutation)
    disconnectMcpServerOauthMutation?: DisconnectMcpServerOauthMutation,
    @inject(UpdateSecretMutation)
    updateSecretMutation?: UpdateSecretMutation,
    @inject(UpdateMcpServerMutation)
    updateMcpServerMutation?: UpdateMcpServerMutation,
    @inject(SecretsQueryResolver)
    secretsQueryResolver?: SecretsQueryResolver,
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
    const defaultSkillGithubCatalog = new SkillGithubCatalog();

    this.addGithubInstallationMutation = addGithubInstallationMutation;
    this.companySettingsQueryResolver = companySettingsQueryResolver;
    this.connectMcpServerOauthClientCredentialsMutation = connectMcpServerOauthClientCredentialsMutation
      ?? new ConnectMcpServerOauthClientCredentialsMutation(
        defaultMcpService,
        defaultMcpOauthClientCredentialsConnectionService,
      );
    this.completeMcpServerOauthMutation = completeMcpServerOauthMutation
      ?? new CompleteMcpServerOauthMutation({} as never, {} as never, {} as never, defaultMcpService, {} as never);
    this.createGithubInstallationUrlMutation = createGithubInstallationUrlMutation;
    this.createSecretMutation = createSecretMutation ?? new CreateSecretMutation(defaultSecretService);
    this.createMcpServerMutation = createMcpServerMutation ?? new CreateMcpServerMutation(defaultMcpService);
    this.createSkillMutation = createSkillMutation ?? new CreateSkillMutation(defaultSkillService);
    this.createSkillGroupMutation = createSkillGroupMutation ?? new CreateSkillGroupMutation(defaultSkillService);
    this.deleteGithubInstallationMutation = deleteGithubInstallationMutation;
    this.disconnectMcpServerOauthMutation = disconnectMcpServerOauthMutation
      ?? new DisconnectMcpServerOauthMutation(defaultMcpService);
    this.deleteSecretMutation = deleteSecretMutation ?? new DeleteSecretMutation(defaultSecretService);
    this.deleteMcpServerMutation = deleteMcpServerMutation ?? new DeleteMcpServerMutation(defaultMcpService);
    this.deleteSkillMutation = deleteSkillMutation ?? new DeleteSkillMutation(defaultSkillService);
    this.deleteSkillGroupMutation = deleteSkillGroupMutation ?? new DeleteSkillGroupMutation(defaultSkillService);
    this.githubAppConfigQueryResolver = githubAppConfigQueryResolver;
    this.githubDiscoveredSkillsQueryResolver = githubDiscoveredSkillsQueryResolver
      ?? new GithubDiscoveredSkillsQueryResolver(defaultSkillGithubCatalog);
    this.githubInstallationsQueryResolver = githubInstallationsQueryResolver;
    this.githubRepositoriesQueryResolver = githubRepositoriesQueryResolver;
    this.githubSkillBranchesQueryResolver = githubSkillBranchesQueryResolver
      ?? new GithubSkillBranchesQueryResolver(defaultSkillGithubCatalog);
    this.healthQueryResolver = healthQueryResolver;
    this.importGithubSkillsMutation = importGithubSkillsMutation
      ?? new ImportGithubSkillsMutation(defaultSkillGithubCatalog);
    this.mcpServerAuthTypeQueryResolver = mcpServerAuthTypeQueryResolver
      ?? new McpServerAuthTypeQueryResolver(defaultMcpAuthTypeDetectionService);
    this.meQueryResolver = meQueryResolver;
    this.refreshGithubInstallationRepositoriesMutation = refreshGithubInstallationRepositoriesMutation;
    this.secretsQueryResolver = secretsQueryResolver ?? new SecretsQueryResolver(defaultSecretService);
    this.mcpServersQueryResolver = mcpServersQueryResolver ?? new McpServersQueryResolver(defaultMcpService);
    this.startMcpServerOauthMutation = startMcpServerOauthMutation
      ?? new StartMcpServerOauthMutation(
        config,
        defaultMcpService,
        {} as never,
        {} as never,
        {} as never,
        new SecretEncryptionService(config),
        {} as never,
      );
    this.skillGroupsQueryResolver = skillGroupsQueryResolver ?? new SkillGroupsQueryResolver(defaultSkillService);
    this.skillQueryResolver = skillQueryResolver ?? new SkillQueryResolver(defaultSkillService);
    this.skillsQueryResolver = skillsQueryResolver ?? new SkillsQueryResolver(defaultSkillService);
    this.updateCompanySettingsMutation = updateCompanySettingsMutation;
    this.updateSecretMutation = updateSecretMutation ?? new UpdateSecretMutation(defaultSecretService);
    this.updateMcpServerMutation = updateMcpServerMutation ?? new UpdateMcpServerMutation(defaultMcpService);
    this.updateSkillMutation = updateSkillMutation ?? new UpdateSkillMutation(defaultSkillService);
    this.updateSkillGroupMutation = updateSkillGroupMutation ?? new UpdateSkillGroupMutation(defaultSkillService);
  }

  createResolvers(): GraphqlResolverFragment {
    return {
      Mutation: {
        AddGithubInstallation: this.addGithubInstallationMutation.execute,
        ConnectMcpServerOAuthClientCredentials: this.connectMcpServerOauthClientCredentialsMutation.execute,
        CreateGithubInstallationUrl: this.createGithubInstallationUrlMutation.execute,
        CreateSecret: this.createSecretMutation.execute,
        CreateMcpServer: this.createMcpServerMutation.execute,
        StartMcpServerOAuth: this.startMcpServerOauthMutation.execute,
        CompleteMcpServerOAuth: this.completeMcpServerOauthMutation.execute,
        CreateSkill: this.createSkillMutation.execute,
        CreateSkillGroup: this.createSkillGroupMutation.execute,
        DeleteGithubInstallation: this.deleteGithubInstallationMutation.execute,
        DisconnectMcpServerOAuth: this.disconnectMcpServerOauthMutation.execute,
        DeleteSecret: this.deleteSecretMutation.execute,
        DeleteMcpServer: this.deleteMcpServerMutation.execute,
        DeleteSkill: this.deleteSkillMutation.execute,
        DeleteSkillGroup: this.deleteSkillGroupMutation.execute,
        ImportGithubSkills: this.importGithubSkillsMutation.execute,
        RefreshGithubInstallationRepositories: this.refreshGithubInstallationRepositoriesMutation.execute,
        UpdateCompanySettings: this.updateCompanySettingsMutation.execute,
        UpdateSecret: this.updateSecretMutation.execute,
        UpdateMcpServer: this.updateMcpServerMutation.execute,
        UpdateSkill: this.updateSkillMutation.execute,
        UpdateSkillGroup: this.updateSkillGroupMutation.execute,
      },
      Query: {
        CompanySettings: this.companySettingsQueryResolver.execute,
        GithubAppConfig: this.githubAppConfigQueryResolver.execute,
        GithubDiscoveredSkills: this.githubDiscoveredSkillsQueryResolver.execute,
        GithubInstallations: this.githubInstallationsQueryResolver.execute,
        GithubRepositories: this.githubRepositoriesQueryResolver.execute,
        GithubSkillBranches: this.githubSkillBranchesQueryResolver.execute,
        health: this.healthQueryResolver.execute,
        Me: this.meQueryResolver.execute,
        McpServerAuthType: this.mcpServerAuthTypeQueryResolver.execute,
        Secrets: this.secretsQueryResolver.execute,
        McpServers: this.mcpServersQueryResolver.execute,
        Skill: this.skillQueryResolver.execute,
        SkillGroups: this.skillGroupsQueryResolver.execute,
        Skills: this.skillsQueryResolver.execute,
      },
    };
  }
}
