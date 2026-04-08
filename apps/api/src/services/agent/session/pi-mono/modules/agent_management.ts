import { ComputeProviderDefinitionService } from "../../../../compute_provider_definitions/service.ts";
import { ModelRegistry } from "../../../../ai_providers/model_registry.ts";
import { ModelProviderService } from "../../../../ai_providers/model_provider_service.ts";
import { SecretService } from "../../../../secrets/service.ts";
import { AgentEnvironmentTemplateService } from "../../../../environments/template_service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentManagementToolProvider } from "../tools/agents/provider.ts";
import { AgentManagementToolService } from "../tools/agents/service.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

/**
 * Owns the agent-management catalog so one module is responsible for the editable agent snapshot,
 * template options, provider options, and the create or update tools layered on top of that state.
 */
export class AgentManagementSessionModule extends AgentSessionModuleInterface {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly modelProviderService: ModelProviderService;
  private readonly modelRegistry: ModelRegistry;
  private readonly secretService: SecretService;
  private readonly templateService: AgentEnvironmentTemplateService;

  constructor(input: {
    computeProviderDefinitionService: ComputeProviderDefinitionService;
    modelProviderService: ModelProviderService;
    modelRegistry: ModelRegistry;
    secretService: SecretService;
    templateService: AgentEnvironmentTemplateService;
  }) {
    super();
    this.computeProviderDefinitionService = input.computeProviderDefinitionService;
    this.modelProviderService = input.modelProviderService;
    this.modelRegistry = input.modelRegistry;
    this.secretService = input.secretService;
    this.templateService = input.templateService;
  }

  getName(): string {
    return "agent_management";
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentManagementToolProvider(
        new AgentManagementToolService(
          context.transactionProvider,
          context.companyId,
          context.agentId,
          this.secretService,
          this.templateService,
          this.computeProviderDefinitionService,
          this.modelProviderService,
          this.modelRegistry,
        ),
      ),
    ];
  }
}
