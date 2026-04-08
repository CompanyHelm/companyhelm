import { Sandbox as DesktopSandbox } from "@e2b/desktop";
import { CommandExitError, Sandbox as E2bSandbox, SandboxNotFoundError } from "e2b";
import { inject, injectable } from "inversify";
import { E2bTemplateBuild } from "../../../../compute/e2b/template_build.ts";
import { E2bTemplatesManager } from "../../../../compute/e2b/templates_manager.ts";
import { Config } from "../../../../config/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import {
  AgentComputeProviderInterface,
  type AgentEnvironmentTemplate,
  type AgentEnvironmentRecord,
  type AgentEnvironmentStatus,
} from "../provider_interface.ts";
import { AgentEnvironmentShellInterface } from "../shell_interface.ts";
import { AgentComputeE2bShell } from "./e2b_shell.ts";

const E2B_SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;
const E2B_CONNECT_REQUEST_TIMEOUT_MS = 15_000;
const E2B_DESKTOP_DISPLAY = ":0";
const E2B_DESKTOP_DPI = 96;
const E2B_DESKTOP_RESOLUTION = [1024, 768] as const;
const E2B_DESKTOP_STREAM_PORT = 6080;
const E2B_DESKTOP_BOOTSTRAP_TIMEOUT_MS = 10_000;
const E2B_DESKTOP_STREAM_START_TIMEOUT_MS = 10_000;
const E2B_GET_VNC_URL_TIMEOUT_MS = 30_000;

/**
 * Bridges the shared compute-provider contract onto E2B sandboxes. The environment services decide
 * when to reuse or provision; this class only translates those operations into E2B lifecycle and
 * command APIs using the selected company-scoped provider definition.
 */
@injectable()
export class AgentComputeE2bProvider extends AgentComputeProviderInterface {
  private readonly config: Config;
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;
  private readonly templatesManager: E2bTemplatesManager;

  constructor(
    @inject(Config) config: Config,
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    super();
    this.config = config;
    this.computeProviderDefinitionService = computeProviderDefinitionService;
    this.templatesManager = new E2bTemplatesManager();
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

    return this.templatesManager
      .builds()
      .map((build) => build.toEnvironmentTemplate());
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

    const configuredTemplate = this.requireConfiguredTemplate(request.template.templateId);
    const template = configuredTemplate.toEnvironmentTemplate();
    const sandbox = await E2bSandbox.create(
      configuredTemplate.resolveTemplateReference(this.config.companyhelm.e2b.template_prefix),
      {
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
      },
    );

    try {
      const info = await sandbox.getInfo();
      return {
        cleanup: async () => {
          await sandbox.kill().catch(() => undefined);
        },
        cpuCount: info.cpuCount || template.cpuCount,
        diskSpaceGb: template.diskSpaceGb,
        displayName: null,
        memoryGb: Math.max(1, Math.ceil(info.memoryMB / 1024)) || template.memoryGb,
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
      const info = await E2bSandbox.getInfo(environment.providerEnvironmentId, {
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
      await E2bSandbox.kill(environment.providerEnvironmentId, {
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

    await E2bSandbox.connect(environment.providerEnvironmentId, {
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

    await E2bSandbox.pause(environment.providerEnvironmentId, {
      apiKey: definition.apiKey,
    });
  }

  async getVncUrl(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<string> {
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

    return this.withTimeout(
      async () => {
        try {
          const sandbox = await DesktopSandbox.connect(environment.providerEnvironmentId, {
            apiKey: definition.apiKey,
            requestTimeoutMs: E2B_CONNECT_REQUEST_TIMEOUT_MS,
            timeoutMs: E2B_SANDBOX_TIMEOUT_MS,
          });
          await this.ensureDesktopRuntimeStarted(sandbox);

          try {
            await this.withTimeout(
              async () => {
                await sandbox.stream.start();
              },
              E2B_DESKTOP_STREAM_START_TIMEOUT_MS,
              "Timed out starting the desktop stream.",
            );
            return sandbox.stream.getUrl();
          } catch (error) {
            if (error instanceof Error && error.message === "Stream is already running") {
              return this.buildStreamUrl(sandbox);
            }

            throw error;
          }
        } catch (error) {
          if (this.isDesktopBinaryMissingError(error)) {
            throw new Error(
              `Environment ${environment.id} does not support desktop streaming. Rebuild the E2B desktop template and recreate the environment.`,
              {
                cause: error,
              },
            );
          }

          throw error;
        }
      },
      E2B_GET_VNC_URL_TIMEOUT_MS,
      "Timed out waiting for the desktop stream URL.",
    );
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

    const sandbox = await E2bSandbox.connect(environment.providerEnvironmentId, {
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

  /**
   * The E2B desktop SDK only runs its X server bootstrap during create(). Existing environments
   * therefore need an explicit display check so reconnecting to a resumed sandbox still produces
   * a usable desktop before we ask the SDK to expose the VNC stream.
   */
  private async ensureDesktopRuntimeStarted(sandbox: DesktopSandbox): Promise<void> {
    await this.withTimeout(
      async () => {
        const display = sandbox.display || E2B_DESKTOP_DISPLAY;
        const displayReady = await sandbox.waitAndVerify(
          `xdpyinfo -display ${display}`,
          (result) => result.exitCode === 0,
          1,
          0.25,
        );
        if (displayReady) {
          return;
        }

        await (
          sandbox as DesktopSandbox & {
            _start(
              display: string,
              opts?: {
                dpi?: number;
                resolution?: readonly [number, number];
              },
            ): Promise<void>;
          }
        )._start(display, {
          dpi: E2B_DESKTOP_DPI,
          resolution: E2B_DESKTOP_RESOLUTION,
        });
      },
      E2B_DESKTOP_BOOTSTRAP_TIMEOUT_MS,
      "Timed out bootstrapping the desktop runtime.",
    );
  }

  private buildStreamUrl(sandbox: DesktopSandbox): string {
    const url = new URL(`https://${sandbox.getHost(E2B_DESKTOP_STREAM_PORT)}/vnc.html`);
    url.searchParams.set("autoconnect", "true");
    url.searchParams.set("resize", "scale");
    return url.toString();
  }

  private isDesktopBinaryMissingError(error: unknown): boolean {
    return error instanceof CommandExitError && error.result.exitCode === 127;
  }

  private async withTimeout<T>(
    callback: () => Promise<T>,
    timeoutMs: number,
    message: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);

      callback()
        .then((result) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private requireConfiguredTemplate(templateId: string): E2bTemplateBuild {
    const template = this.templatesManager.findBuild(templateId);
    if (!template) {
      throw new Error(`Configured E2B template ${templateId} was not found.`);
    }

    return template;
  }
}
