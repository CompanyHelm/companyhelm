import { ModelRegistry } from "../ai_providers/model_registry.ts";
import { ModelProviderService } from "../ai_providers/model_provider_service.ts";
import { ComputeProviderDefinitionService } from "../compute_provider_definitions/service.ts";
import { AgentEnvironmentTemplateService } from "../environments/template_service.ts";
import { SecretService } from "../secrets/service.ts";
import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { AgentManagementToolService } from "../agent/session/pi-mono/tools/agents/service.ts";
import { SystemCommandInputReader } from "./input_reader.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

/**
 * Routes agent-management system commands through the existing company-scoped agent management
 * service. This keeps create and update behavior aligned with the native tool it replaces while
 * allowing the command catalog to stay hidden until the system skill is activated.
 */
export class AgentManagementSystemCommandService {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly inputReader = new SystemCommandInputReader();
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
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
    this.computeProviderDefinitionService = input.computeProviderDefinitionService;
    this.modelProviderService = input.modelProviderService;
    this.modelRegistry = input.modelRegistry;
    this.secretService = input.secretService;
    this.templateService = input.templateService;
  }

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const service = new AgentManagementToolService(
      context.transactionProvider,
      context.companyId,
      context.agentId,
      this.secretService,
      this.templateService,
      this.computeProviderDefinitionService,
      this.modelProviderService,
      this.modelRegistry,
    );

    switch (commandId) {
      case "agent.list":
        return this.jsonSerializer.serializeRecord({ snapshot: await service.listAgents() });
      case "agent.create":
        return this.jsonSerializer.serializeRecord({ agent: await service.createAgent(this.readCreateInput(input)) });
      case "agent.update":
        return this.jsonSerializer.serializeRecord({ agent: await service.updateAgent(this.readUpdateInput(input)) });
      default:
        throw new Error(`System command ${commandId} is not handled by agent management.`);
    }
  }

  private readCreateInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      defaultComputeProviderDefinitionId: this.inputReader.requireString(payload, "defaultComputeProviderDefinitionId"),
      defaultEnvironmentTemplateId: this.inputReader.requireString(payload, "defaultEnvironmentTemplateId"),
      modelProviderCredentialId: this.inputReader.optionalNullableString(payload, "modelProviderCredentialId"),
      modelProviderCredentialModelId: this.inputReader.requireString(payload, "modelProviderCredentialModelId"),
      name: this.inputReader.requireString(payload, "name"),
      reasoningLevel: this.inputReader.optionalNullableString(payload, "reasoningLevel"),
      secretIds: this.inputReader.optionalStringArray(payload, "secretIds"),
      systemPrompt: this.inputReader.optionalNullableString(payload, "systemPrompt"),
    };
  }

  private readUpdateInput(input: unknown) {
    const payload = this.inputReader.requireRecord(input);
    return {
      defaultComputeProviderDefinitionId: this.inputReader.optionalNullableString(
        payload,
        "defaultComputeProviderDefinitionId",
      ),
      defaultEnvironmentTemplateId: this.inputReader.optionalNullableString(payload, "defaultEnvironmentTemplateId"),
      id: this.inputReader.requireString(payload, "id"),
      modelProviderCredentialId: this.inputReader.optionalNullableString(payload, "modelProviderCredentialId"),
      modelProviderCredentialModelId: this.inputReader.optionalNullableString(payload, "modelProviderCredentialModelId"),
      name: this.inputReader.optionalNullableString(payload, "name"),
      reasoningLevel: this.inputReader.optionalNullableString(payload, "reasoningLevel"),
      secretIds: this.inputReader.optionalStringArray(payload, "secretIds"),
      systemPrompt: this.inputReader.optionalNullableString(payload, "systemPrompt"),
    };
  }
}
