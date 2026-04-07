import { and, eq } from "drizzle-orm";
import { inject, injectable } from "inversify";
import { agents, computeProviderDefinitions } from "../../../db/schema.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentComputeProviderRegistry } from "../compute/provider_registry.ts";
import type { AgentEnvironmentTemplate, ComputeProvider } from "../compute/provider_interface.ts";

type AgentRecord = {
  defaultComputeProviderDefinitionId: string | null;
  defaultEnvironmentTemplateId: string;
  id: string;
};

type ComputeProviderDefinitionRecord = {
  id: string;
  provider: ComputeProvider;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Resolves the provider-backed environment templates available to an agent and validates that the
 * persisted selection still belongs to the selected compute provider definition.
 */
@injectable()
export class AgentEnvironmentTemplateService {
  private readonly providerRegistry: AgentComputeProviderRegistry;

  constructor(
    @inject(AgentComputeProviderRegistry) providerRegistry: AgentComputeProviderRegistry,
  ) {
    this.providerRegistry = providerRegistry;
  }

  async listTemplatesForProvider(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    providerDefinitionId: string,
  ): Promise<AgentEnvironmentTemplate[]> {
    const providerDefinition = await this.requireProviderDefinition(
      transactionProvider,
      companyId,
      providerDefinitionId,
    );
    const provider = this.providerRegistry.get(providerDefinition.provider);

    return provider.getTemplates(transactionProvider, {
      companyId,
      providerDefinitionId,
    });
  }

  async resolveTemplateForProvider(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      providerDefinitionId: string;
      templateId: string;
    },
  ): Promise<AgentEnvironmentTemplate> {
    const availableTemplates = await this.listTemplatesForProvider(
      transactionProvider,
      input.companyId,
      input.providerDefinitionId,
    );
    const selectedTemplate = availableTemplates.find((template) => template.templateId === input.templateId);
    if (!selectedTemplate) {
      throw new Error("Environment template not found for the selected compute provider.");
    }

    return selectedTemplate;
  }

  async getAgentTemplate(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<AgentEnvironmentTemplate> {
    const agent = await this.requireAgent(transactionProvider, companyId, agentId);
    if (!agent.defaultComputeProviderDefinitionId) {
      throw new Error("Agent environment provider is required.");
    }

    return this.resolveTemplateForProvider(transactionProvider, {
      companyId,
      providerDefinitionId: agent.defaultComputeProviderDefinitionId,
      templateId: agent.defaultEnvironmentTemplateId,
    });
  }

  private async requireAgent(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    agentId: string,
  ): Promise<AgentRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [agent] = await selectableDatabase
        .select({
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
          defaultEnvironmentTemplateId: agents.defaultEnvironmentTemplateId,
          id: agents.id,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, companyId),
          eq(agents.id, agentId),
        )) as AgentRecord[];

      if (!agent) {
        throw new Error("Agent not found.");
      }

      return agent;
    });
  }

  private async requireProviderDefinition(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    providerDefinitionId: string,
  ): Promise<ComputeProviderDefinitionRecord> {
    return transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const [providerDefinition] = await selectableDatabase
        .select({
          id: computeProviderDefinitions.id,
          provider: computeProviderDefinitions.provider,
        })
        .from(computeProviderDefinitions)
        .where(and(
          eq(computeProviderDefinitions.companyId, companyId),
          eq(computeProviderDefinitions.id, providerDefinitionId),
        )) as ComputeProviderDefinitionRecord[];

      if (!providerDefinition) {
        throw new Error("Compute provider definition not found.");
      }

      return providerDefinition;
    });
  }
}
