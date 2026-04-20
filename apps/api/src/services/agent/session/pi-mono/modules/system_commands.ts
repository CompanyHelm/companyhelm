import { SystemCommandService } from "../../../../system_command_service.ts";
import { ArtifactService } from "../../../../artifact_service.ts";
import { ModelRegistry } from "../../../../ai_providers/model_registry.ts";
import { ModelProviderService } from "../../../../ai_providers/model_provider_service.ts";
import { ComputeProviderDefinitionService } from "../../../../compute_provider_definitions/service.ts";
import { AgentEnvironmentTemplateService } from "../../../../environments/template_service.ts";
import { SecretService } from "../../../../secrets/service.ts";
import { WorkflowService } from "../../../../workflows/service.ts";
import type { AgentToolProviderInterface } from "../tools/provider_interface.ts";
import { AgentSystemCommandToolProvider } from "../tools/system_commands/provider.ts";
import { AgentSessionBootstrapContext } from "../bootstrap_context.ts";
import { AgentSessionModuleInterface } from "./module_interface.ts";

type SystemCommandsSessionModuleInput = {
  artifactService: ArtifactService;
  computeProviderDefinitionService: ComputeProviderDefinitionService;
  modelProviderService: ModelProviderService;
  modelRegistry: ModelRegistry;
  secretService: SecretService;
  templateService: AgentEnvironmentTemplateService;
  workflowService: WorkflowService;
};

/**
 * Adds the compact system_command bridge used by activated system skills. The module does not
 * register individual command schemas, preserving progressive discovery for built-in capabilities.
 */
export class SystemCommandsSessionModule extends AgentSessionModuleInterface {
  private readonly artifactService: ArtifactService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly modelProviderService: ModelProviderService;
  private readonly modelRegistry: ModelRegistry;
  private readonly secretService: SecretService;
  private readonly templateService: AgentEnvironmentTemplateService;
  private readonly workflowService: WorkflowService;

  constructor(input: SystemCommandsSessionModuleInput) {
    super();
    this.artifactService = input.artifactService;
    this.computeProviderDefinitionService = input.computeProviderDefinitionService;
    this.modelProviderService = input.modelProviderService;
    this.modelRegistry = input.modelRegistry;
    this.secretService = input.secretService;
    this.templateService = input.templateService;
    this.workflowService = input.workflowService;
  }

  getName(): string {
    return "system_commands";
  }

  async createAppendSystemPrompts(): Promise<string[]> {
    return [];
  }

  async createToolProviders(context: AgentSessionBootstrapContext): Promise<AgentToolProviderInterface[]> {
    return [
      new AgentSystemCommandToolProvider(
        context,
        new SystemCommandService({
          artifactService: this.artifactService,
          computeProviderDefinitionService: this.computeProviderDefinitionService,
          modelProviderService: this.modelProviderService,
          modelRegistry: this.modelRegistry,
          secretService: this.secretService,
          templateService: this.templateService,
          workflowService: this.workflowService,
        }),
      ),
    ];
  }
}
