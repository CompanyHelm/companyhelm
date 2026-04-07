import { Daytona } from "@daytonaio/sdk";
import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import { AgentEnvironmentCatalogService } from "../../environment/catalog_service.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentTemplate,
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
  private static readonly DEFAULT_TEMPLATE: AgentEnvironmentTemplate = {
    computerUse: false,
    cpuCount: 4,
    diskSpaceGb: 10,
    memoryGb: 8,
    name: "Default",
    templateId: "daytona/default",
  };

  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    super();
    this.catalogService = catalogService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
  }

  getProvider(): "daytona" {
    return "daytona";
  }

  supportsOnDemandProvisioning(): boolean {
    return true;
  }

  async getTemplates(): Promise<AgentEnvironmentTemplate[]> {
    return [AgentComputeDaytonaProvider.DEFAULT_TEMPLATE];
  }

  async provisionEnvironment(
    transactionProvider: TransactionProviderInterface,
    request: {
      agentId: string;
      companyId: string;
      providerDefinitionId: string;
      sessionId: string;
      template: AgentEnvironmentTemplate;
    },
  ) {
    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      request.companyId,
      request.providerDefinitionId,
    );
    if (definition.provider !== "daytona") {
      throw new Error("Compute provider definition does not belong to Daytona.");
    }

    const remoteSandbox = await this.createDaytonaClient(definition.apiKey, definition.apiUrl).create({
      image: "node:20-slim",
      resources: {
        cpu: request.template.cpuCount,
        disk: request.template.diskSpaceGb,
        memory: request.template.memoryGb,
      },
    });

    return {
      cleanup: async () => {
        await remoteSandbox.delete().catch(() => undefined);
      },
      cpuCount: remoteSandbox.cpu || request.template.cpuCount,
      diskSpaceGb: remoteSandbox.disk || request.template.diskSpaceGb,
      displayName: null,
      memoryGb: remoteSandbox.memory || request.template.memoryGb,
      metadata: {},
      platform: "linux" as const,
      providerEnvironmentId: remoteSandbox.id,
    };
  }

  async getEnvironmentStatus(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentStatus> {
    if (!environment.providerDefinitionId) {
      return "unhealthy";
    }

    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      environment.companyId,
      environment.providerDefinitionId,
    );
    if (definition.provider !== "daytona") {
      return "unhealthy";
    }

    const remoteSandbox = await this.createDaytonaClient(definition.apiKey, definition.apiUrl).get(environment.providerEnvironmentId);
    await remoteSandbox.refreshData();

    return this.mapSandboxState(remoteSandbox.state);
  }

  async deleteEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void> {
    if (!environment.providerDefinitionId) {
      return;
    }

    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      environment.companyId,
      environment.providerDefinitionId,
    );
    if (definition.provider !== "daytona") {
      throw new Error("Compute provider definition does not belong to Daytona.");
    }

    try {
      const remoteSandbox = await this.createDaytonaClient(definition.apiKey, definition.apiUrl).get(environment.providerEnvironmentId);
      await remoteSandbox.delete();
    } catch (error) {
      if (this.isMissingEnvironmentError(error)) {
        return;
      }

      throw error;
    }
  }

  async startEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void> {
    if (!environment.providerDefinitionId) {
      throw new Error("Environment provider definition is missing.");
    }

    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      environment.companyId,
      environment.providerDefinitionId,
    );
    if (definition.provider !== "daytona") {
      throw new Error("Compute provider definition does not belong to Daytona.");
    }

    const remoteSandbox = await this.createDaytonaClient(definition.apiKey, definition.apiUrl).get(environment.providerEnvironmentId);
    await remoteSandbox.refreshData();
    if (remoteSandbox.state === "started") {
      return;
    }

    await remoteSandbox.start();
    await remoteSandbox.refreshData();
  }

  async stopEnvironment(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<void> {
    if (!environment.providerDefinitionId) {
      throw new Error("Environment provider definition is missing.");
    }

    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      environment.companyId,
      environment.providerDefinitionId,
    );
    if (definition.provider !== "daytona") {
      throw new Error("Compute provider definition does not belong to Daytona.");
    }

    const remoteSandbox = await this.createDaytonaClient(definition.apiKey, definition.apiUrl).get(environment.providerEnvironmentId);
    await remoteSandbox.refreshData();
    if (remoteSandbox.state === "stopped") {
      return;
    }

    await remoteSandbox.stop();
    await remoteSandbox.refreshData();
  }

  async createShell(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<AgentEnvironmentShellInterface> {
    if (!environment.providerDefinitionId) {
      throw new Error("Environment provider definition is missing.");
    }

    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      environment.companyId,
      environment.providerDefinitionId,
    );
    if (definition.provider !== "daytona") {
      throw new Error("Compute provider definition does not belong to Daytona.");
    }

    const remoteSandbox = await this.createDaytonaClient(definition.apiKey, definition.apiUrl).get(environment.providerEnvironmentId);
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

  private createDaytonaClient(apiKey: string, apiUrl: string): Daytona {
    return new Daytona({
      apiKey,
      apiUrl,
    });
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

  private isMissingEnvironmentError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    const errorRecord = error as {
      code?: number | string;
      message?: string;
      response?: {
        status?: number;
      };
      status?: number;
      statusCode?: number;
    };

    return errorRecord.status === 404
      || errorRecord.statusCode === 404
      || errorRecord.response?.status === 404
      || errorRecord.code === 404
      || errorRecord.code === "404"
      || errorRecord.message?.toLowerCase().includes("not found") === true;
  }
}
