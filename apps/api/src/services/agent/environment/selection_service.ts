import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentRecord,
} from "../compute/provider_interface.ts";
import { AgentEnvironmentCatalogService } from "./catalog_service.ts";
import { AgentEnvironmentLeaseService } from "./lease_service.ts";

/**
 * Implements the environment reuse policy. It prefers the current session's most recent
 * environment history first, then falls back to the broader agent history, while never reusing an
 * environment that is still held by another open lease or already marked unhealthy by the
 * provider.
 */
@injectable()
export class AgentEnvironmentSelectionService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly leaseService: AgentEnvironmentLeaseService;
  private readonly providerService: AgentComputeProviderInterface;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(AgentEnvironmentLeaseService) leaseService: AgentEnvironmentLeaseService,
    @inject(AgentComputeProviderInterface) providerService: AgentComputeProviderInterface,
  ) {
    this.catalogService = catalogService;
    this.leaseService = leaseService;
    this.providerService = providerService;
  }

  async findReusableEnvironmentForAgentSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    provider: "daytona",
    sessionId: string,
  ): Promise<AgentEnvironmentRecord | null> {
    const sessionEnvironment = await this.findReusableEnvironmentFromLeaseHistory(
      transactionProvider,
      provider,
      await this.leaseService.listSessionLeaseHistory(transactionProvider, agentId, sessionId),
    );
    if (sessionEnvironment) {
      return sessionEnvironment;
    }

    return this.findReusableEnvironmentFromLeaseHistory(
      transactionProvider,
      provider,
      await this.leaseService.listAgentLeaseHistory(transactionProvider, agentId),
    );
  }

  private async findReusableEnvironmentFromLeaseHistory(
    transactionProvider: TransactionProviderInterface,
    provider: "daytona",
    leaseHistory: Array<{ environmentId: string }>,
  ): Promise<AgentEnvironmentRecord | null> {
    const candidateEnvironmentIds = [...new Set(leaseHistory.map((lease) => lease.environmentId))];
    if (candidateEnvironmentIds.length === 0) {
      return null;
    }

    const [environments, openLeases] = await Promise.all([
      this.catalogService.loadEnvironmentsByIds(transactionProvider, candidateEnvironmentIds),
      this.leaseService.listOpenLeasesForEnvironments(transactionProvider, candidateEnvironmentIds),
    ]);
    const environmentsById = new Map(environments.map((environment) => [environment.id, environment]));
    const openLeaseEnvironmentIds = new Set(openLeases.map((lease) => lease.environmentId));

    for (const environmentId of candidateEnvironmentIds) {
      const environment = environmentsById.get(environmentId);
      if (!environment) {
        continue;
      }
      if (environment.provider !== provider) {
        continue;
      }
      if (openLeaseEnvironmentIds.has(environment.id)) {
        continue;
      }
      if (!await this.isReusableEnvironment(transactionProvider, environment)) {
        continue;
      }

      return environment;
    }

    return null;
  }

  private async isReusableEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<boolean> {
    try {
      return await this.providerService.getEnvironmentStatus(transactionProvider, environment) !== "unhealthy";
    } catch {
      return false;
    }
  }
}
