import { ModelRegistry } from "../ai_providers/model_registry.ts";
import { ModelProviderService } from "../ai_providers/model_provider_service.ts";
import { ComputeProviderDefinitionService } from "../compute_provider_definitions/service.ts";
import { AgentEnvironmentTemplateService } from "../environments/template_service.ts";
import { McpService } from "../mcp/service.ts";
import { SecretService } from "../secrets/service.ts";
import { SkillService } from "../skills/service.ts";
import type { SystemCommandExecutionContext } from "../system_command_service.ts";
import { AgentManagementToolService } from "../agent/session/pi-mono/tools/agents/service.ts";
import { SystemCommandInputReader } from "./input_reader.ts";
import { SystemCommandJsonSerializer } from "./json_serializer.ts";

type AgentManagementToolServiceDependencies = {
  computeProviderDefinitionService: ComputeProviderDefinitionService;
  modelProviderService: ModelProviderService;
  modelRegistry: ModelRegistry;
  secretService: SecretService;
  templateService: AgentEnvironmentTemplateService;
};

/**
 * Routes agent-management system commands through the existing company-scoped agent management
 * service. This keeps create and update behavior aligned with the native tool it replaces while
 * allowing the command catalog to stay hidden until the system skill is activated.
 */
export class AgentManagementSystemCommandService {
  private readonly inputReader = new SystemCommandInputReader();
  private readonly jsonSerializer = new SystemCommandJsonSerializer();
  private readonly mcpService: McpService;
  private readonly skillService: SkillService;
  private readonly toolServiceDependencies: AgentManagementToolServiceDependencies | null;

  constructor(input: {
    computeProviderDefinitionService?: ComputeProviderDefinitionService;
    modelProviderService?: ModelProviderService;
    modelRegistry?: ModelRegistry;
    mcpService?: McpService;
    secretService?: SecretService;
    skillService?: SkillService;
    templateService?: AgentEnvironmentTemplateService;
  }) {
    this.mcpService = input.mcpService ?? new McpService();
    this.skillService = input.skillService ?? new SkillService();
    this.toolServiceDependencies = this.resolveToolServiceDependencies(input);
  }

  async execute(
    commandId: string,
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    switch (commandId) {
      case "agent.list":
        return this.jsonSerializer.serializeRecord({
          snapshot: await this.createToolService(context).listAgents(),
        });
      case "agent.create":
        return this.jsonSerializer.serializeRecord({
          agent: await this.createToolService(context).createAgent(this.readCreateInput(input)),
        });
      case "agent.update":
        return this.jsonSerializer.serializeRecord({
          agent: await this.createToolService(context).updateAgent(this.readUpdateInput(input)),
        });
      case "agent.skills.list":
        return this.listAgentSkills(input, context);
      case "agent.skill.attach":
        return this.attachSkillToAgent(input, context);
      case "agent.skill.detach":
        return this.detachSkillFromAgent(input, context);
      case "agent.skill_group.attach":
        return this.attachSkillGroupToAgent(input, context);
      case "agent.skill_group.detach":
        return this.detachSkillGroupFromAgent(input, context);
      case "agent.mcps.list":
        return this.listAgentMcps(input, context);
      default:
        throw new Error(`System command ${commandId} is not handled by agent management.`);
    }
  }

  private async listAgentSkills(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const agentId = this.readAgentId(input);
    const [skillGroups, skills] = await Promise.all([
      this.skillService.listAgentSkillGroups(context.transactionProvider, context.companyId, agentId),
      this.skillService.listAgentSkills(context.transactionProvider, context.companyId, agentId),
    ]);

    return this.jsonSerializer.serializeRecord({
      skillGroups,
      skills,
    });
  }

  private async attachSkillToAgent(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skill = await this.skillService.attachSkillToAgent(context.transactionProvider, {
      agentId: this.inputReader.requireString(payload, "agentId"),
      companyId: context.companyId,
      skillId: this.inputReader.requireString(payload, "skillId"),
      userId: null,
    });

    return this.jsonSerializer.serializeRecord({ skill });
  }

  private async detachSkillFromAgent(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skill = await this.skillService.detachSkillFromAgent(
      context.transactionProvider,
      context.companyId,
      this.inputReader.requireString(payload, "agentId"),
      this.inputReader.requireString(payload, "skillId"),
    );

    return this.jsonSerializer.serializeRecord({ skill });
  }

  private async attachSkillGroupToAgent(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skillGroup = await this.skillService.attachSkillGroupToAgent(context.transactionProvider, {
      agentId: this.inputReader.requireString(payload, "agentId"),
      companyId: context.companyId,
      skillGroupId: this.inputReader.requireString(payload, "skillGroupId"),
      userId: null,
    });

    return this.jsonSerializer.serializeRecord({ skillGroup });
  }

  private async listAgentMcps(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const mcpServers = await this.mcpService.listAgentMcpServers(
      context.transactionProvider,
      context.companyId,
      this.readAgentId(input),
    );

    return this.jsonSerializer.serializeRecord({ mcpServers });
  }

  private async detachSkillGroupFromAgent(
    input: unknown,
    context: SystemCommandExecutionContext,
  ): Promise<Record<string, unknown>> {
    const payload = this.inputReader.requireRecord(input);
    const skillGroup = await this.skillService.detachSkillGroupFromAgent(
      context.transactionProvider,
      context.companyId,
      this.inputReader.requireString(payload, "agentId"),
      this.inputReader.requireString(payload, "skillGroupId"),
    );

    return this.jsonSerializer.serializeRecord({ skillGroup });
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

  private createToolService(context: SystemCommandExecutionContext): AgentManagementToolService {
    if (!this.toolServiceDependencies) {
      throw new Error("Agent management system commands are not configured for this session.");
    }

    return new AgentManagementToolService(
      context.transactionProvider,
      context.companyId,
      context.agentId,
      this.toolServiceDependencies.secretService,
      this.toolServiceDependencies.templateService,
      this.toolServiceDependencies.computeProviderDefinitionService,
      this.toolServiceDependencies.modelProviderService,
      this.toolServiceDependencies.modelRegistry,
    );
  }

  private readAgentId(input: unknown): string {
    return this.inputReader.requireString(this.inputReader.requireRecord(input), "agentId");
  }

  private resolveToolServiceDependencies(input: {
    computeProviderDefinitionService?: ComputeProviderDefinitionService;
    modelProviderService?: ModelProviderService;
    modelRegistry?: ModelRegistry;
    secretService?: SecretService;
    templateService?: AgentEnvironmentTemplateService;
  }): AgentManagementToolServiceDependencies | null {
    if (
      !input.computeProviderDefinitionService
      || !input.modelProviderService
      || !input.modelRegistry
      || !input.secretService
      || !input.templateService
    ) {
      return null;
    }

    return {
      computeProviderDefinitionService: input.computeProviderDefinitionService,
      modelProviderService: input.modelProviderService,
      modelRegistry: input.modelRegistry,
      secretService: input.secretService,
      templateService: input.templateService,
    };
  }
}
