import type { TransactionProviderInterface } from "../db/transaction_provider_interface.ts";
import { OrganizationSlugResolver } from "../auth/organization_slug_resolver.ts";
import { OrganizationSlugResolverFactory } from "../auth/organization_slug_resolver_factory.ts";
import { Config } from "../config/schema.ts";
import { GithubClient } from "../github/client.ts";
import { GithubInstallationStateService } from "../github/installation_state_service.ts";
import { ArtifactService } from "./artifact_service.ts";
import { ModelRegistry } from "./ai_providers/model_registry.ts";
import { ModelProviderService } from "./ai_providers/model_provider_service.ts";
import { ComputeProviderDefinitionService } from "./compute_provider_definitions/service.ts";
import { AgentEnvironmentTemplateService } from "./environments/template_service.ts";
import { McpService } from "./mcp/service.ts";
import { SecretService } from "./secrets/service.ts";
import { WorkflowExecutionSystemCommandService } from "./workflows/execution_system_command_service.ts";
import { WorkflowService } from "./workflows/service.ts";
import { WorkflowSystemCommandService } from "./workflows/system_command_service.ts";
import { AgentManagementSystemCommandService } from "./system_commands/agent_management.ts";
import { ArtifactManagementSystemCommandService } from "./system_commands/artifact_management.ts";
import { CompanyDirectorySystemCommandService } from "./system_commands/company_directory.ts";
import { GithubInstallationSystemCommandService } from "./system_commands/github_installation.ts";
import { SkillManagementSystemCommandService } from "./system_commands/skill_management.ts";
import { SkillGithubCatalog } from "./skills/github/catalog.ts";
import { SessionSkillService } from "./skills/session_service.ts";
import { SkillService } from "./skills/service.ts";
import { SystemCommandCatalog } from "./skills/system_command_catalog.ts";

export type SystemCommandExecutionContext = {
  agentId: string;
  companyId: string;
  sessionId: string;
  transactionProvider: TransactionProviderInterface;
};

/**
 * Dispatches the single generic system_command tool into explicitly registered platform commands.
 * It enforces the active-system-skill boundary before invoking handlers, so command IDs alone never
 * grant access to product-owned mutation capabilities.
 */
export class SystemCommandService {
  private readonly agentManagementCommandService: AgentManagementSystemCommandService;
  private readonly artifactCommandService: ArtifactManagementSystemCommandService;
  private readonly commandCatalog: SystemCommandCatalog;
  private readonly companyDirectoryCommandService: CompanyDirectorySystemCommandService;
  private readonly githubInstallationCommandService: GithubInstallationSystemCommandService;
  private readonly sessionSkillService: SessionSkillService;
  private readonly skillManagementCommandService: SkillManagementSystemCommandService;
  private readonly workflowCommandService: WorkflowSystemCommandService;
  private readonly workflowExecutionCommandService: WorkflowExecutionSystemCommandService;

  constructor(input: {
    artifactService?: ArtifactService;
    commandCatalog?: SystemCommandCatalog;
    computeProviderDefinitionService?: ComputeProviderDefinitionService;
    githubClient?: GithubClient;
    githubInstallationStateService?: GithubInstallationStateService;
    organizationSlugResolver?: OrganizationSlugResolver;
    mcpService?: McpService;
    modelProviderService?: ModelProviderService;
    modelRegistry?: ModelRegistry;
    secretService?: SecretService;
    sessionSkillService?: SessionSkillService;
    skillGithubCatalog?: SkillGithubCatalog;
    skillService?: SkillService;
    templateService?: AgentEnvironmentTemplateService;
    workflowService: WorkflowService;
  }) {
    this.agentManagementCommandService = new AgentManagementSystemCommandService({
      computeProviderDefinitionService: input.computeProviderDefinitionService,
      mcpService: input.mcpService,
      modelProviderService: input.modelProviderService,
      modelRegistry: input.modelRegistry,
      secretService: input.secretService,
      skillService: input.skillService,
      templateService: input.templateService,
    });
    this.artifactCommandService = new ArtifactManagementSystemCommandService(input.artifactService ?? new ArtifactService());
    this.commandCatalog = input.commandCatalog ?? new SystemCommandCatalog();
    this.companyDirectoryCommandService = new CompanyDirectorySystemCommandService();
    this.githubInstallationCommandService = new GithubInstallationSystemCommandService(
      input.githubClient ?? new GithubClient({} as Config),
      input.githubInstallationStateService ?? new GithubInstallationStateService({} as Config),
      input.organizationSlugResolver ?? OrganizationSlugResolverFactory.create({} as Config),
    );
    this.sessionSkillService = input.sessionSkillService ?? new SessionSkillService();
    this.skillManagementCommandService = new SkillManagementSystemCommandService(
      input.skillService ?? new SkillService(),
      input.skillGithubCatalog ?? new SkillGithubCatalog(),
    );
    this.workflowCommandService = new WorkflowSystemCommandService(input.workflowService);
    this.workflowExecutionCommandService = new WorkflowExecutionSystemCommandService(input.workflowService);
  }

  async executeCommand(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const command = this.commandCatalog.requireCommandDefinition(commandId);
    const isActive = await this.sessionSkillService.isSystemSkillActive(context.transactionProvider, {
      companyId: context.companyId,
      sessionId: context.sessionId,
      systemSkillKey: command.systemSkillKey,
    });
    if (!isActive) {
      throw new Error(`Activate the ${command.systemSkillKey} system skill before running ${command.id}.`);
    }

    if (command.systemSkillKey === "manage_workflows") {
      return this.workflowCommandService.execute(command.id, input, {
        agentId: context.agentId,
        companyId: context.companyId,
        sessionId: context.sessionId,
        transactionProvider: context.transactionProvider,
      });
    }
    if (command.systemSkillKey === "execute_workflows") {
      return this.workflowExecutionCommandService.execute(command.id, input, {
        agentId: context.agentId,
        companyId: context.companyId,
        sessionId: context.sessionId,
        transactionProvider: context.transactionProvider,
      });
    }
    if (command.systemSkillKey === "manage_agents") {
      return this.agentManagementCommandService.execute(command.id, input, context);
    }
    if (command.systemSkillKey === "manage_artifacts") {
      return this.artifactCommandService.execute(command.id, input, context);
    }
    if (command.systemSkillKey === "company_directory") {
      return this.companyDirectoryCommandService.execute(command.id, context);
    }
    if (command.systemSkillKey === "manage_github_installations") {
      return this.githubInstallationCommandService.execute(command.id, input, context);
    }
    if (command.systemSkillKey === "manage_skills") {
      return this.skillManagementCommandService.execute(command.id, input, context);
    }

    throw new Error(`System command ${command.id} is not wired to a handler.`);
  }

}
