import { Sandbox, SandboxNotFoundError } from "e2b";
import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { ApiLogger } from "../../../../log/api_logger.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import { AgentEnvironmentCatalogService } from "../../environment/catalog_service.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentRecord,
  type AgentEnvironmentStatus,
} from "../provider_interface.ts";
import { AgentEnvironmentShellInterface } from "../shell_interface.ts";
import { AgentComputeE2bShell } from "./e2b_shell.ts";

const E2B_SANDBOX_TIMEOUT_MS = 60 * 60 * 1000;

/**
 * Bridges the shared compute-provider contract onto E2B sandboxes. The environment services decide
 * when to reuse or provision; this class only translates those operations into E2B lifecycle and
 * command APIs using the selected company-scoped provider definition.
 */
@injectable()
export class AgentComputeE2bProvider extends AgentComputeProviderInterface {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly logger: ApiLogger;

  constructor(
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
    @inject(ApiLogger) logger: ApiLogger,
  ) {
    super();
    this.catalogService = catalogService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.logger = logger;
  }

  getProvider(): "e2b" {
    return "e2b";
  }

  supportsOnDemandProvisioning(): boolean {
    return true;
  }

  async provisionEnvironment(
    transactionProvider: TransactionProviderInterface,
    request: {
      agentId: string;
      companyId: string;
      providerDefinitionId: string;
      requirements: {
        minCpuCount: number;
        minDiskSpaceGb: number;
        minMemoryGb: number;
      };
      sessionId: string;
    },
  ) {
    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      request.companyId,
      request.providerDefinitionId,
    );
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    const sandbox = await Sandbox.create({
      apiKey: definition.apiKey,
      lifecycle: {
        autoResume: true,
        onTimeout: "pause",
      },
      metadata: {
        agentId: request.agentId,
        companyId: request.companyId,
        sessionId: request.sessionId,
      },
      timeoutMs: E2B_SANDBOX_TIMEOUT_MS,
    });

    try {
      const info = await sandbox.getInfo();
      return {
        cleanup: async () => {
          await sandbox.kill().catch(() => undefined);
        },
        cpuCount: info.cpuCount || request.requirements.minCpuCount,
        diskSpaceGb: request.requirements.minDiskSpaceGb,
        displayName: null,
        memoryGb: Math.max(1, Math.ceil(info.memoryMB / 1024)) || request.requirements.minMemoryGb,
        metadata: {},
        platform: "linux" as const,
        providerEnvironmentId: sandbox.sandboxId,
      };
    } catch (error) {
      await sandbox.kill().catch(() => undefined);
      throw error;
    }
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
    if (definition.provider !== "e2b") {
      return "unhealthy";
    }

    try {
      const info = await Sandbox.getInfo(environment.providerEnvironmentId, {
        apiKey: definition.apiKey,
      });
      return info.state === "running" ? "running" : "stopped";
    } catch (error) {
      if (this.isMissingEnvironmentError(error)) {
        return "unhealthy";
      }

      throw error;
    }
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
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    try {
      await Sandbox.kill(environment.providerEnvironmentId, {
        apiKey: definition.apiKey,
      });
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
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    await Sandbox.connect(environment.providerEnvironmentId, {
      apiKey: definition.apiKey,
      timeoutMs: E2B_SANDBOX_TIMEOUT_MS,
    });
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
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    await Sandbox.pause(environment.providerEnvironmentId, {
      apiKey: definition.apiKey,
    });
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
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    const sandbox = await Sandbox.connect(environment.providerEnvironmentId, {
      apiKey: definition.apiKey,
      timeoutMs: E2B_SANDBOX_TIMEOUT_MS,
    });
    const info = await sandbox.getInfo();
    const nextMemoryGb = Math.max(1, Math.ceil(info.memoryMB / 1024)) || environment.memoryGb;
    if (environment.cpuCount !== info.cpuCount || environment.memoryGb !== nextMemoryGb) {
      await this.catalogService.updateEnvironmentResources(transactionProvider, environment.id, {
        cpuCount: info.cpuCount || environment.cpuCount,
        diskSpaceGb: environment.diskSpaceGb,
        memoryGb: nextMemoryGb,
        metadata: environment.metadata,
      });
    }

    return new AgentComputeE2bShell(sandbox, this.logger.child({
      component: "agent_compute_e2b_shell",
      provider: "e2b",
      providerEnvironmentId: environment.providerEnvironmentId,
    }));
  }

  private isMissingEnvironmentError(error: unknown): boolean {
    if (error instanceof SandboxNotFoundError) {
      return true;
    }

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
