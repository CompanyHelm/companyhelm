import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentInterface } from "../compute/environment_interface.ts";
import { AgentComputeProviderInterface } from "../compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "./catalog_service.ts";
import { AgentEnvironmentLeaseService } from "./lease_service.ts";
import { AgentEnvironmentProvisioningService } from "./provisioning_service.ts";
import { AgentSessionEnvironment } from "./session_environment.ts";
import { AgentEnvironmentSelectionService } from "./selection_service.ts";

/**
 * Resolves a leased environment for one agent session. It centralizes the reuse policy, on-demand
 * provisioning fallback, and provider runtime creation so individual tools only need to ask for an
 * environment lease when they execute.
 */
@injectable()
export class AgentEnvironmentAccessService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly leaseService: AgentEnvironmentLeaseService;
  private readonly provider: AgentComputeProviderInterface;
  private readonly provisioningService: AgentEnvironmentProvisioningService;
  private readonly selectionService: AgentEnvironmentSelectionService;

  constructor(
    catalogService: AgentEnvironmentCatalogService,
    leaseService: AgentEnvironmentLeaseService,
    @inject(AgentComputeProviderInterface) provider: AgentComputeProviderInterface,
    provisioningService: AgentEnvironmentProvisioningService,
    selectionService: AgentEnvironmentSelectionService,
  ) {
    this.catalogService = catalogService;
    this.leaseService = leaseService;
    this.provider = provider;
    this.provisioningService = provisioningService;
    this.selectionService = selectionService;
  }

  async getEnvironmentForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ): Promise<AgentEnvironmentInterface> {
    const session = await this.catalogService.loadSession(transactionProvider, sessionId);
    if (session.agentId !== agentId) {
      throw new Error("Session does not belong to the agent.");
    }

    await this.leaseService.expireElapsedLeases(transactionProvider);

    const ownerToken = randomUUID();
    const existingLease = await this.leaseService.findOpenLeaseForSession(transactionProvider, agentId, sessionId);
    if (existingLease) {
      const environment = await this.catalogService.loadEnvironmentById(transactionProvider, existingLease.environmentId);
      if (!environment) {
        throw new Error("Leased environment not found.");
      }

      const reactivatedLease = await this.leaseService.activateLease(transactionProvider, existingLease.id, ownerToken);
      const runtime = await this.provider.createRuntime(transactionProvider, environment);
      return new AgentSessionEnvironment(
        transactionProvider,
        this.leaseService,
        runtime,
        reactivatedLease.id,
        ownerToken,
      );
    }

    const selectedEnvironment = await this.selectionService.findReusableEnvironmentForAgentSession(
      transactionProvider,
      agentId,
      this.provider.getProvider(),
      sessionId,
    ) ?? await this.provisioningService.provisionEnvironmentForSession(transactionProvider, {
      agentId,
      companyId: session.companyId,
      sessionId,
    });

    const lease = await this.leaseService.acquireLease(transactionProvider, {
      agentId,
      companyId: session.companyId,
      environmentId: selectedEnvironment.id,
      ownerToken,
      sessionId,
    });
    const runtime = await this.provider.createRuntime(transactionProvider, selectedEnvironment);

    return new AgentSessionEnvironment(
      transactionProvider,
      this.leaseService,
      runtime,
      lease.id,
      ownerToken,
    );
  }
}
