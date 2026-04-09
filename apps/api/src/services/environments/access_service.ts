import { randomUUID } from "node:crypto";
import { inject, injectable } from "inversify";
import type { Logger as PinoLogger } from "pino";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { ApiLogger } from "../../log/api_logger.ts";
import { AgentEnvironmentInterface } from "./providers/environment_interface.ts";
import type {
  AgentComputeProviderInterface,
  AgentEnvironmentRecord,
} from "./providers/provider_interface.ts";
import { AgentComputeProviderRegistry } from "./providers/provider_registry.ts";
import { AgentEnvironmentTmuxPty } from "./providers/tmux_pty.ts";
import { AgentEnvironmentCatalogService } from "./catalog_service.ts";
import { AgentEnvironmentLeaseService } from "./lease_service.ts";
import { AgentEnvironmentProvisioningService } from "./provisioning_service.ts";
import { AgentSessionEnvironment } from "./session_environment.ts";
import { AgentEnvironmentSelectionService } from "./selection_service.ts";
import { SecretService } from "../secrets/service.ts";

/**
 * Resolves a leased environment for one agent session. It centralizes the reuse policy, on-demand
 * provisioning fallback, and provider shell creation so individual tools only need to ask for an
 * environment lease when they execute.
 */
@injectable()
export class AgentEnvironmentAccessService {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly leaseService: AgentEnvironmentLeaseService;
  private readonly logger: PinoLogger;
  private readonly providerRegistry: AgentComputeProviderRegistry;
  private readonly provisioningService: AgentEnvironmentProvisioningService;
  private readonly selectionService: AgentEnvironmentSelectionService;
  private readonly secretService: SecretService;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(AgentEnvironmentLeaseService) leaseService: AgentEnvironmentLeaseService,
    @inject(AgentComputeProviderRegistry)
    providerRegistryOrProvider: AgentComputeProviderRegistry | AgentComputeProviderInterface,
    @inject(AgentEnvironmentProvisioningService) provisioningService: AgentEnvironmentProvisioningService,
    @inject(AgentEnvironmentSelectionService) selectionService: AgentEnvironmentSelectionService,
    @inject(SecretService) secretService: SecretService = {
      async resolveSessionEnvironmentVariables() {
        return {};
      },
    } as never,
    @inject(ApiLogger) logger: ApiLogger = {
      child() {
        return {
          warn() {
            return undefined;
          },
        } as never;
      },
    } as never,
  ) {
    this.catalogService = catalogService;
    this.leaseService = leaseService;
    this.logger = logger.child({
      component: "agent_environment_access_service",
    });
    this.providerRegistry = AgentEnvironmentAccessService.isProvider(providerRegistryOrProvider)
      ? {
          get() {
            return providerRegistryOrProvider;
          },
        } as never
      : providerRegistryOrProvider;
    this.provisioningService = provisioningService;
    this.selectionService = selectionService;
    this.secretService = secretService;
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

      if (await this.canReuseEnvironment(transactionProvider, environment)) {
        const reactivatedLease = await this.leaseService.activateLease(transactionProvider, existingLease.id, ownerToken);
        const environmentShell = await this.createEnvironmentShell(
          transactionProvider,
          agentId,
          sessionId,
          environment,
          true,
        );
        const pty = new AgentEnvironmentTmuxPty(environmentShell);
        return new AgentSessionEnvironment(
          transactionProvider,
          session.companyId,
          sessionId,
          environment,
          this.leaseService,
          this.secretService,
          environmentShell,
          pty,
          reactivatedLease.id,
          ownerToken,
        );
      }

      await this.leaseService.releaseLease(transactionProvider, existingLease.id, "unhealthy");
    }

    const selectedEnvironment = await this.selectionService.findReusableEnvironmentForAgentSession(
      transactionProvider,
      agentId,
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
    const environmentShell = await this.createEnvironmentShell(
      transactionProvider,
      agentId,
      sessionId,
      selectedEnvironment,
      false,
    );
    const pty = new AgentEnvironmentTmuxPty(environmentShell);

    return new AgentSessionEnvironment(
      transactionProvider,
      session.companyId,
      sessionId,
      selectedEnvironment,
      this.leaseService,
      this.secretService,
      environmentShell,
      pty,
      lease.id,
      ownerToken,
    );
  }

  private async canReuseEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<boolean> {
    try {
      return await this.providerRegistry
        .get(environment.provider)
        .getEnvironmentStatus(transactionProvider, environment) !== "unhealthy";
    } catch {
      return false;
    }
  }

  private async createEnvironmentShell(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
    environment: AgentEnvironmentRecord,
    reusedLease: boolean,
  ) {
    try {
      return await this.providerRegistry
        .get(environment.provider)
        .createShell(transactionProvider, environment);
    } catch (error) {
      this.logger.warn({
        agentId,
        companyId: environment.companyId,
        environmentId: environment.id,
        err: error,
        provider: environment.provider,
        providerEnvironmentId: environment.providerEnvironmentId,
        reusedLease,
        sessionId,
      }, "failed to connect to provider environment shell");
      throw new Error(
        `Failed to connect to ${environment.provider} environment ${environment.providerEnvironmentId} for session ${sessionId}.`,
        {
          cause: error,
        },
      );
    }
  }

  private static isProvider(value: unknown): value is AgentComputeProviderInterface {
    return typeof value === "object"
      && value !== null
      && "getProvider" in value
      && typeof value.getProvider === "function";
  }
}
