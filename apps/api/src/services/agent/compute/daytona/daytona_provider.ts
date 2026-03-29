import { Daytona } from "@daytonaio/sdk";
import { inject, injectable } from "inversify";
import { Config } from "../../../../config/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentCatalogService } from "../../environment/catalog_service.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentRecord,
  type AgentEnvironmentStatus,
} from "../provider_interface.ts";
import { AgentEnvironmentShellInterface } from "../shell_interface.ts";
import { AgentComputeDaytonaShell } from "./daytona_shell.ts";

/**
 * Bridges the generic provider contract onto Daytona. The environment orchestration layer decides
 * when to provision or reuse an environment; this provider only knows how to create Daytona
 * sandboxes and how to expose them through the generic shell adapter.
 */
@injectable()
export class AgentComputeDaytonaProvider extends AgentComputeProviderInterface {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly config: Config;
  private daytona?: Daytona;

  constructor(
    @inject(Config) config: Config,
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
  ) {
    super();
    this.catalogService = catalogService;
    this.config = config;
  }

  getProvider(): "daytona" {
    return "daytona";
  }

  supportsOnDemandProvisioning(): boolean {
    return true;
  }

  async provisionEnvironment(
    transactionProvider: TransactionProviderInterface,
    request: {
      agentId: string;
      companyId: string;
      sessionId: string;
    },
  ) {
    void transactionProvider;
    void request;
    const remoteSandbox = await this.getDaytonaClient().create({
      image: "node:20-slim",
      resources: {
        cpu: this.config.daytona.cpu_count,
        disk: this.config.daytona.disk_gb,
        memory: this.config.daytona.memory_gb,
      },
    });

    return {
      cleanup: async () => {
        await remoteSandbox.delete().catch(() => undefined);
      },
      cpuCount: remoteSandbox.cpu || this.config.daytona.cpu_count,
      diskSpaceGb: remoteSandbox.disk || this.config.daytona.disk_gb,
      displayName: null,
      memoryGb: remoteSandbox.memory || this.config.daytona.memory_gb,
      metadata: {},
      platform: "linux" as const,
      providerEnvironmentId: remoteSandbox.id,
    };
  }

  async getEnvironmentStatus(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentStatus> {
    void transactionProvider;

    const remoteSandbox = await this.getDaytonaClient().get(environment.providerEnvironmentId);
    await remoteSandbox.refreshData();

    return this.mapSandboxState(remoteSandbox.state);
  }

  async createShell(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentShellInterface> {
    const remoteSandbox = await this.getDaytonaClient().get(environment.providerEnvironmentId);
    await remoteSandbox.refreshData();
    if (remoteSandbox.state !== "started") {
      await remoteSandbox.start();
      await remoteSandbox.refreshData();
    }

    if (
      remoteSandbox.cpu !== environment.cpuCount
      || remoteSandbox.disk !== environment.diskSpaceGb
      || remoteSandbox.memory !== environment.memoryGb
    ) {
      await this.catalogService.updateEnvironmentResources(transactionProvider, environment.id, {
        cpuCount: remoteSandbox.cpu || environment.cpuCount,
        diskSpaceGb: remoteSandbox.disk || environment.diskSpaceGb,
        memoryGb: remoteSandbox.memory || environment.memoryGb,
        metadata: environment.metadata,
      });
    }

    return new AgentComputeDaytonaShell(remoteSandbox);
  }

  private getDaytonaClient(): Daytona {
    if (this.daytona) {
      return this.daytona;
    }

    this.daytona = new Daytona({
      apiKey: this.config.daytona.api_key,
      apiUrl: this.config.daytona.api_url,
    });

    return this.daytona;
  }

  private mapSandboxState(state: string): AgentEnvironmentStatus {
    switch (state) {
      case "started":
        return "running";
      case "stopped":
        return "stopped";
      case "creating":
      case "pulling":
      case "starting":
      case "pending":
        return "provisioning";
      case "destroying":
      case "deleting":
        return "deleting";
      default:
        return "unhealthy";
    }
  }
}
