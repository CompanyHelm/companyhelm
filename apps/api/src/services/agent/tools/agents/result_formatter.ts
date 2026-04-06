import type {
  AgentManagementToolAgent,
  AgentManagementToolComputeProviderDefinition,
  AgentManagementToolCredentialOption,
  AgentManagementToolSecret,
  AgentManagementToolSnapshot,
} from "./service.ts";

/**
 * Renders agent-management results into transcript-friendly text blocks. The formatter keeps the
 * full editable agent configuration visible, while still grouping option catalogs so follow-up
 * create or update tool calls can copy ids directly from the output.
 */
export class AgentManagementResultFormatter {
  static formatCreatedAgent(agent: AgentManagementToolAgent): string {
    return AgentManagementResultFormatter.formatAgent(agent);
  }

  static formatSnapshot(snapshot: AgentManagementToolSnapshot): string {
    return [
      `currentAgentId: ${snapshot.currentAgentId}`,
      `agentCount: ${snapshot.agents.length}`,
      "",
      "agents:",
      AgentManagementResultFormatter.formatAgentSection(snapshot.agents),
      "",
      "availableComputeProviderDefinitions:",
      AgentManagementResultFormatter.formatComputeProviderDefinitionSection(
        snapshot.availableComputeProviderDefinitions,
      ),
      "",
      "providerOptions:",
      AgentManagementResultFormatter.formatCredentialOptionSection(snapshot.providerOptions),
      "",
      "availableSecrets:",
      AgentManagementResultFormatter.formatSecretSection(snapshot.availableSecrets),
    ].join("\n");
  }

  static formatUpdatedAgent(agent: AgentManagementToolAgent): string {
    return AgentManagementResultFormatter.formatAgent(agent);
  }

  private static formatAgent(agent: AgentManagementToolAgent): string {
    return [
      `id: ${agent.id}`,
      `name: ${agent.name}`,
      `companyId: ${agent.companyId}`,
      `isCurrentAgent: ${agent.isCurrentAgent}`,
      `defaultComputeProvider: ${agent.defaultComputeProvider ?? "(none)"}`,
      `defaultComputeProviderDefinitionId: ${agent.defaultComputeProviderDefinitionId ?? "(none)"}`,
      `defaultComputeProviderDefinitionName: ${agent.defaultComputeProviderDefinitionName ?? "(none)"}`,
      `modelProvider: ${agent.modelProvider ?? "(none)"}`,
      `modelProviderCredentialId: ${agent.modelProviderCredentialId ?? "(none)"}`,
      `modelProviderCredentialLabel: ${agent.modelProviderCredentialLabel ?? "(none)"}`,
      `modelProviderCredentialModelId: ${agent.modelProviderCredentialModelId ?? "(none)"}`,
      `modelId: ${agent.modelId ?? "(none)"}`,
      `modelName: ${agent.modelName ?? "(none)"}`,
      `modelDescription: ${agent.modelDescription ?? "(none)"}`,
      `supportedReasoningLevels: ${AgentManagementResultFormatter.formatStringList(agent.supportedReasoningLevels)}`,
      `reasoningLevel: ${agent.reasoningLevel ?? "(none)"}`,
      `systemPrompt: ${agent.systemPrompt ?? "(none)"}`,
      `environmentRequirements.minCpuCount: ${agent.environmentRequirements.minCpuCount}`,
      `environmentRequirements.minMemoryGb: ${agent.environmentRequirements.minMemoryGb}`,
      `environmentRequirements.minDiskSpaceGb: ${agent.environmentRequirements.minDiskSpaceGb}`,
      `createdAt: ${agent.createdAt.toISOString()}`,
      `updatedAt: ${agent.updatedAt.toISOString()}`,
      "defaultSecrets:",
      AgentManagementResultFormatter.formatIndentedSecretSection(agent.secrets),
    ].join("\n");
  }

  private static formatAgentSection(agents: AgentManagementToolAgent[]): string {
    if (agents.length === 0) {
      return "  none";
    }

    return agents.map((agent) => {
      return AgentManagementResultFormatter.indentBlock(
        AgentManagementResultFormatter.formatAgent(agent),
      );
    }).join("\n\n");
  }

  private static formatComputeProviderDefinition(
    definition: AgentManagementToolComputeProviderDefinition,
  ): string {
    return [
      `id: ${definition.id}`,
      `name: ${definition.name}`,
      `companyId: ${definition.companyId}`,
      `isDefault: ${definition.isDefault}`,
      `provider: ${definition.provider}`,
      `description: ${definition.description ?? "(no description)"}`,
      `daytona.apiUrl: ${definition.daytona?.apiUrl ?? "(none)"}`,
      `e2b.hasApiKey: ${definition.e2b?.hasApiKey ?? false}`,
      `createdAt: ${definition.createdAt.toISOString()}`,
      `updatedAt: ${definition.updatedAt.toISOString()}`,
    ].join("\n");
  }

  private static formatComputeProviderDefinitionSection(
    definitions: AgentManagementToolComputeProviderDefinition[],
  ): string {
    if (definitions.length === 0) {
      return "  none";
    }

    return definitions.map((definition) => {
      return AgentManagementResultFormatter.indentBlock(
        AgentManagementResultFormatter.formatComputeProviderDefinition(definition),
      );
    }).join("\n\n");
  }

  private static formatCredentialOption(option: AgentManagementToolCredentialOption): string {
    return [
      `id: ${option.id}`,
      `label: ${option.label}`,
      `isDefault: ${option.isDefault}`,
      `modelProvider: ${option.modelProvider}`,
      `defaultModelId: ${option.defaultModelId ?? "(none)"}`,
      `defaultReasoningLevel: ${option.defaultReasoningLevel ?? "(none)"}`,
      "models:",
      AgentManagementResultFormatter.formatIndentedModelSection(option.models),
    ].join("\n");
  }

  private static formatCredentialOptionSection(options: AgentManagementToolCredentialOption[]): string {
    if (options.length === 0) {
      return "  none";
    }

    return options.map((option) => {
      return AgentManagementResultFormatter.indentBlock(
        AgentManagementResultFormatter.formatCredentialOption(option),
      );
    }).join("\n\n");
  }

  private static formatIndentedModelSection(
    models: AgentManagementToolCredentialOption["models"],
  ): string {
    if (models.length === 0) {
      return "  none";
    }

    return models.map((model) => {
      return AgentManagementResultFormatter.indentBlock([
        `id: ${model.id}`,
        `modelId: ${model.modelId}`,
        `name: ${model.name}`,
        `description: ${model.description}`,
        `reasoningLevels: ${AgentManagementResultFormatter.formatStringList(model.reasoningLevels)}`,
      ].join("\n"));
    }).join("\n\n");
  }

  private static formatIndentedSecretSection(secrets: AgentManagementToolSecret[]): string {
    const formattedSecrets = AgentManagementResultFormatter.formatSecretSection(secrets);
    if (formattedSecrets === "  none") {
      return formattedSecrets;
    }

    return AgentManagementResultFormatter.indentBlock(formattedSecrets.trimStart());
  }

  private static formatSecret(secret: AgentManagementToolSecret): string {
    return [
      `id: ${secret.id}`,
      `name: ${secret.name}`,
      `companyId: ${secret.companyId}`,
      `envVarName: ${secret.envVarName}`,
      `description: ${secret.description ?? "(no description)"}`,
      `createdAt: ${secret.createdAt.toISOString()}`,
      `updatedAt: ${secret.updatedAt.toISOString()}`,
    ].join("\n");
  }

  private static formatSecretSection(secrets: AgentManagementToolSecret[]): string {
    if (secrets.length === 0) {
      return "  none";
    }

    return secrets.map((secret) => {
      return AgentManagementResultFormatter.indentBlock(
        AgentManagementResultFormatter.formatSecret(secret),
      );
    }).join("\n\n");
  }

  private static formatStringList(values: string[]): string {
    if (values.length === 0) {
      return "(none)";
    }

    return values.join(", ");
  }

  private static indentBlock(block: string): string {
    return block
      .split("\n")
      .map((line) => `  ${line}`)
      .join("\n");
  }
}
