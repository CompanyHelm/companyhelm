import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentRecord,
} from "../compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "./catalog_service.ts";

/**
 * Owns on-demand environment provisioning. It delegates the provider-specific creation work to the
 * configured provider and persists the resulting environment row in the shared catalog.
 */
@injectable()
export class AgentEnvironmentProvisioningService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly provider: AgentComputeProviderInterface;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(AgentComputeProviderInterface) provider: AgentComputeProviderInterface,
  ) {
    this.catalogService = catalogService;
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
    try {
      return await this.catalogService.createEnvironment(transactionProvider, {
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
        status: provisionedEnvironment.status,
      });
    } catch (error) {
      await provisionedEnvironment.cleanup?.().catch(() => undefined);
      throw error;
    }
  }
}
