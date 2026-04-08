import { inject, injectable } from "inversify";
import { and, eq } from "drizzle-orm";
import { agents } from "../../db/schema.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import {
  type AgentEnvironmentRecord,
} from "./providers/provider_interface.ts";
import { AgentComputeProviderRegistry } from "./providers/provider_registry.ts";
import { ComputeProviderDefinitionService } from "../compute_provider_definitions/service.ts";
import { AgentEnvironmentCatalogService } from "./catalog_service.ts";
import { AgentEnvironmentProvisioning } from "./provisioning.ts";
import { AgentEnvironmentTemplateService } from "./template_service.ts";

type AgentRecord = {
  defaultComputeProviderDefinitionId: string | null;
  defaultEnvironmentTemplateId: string;
};

type SelectableDatabase = {
  select(selection: Record<string, unknown>): {
    from(table: unknown): {
      where(condition: unknown): Promise<Array<Record<string, unknown>>>;
    };
  };
};

/**
 * Owns on-demand environment provisioning. It delegates the provider-specific creation work to the
 * configured provider and persists the resulting environment row in the shared catalog.
 */
@injectable()
export class AgentEnvironmentProvisioningService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly environmentProvisioning: AgentEnvironmentProvisioning;
  private readonly providerRegistry: AgentComputeProviderRegistry;
  private readonly templateService: AgentEnvironmentTemplateService;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(AgentComputeProviderRegistry) providerRegistry: AgentComputeProviderRegistry,
    @inject(AgentEnvironmentProvisioning) environmentProvisioning: AgentEnvironmentProvisioning,
    @inject(AgentEnvironmentTemplateService) templateService: AgentEnvironmentTemplateService,
  ) {
    this.catalogService = catalogService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.environmentProvisioning = environmentProvisioning;
    this.providerRegistry = providerRegistry;
    this.templateService = templateService;
  }

  async provisionEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      sessionId: string;
    },
  ): Promise<AgentEnvironmentRecord> {
    const agent = await transactionProvider.transaction(async (tx) => {
      const selectableDatabase = tx as SelectableDatabase;
      const agentRows = await selectableDatabase
        .select({
          defaultComputeProviderDefinitionId: agents.defaultComputeProviderDefinitionId,
          defaultEnvironmentTemplateId: agents.defaultEnvironmentTemplateId,
        })
        .from(agents)
        .where(and(
          eq(agents.companyId, input.companyId),
          eq(agents.id, input.agentId),
        )) as AgentRecord[];

      return agentRows[0] ?? null;
    });
    if (!agent) {
      throw new Error("Agent not found.");
    }
    if (!agent.defaultComputeProviderDefinitionId) {
      throw new Error("Agent does not have a default compute provider definition.");
    }

    const computeProviderDefinition = await this.computeProviderDefinitionService.loadDefinitionById(
      transactionProvider,
      input.companyId,
      agent.defaultComputeProviderDefinitionId,
    );
    if (!computeProviderDefinition) {
      throw new Error("Compute provider definition not found.");
    }

    const provider = this.providerRegistry.get(computeProviderDefinition.provider);
    if (!provider.supportsOnDemandProvisioning()) {
      throw new Error(`Provider ${provider.getProvider()} does not support on-demand environments.`);
    }

    const template = await this.templateService.resolveTemplateForProvider(transactionProvider, {
      companyId: input.companyId,
      providerDefinitionId: agent.defaultComputeProviderDefinitionId,
      templateId: agent.defaultEnvironmentTemplateId,
    });
    const provisionedEnvironment = await provider.provisionEnvironment(transactionProvider, {
      ...input,
      providerDefinitionId: agent.defaultComputeProviderDefinitionId,
      template,
    });
    let createdEnvironment: AgentEnvironmentRecord | null = null;
    try {
      createdEnvironment = await this.catalogService.createEnvironment(transactionProvider, {
        agentId: input.agentId,
        companyId: input.companyId,
        cpuCount: provisionedEnvironment.cpuCount,
        diskSpaceGb: provisionedEnvironment.diskSpaceGb,
        displayName: provisionedEnvironment.displayName ?? null,
        memoryGb: provisionedEnvironment.memoryGb,
        metadata: provisionedEnvironment.metadata,
        platform: provisionedEnvironment.platform,
        provider: provider.getProvider(),
        providerDefinitionId: agent.defaultComputeProviderDefinitionId,
        providerEnvironmentId: provisionedEnvironment.providerEnvironmentId,
        templateId: template.templateId,
      });

      await this.environmentProvisioning.provision(transactionProvider, createdEnvironment);
      return createdEnvironment;
    } catch (error) {
      if (createdEnvironment) {
        await this.catalogService.deleteEnvironment(
          transactionProvider,
          createdEnvironment.id,
          input.companyId,
        ).catch(() => undefined);
      }
      await provisionedEnvironment.cleanup?.().catch(() => undefined);
      throw error;
    }
  }
}
