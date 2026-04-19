import type { Logger as PinoLogger } from "pino";
import { GithubClient } from "../../../../../github/client.ts";
import { Config } from "../../../../../config/schema.ts";
import { ArtifactService } from "../../../../artifact_service.ts";
import { ModelRegistry } from "../../../../ai_providers/model_registry.ts";
import { ModelProviderService } from "../../../../ai_providers/model_provider_service.ts";
import { ComputeProviderDefinitionService } from "../../../../compute_provider_definitions/service.ts";
import { SecretService } from "../../../../secrets/service.ts";
import { TaskService } from "../../../../task_service.ts";
import { ExaWebClient } from "../../../../web_search/exa_client.ts";
import { AgentConversationService } from "../../../../conversations/service.ts";
import { AgentEnvironmentTemplateService } from "../../../../environments/template_service.ts";
import { AgentInboxService } from "../../../../inbox/service.ts";
import { McpService } from "../../../../mcp/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import {
  AgentSessionModuleRegistry,
  type AgentSessionModuleRegistryResolution,
} from "./registry.ts";
import { AgentManagementSessionModule } from "./agent_management.ts";
import { ArtifactsSessionModule } from "./artifacts.ts";
import { CompanyDirectorySessionModule } from "./company_directory.ts";
import { ComputerUseSessionModule } from "./computer_use.ts";
import { ConversationSessionModule } from "./conversation.ts";
import { CorePromptSessionModule } from "./core_prompt.ts";
import { GithubSessionModule } from "./github.ts";
import { InboxSessionModule } from "./inbox.ts";
import { McpSessionModule } from "./mcp.ts";
import { RuntimeSessionModule } from "./runtime.ts";
import { SecretsSessionModule } from "./secrets.ts";
import { SkillsSessionModule } from "./skills.ts";
import { TasksSessionModule } from "./tasks.ts";
import { TerminalSessionModule } from "./terminal.ts";
import { WebSessionModule } from "./web.ts";
import { WorkflowsSessionModule } from "./workflows.ts";

type DefaultAgentSessionModuleRegistryInput = {
  agentConversationService: AgentConversationService;
  config: Config;
  computeProviderDefinitionService: ComputeProviderDefinitionService;
  exaWebClient: ExaWebClient;
  githubClient: GithubClient;
  inboxService: AgentInboxService;
  logger: PinoLogger;
  mcpService: McpService;
  modelProviderService: ModelProviderService;
  modelRegistry: ModelRegistry;
  secretService: SecretService;
  templateService: AgentEnvironmentTemplateService;
};

/**
 * Registers the concrete module set used by CompanyHelm PI Mono sessions. The registry owns module
 * ordering so tool order and append-system-prompt layering remain stable as session assembly moves
 * out of the session manager.
 */
export class DefaultAgentSessionModuleRegistry {
  private readonly registry: AgentSessionModuleRegistry;

  constructor(input: DefaultAgentSessionModuleRegistryInput) {
    this.registry = new AgentSessionModuleRegistry([
      new CorePromptSessionModule(),
      new RuntimeSessionModule(),
      new TerminalSessionModule(input.logger, input.config),
      new ComputerUseSessionModule(input.config, input.computeProviderDefinitionService),
      new SecretsSessionModule(input.secretService),
      new SkillsSessionModule(),
      new CompanyDirectorySessionModule(),
      new AgentManagementSessionModule({
        computeProviderDefinitionService: input.computeProviderDefinitionService,
        modelProviderService: input.modelProviderService,
        modelRegistry: input.modelRegistry,
        secretService: input.secretService,
        templateService: input.templateService,
      }),
      new GithubSessionModule(input.githubClient),
      new WebSessionModule(input.exaWebClient),
      new McpSessionModule(input.logger, input.mcpService),
      new InboxSessionModule(input.inboxService),
      new ConversationSessionModule(input.agentConversationService),
      new WorkflowsSessionModule(),
      new TasksSessionModule(new TaskService()),
      new ArtifactsSessionModule(new ArtifactService()),
    ]);
  }

  /**
   * Delegates to the shared module registry so callers only depend on the default CompanyHelm
   * module catalog rather than knowing how those modules are instantiated.
   */
  async resolve(
    context: AgentSessionBootstrapContext,
  ): Promise<AgentSessionModuleRegistryResolution> {
    return this.registry.resolve(context);
  }
}
