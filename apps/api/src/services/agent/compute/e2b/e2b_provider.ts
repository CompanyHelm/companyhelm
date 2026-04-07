import { Sandbox, SandboxNotFoundError } from "e2b";
import { inject, injectable } from "inversify";
import { Config } from "../../../../config/schema.ts";
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
import { AgentComputeE2bShell } from "./e2b_shell.ts";

const E2B_API_BASE_URL = "https://api.e2b.app";
const E2B_SANDBOX_TIMEOUT_MS = 60 * 60 * 1000;

type E2bTemplateBuildRecord = {
  cpuCount: number;
  createdAt: string;
  diskSizeMB?: number;
  memoryMB: number;
  status: "building" | "waiting" | "ready" | "error";
  updatedAt: string;
};

type E2bTemplateWithBuildsRecord = {
  aliases?: string[];
  builds: E2bTemplateBuildRecord[];
  names?: string[];
  templateID: string;
};

type E2bTemplateAliasRecord = {
  templateID: string;
};

/**
 * Bridges the shared compute-provider contract onto E2B sandboxes. The environment services decide
 * when to reuse or provision; this class only translates those operations into E2B lifecycle and
 * command APIs using the selected company-scoped provider definition.
 */
@injectable()
export class AgentComputeE2bProvider extends AgentComputeProviderInterface {
  private readonly catalogService: AgentEnvironmentCatalogService;
  private readonly config: Config;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(
    @inject(Config) config: Config,
    @inject(AgentEnvironmentCatalogService) catalogService: AgentEnvironmentCatalogService,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    super();
    this.config = config;
    this.catalogService = catalogService;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
  }

  getProvider(): "e2b" {
    return "e2b";
  }

  supportsOnDemandProvisioning(): boolean {
    return true;
  }

  async getTemplates(
    transactionProvider: TransactionProviderInterface,
    input: {
      companyId: string;
      providerDefinitionId: string;
    },
  ): Promise<AgentEnvironmentTemplate[]> {
    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      transactionProvider,
      input.companyId,
      input.providerDefinitionId,
    );
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    return Promise.all(this.config.companyhelm.e2b.templates.map(async (configuredTemplate) => {
      const remoteTemplate = await this.resolveTemplateRecord(
        definition.apiKey,
        configuredTemplate.template_id,
      );
      const templateBuild = this.requireReadyTemplateBuild(remoteTemplate, configuredTemplate.template_id);
      if (templateBuild.diskSizeMB === undefined) {
        throw new Error(`Configured E2B template ${configuredTemplate.template_id} is missing disk metadata.`);
      }

      return {
        computerUse: configuredTemplate.computer_use,
        cpuCount: templateBuild.cpuCount,
        diskSpaceGb: this.convertMegabytesToGigabytes(templateBuild.diskSizeMB),
        memoryGb: this.convertMegabytesToGigabytes(templateBuild.memoryMB),
        name: configuredTemplate.name,
        templateId: configuredTemplate.template_id,
      };
    }));
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
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    const remoteTemplate = await this.resolveTemplateRecord(
      definition.apiKey,
      request.template.templateId,
    );
    const sandbox = await Sandbox.create(remoteTemplate.templateID, {
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
        cpuCount: info.cpuCount || request.template.cpuCount,
        diskSpaceGb: request.template.diskSpaceGb,
        displayName: null,
        memoryGb: Math.max(1, Math.ceil(info.memoryMB / 1024)) || request.template.memoryGb,
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

    return new AgentComputeE2bShell(sandbox);
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

  private convertMegabytesToGigabytes(valueInMegabytes: number): number {
    return Math.max(1, Math.ceil(valueInMegabytes / 1024));
  }

  private requireReadyTemplateBuild(
    template: E2bTemplateWithBuildsRecord,
    templateReference: string,
  ): E2bTemplateBuildRecord {
    const readyBuild = [...template.builds]
      .filter((build) => build.status === "ready")
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
    if (!readyBuild) {
      throw new Error(`Configured E2B template ${templateReference} does not have a ready build.`);
    }

    return readyBuild;
  }

  private async resolveTemplateRecord(
    apiKey: string,
    templateReference: string,
  ): Promise<E2bTemplateWithBuildsRecord> {
    for (const candidateReference of this.getTemplateReferenceCandidates(templateReference)) {
      const directTemplate = await this.getTemplate(candidateReference, apiKey);
      if (directTemplate) {
        return directTemplate;
      }

      const aliasedTemplateId = await this.getTemplateIdForAlias(candidateReference, apiKey);
      if (!aliasedTemplateId) {
        continue;
      }

      const aliasedTemplate = await this.getTemplate(aliasedTemplateId, apiKey);
      if (aliasedTemplate) {
        return aliasedTemplate;
      }
    }

    throw new Error(`Configured E2B template ${templateReference} was not found.`);
  }

  private getTemplateReferenceCandidates(templateReference: string): string[] {
    const suffixReference = templateReference.includes("/")
      ? templateReference.split("/").at(-1)
      : undefined;

    return [...new Set([
      templateReference,
      suffixReference,
    ].filter((value): value is string => typeof value === "string" && value.length > 0))];
  }

  private async getTemplate(
    templateReference: string,
    apiKey: string,
  ): Promise<E2bTemplateWithBuildsRecord | null> {
    const response = await fetch(`${E2B_API_BASE_URL}/templates/${encodeURIComponent(templateReference)}`, {
      headers: {
        "User-Agent": "companyhelm-ng",
        "X-API-KEY": apiKey,
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to load E2B template ${templateReference} (${response.status}).`);
    }

    return await response.json() as E2bTemplateWithBuildsRecord;
  }

  private async getTemplateIdForAlias(
    alias: string,
    apiKey: string,
  ): Promise<string | null> {
    const response = await fetch(`${E2B_API_BASE_URL}/templates/aliases/${encodeURIComponent(alias)}`, {
      headers: {
        "User-Agent": "companyhelm-ng",
        "X-API-KEY": apiKey,
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to resolve E2B template alias ${alias} (${response.status}).`);
    }

    const aliasRecord = await response.json() as E2bTemplateAliasRecord;
    return aliasRecord.templateID;
  }
}
