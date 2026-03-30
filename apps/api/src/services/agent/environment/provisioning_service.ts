import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentRecord,
} from "../compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "./catalog_service.ts";
import { AgentEnvironmentProvisioning } from "./provisioning.ts";

/**
 * Owns on-demand environment provisioning. It delegates the provider-specific creation work to the
 * configured provider and persists the resulting environment row in the shared catalog.
 */
@injectable()
export class AgentEnvironmentProvisioningService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly environmentProvisioning: AgentEnvironmentProvisioning;
  private readonly provider: AgentComputeProviderInterface;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(AgentComputeProviderInterface) provider: AgentComputeProviderInterface,
    @inject(AgentEnvironmentProvisioning) environmentProvisioning: AgentEnvironmentProvisioning,
  ) {
    this.catalogService = catalogService;
    this.environmentProvisioning = environmentProvisioning;
    this.provider = provider;
  }

  async provisionEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    input: {
      agentId: string;
      companyId: string;
      sessionId: string;
    },
  ): Promise<AgentEnvironmentRecord> {
    if (!this.provider.supportsOnDemandProvisioning()) {
      throw new Error(`Provider ${this.provider.getProvider()} does not support on-demand environments.`);
    }

    const provisionedEnvironment = await this.provider.provisionEnvironment(transactionProvider, input);
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
        provider: this.provider.getProvider(),
        providerEnvironmentId: provisionedEnvironment.providerEnvironmentId,
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
