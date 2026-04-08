import { CommandExitError } from "e2b";
import { Sandbox as DesktopSandbox } from "@e2b/desktop";
import { inject, injectable } from "inversify";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { ComputeProviderDefinitionService } from "../../../compute_provider_definitions/service.ts";
import type { AgentEnvironmentRecord } from "../provider_interface.ts";

const E2B_SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;
const E2B_CONNECT_REQUEST_TIMEOUT_MS = 15_000;
const E2B_DESKTOP_DISPLAY = ":0";
const E2B_DESKTOP_DPI = 96;
const E2B_DESKTOP_RESOLUTION = [1024, 768] as const;

/**
 * Connects to an existing E2B desktop sandbox and ensures the XFCE desktop runtime is usable
 * before provider-specific computer-use tools issue desktop SDK calls against it.
 */
@injectable()
export class AgentComputeE2bDesktopSandboxService {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    this.computeProviderDefinitionService = computeProviderDefinitionService;
  }

  async connect(
    transactionProvider: TransactionProviderInterface,
    environment: AgentEnvironmentRecord,
  ): Promise<DesktopSandbox> {
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

    const sandbox = await DesktopSandbox.connect(environment.providerEnvironmentId, {
      apiKey: definition.apiKey,
      requestTimeoutMs: E2B_CONNECT_REQUEST_TIMEOUT_MS,
      timeoutMs: E2B_SANDBOX_TIMEOUT_MS,
    });
    await this.ensureDesktopRuntimeStarted(sandbox);

    return sandbox;
  }

  /**
   * Reconnected E2B sandboxes can retain filesystem state while their X server or window manager
   * disappears. We repair only the missing desktop pieces so SDK interactions remain reliable.
   */
  private async ensureDesktopRuntimeStarted(sandbox: DesktopSandbox): Promise<void> {
    const display = sandbox.display || E2B_DESKTOP_DISPLAY;
    if (!await this.isDisplayReady(sandbox, display)) {
      await this.startDisplay(sandbox, display);
    }

    if (!await this.isDesktopSessionRunning(sandbox)) {
      await this.startDesktopSession(sandbox, display);
    }
  }

  private async startDisplay(sandbox: DesktopSandbox, display: string): Promise<void> {
    await sandbox.commands.run(
      `Xvfb ${display} -ac -screen 0 ${E2B_DESKTOP_RESOLUTION[0]}x${E2B_DESKTOP_RESOLUTION[1]}x24 -retro -dpi ${E2B_DESKTOP_DPI} -nolisten tcp -nolisten unix`,
      {
        background: true,
        timeoutMs: 0,
      },
    );

    if (!await this.isDisplayReady(sandbox, display, 5)) {
      throw new Error("Could not start Xvfb.");
    }
  }

  private async startDesktopSession(sandbox: DesktopSandbox, display: string): Promise<void> {
    await sandbox.commands.run("startxfce4", {
      background: true,
      envs: {
        DISPLAY: display,
      },
      timeoutMs: 0,
    });

    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      if (await this.isDesktopSessionRunning(sandbox)) {
        return;
      }

      await this.sleep(250);
    }

    throw new Error("Could not start xfce4-session.");
  }

  private async isDisplayReady(
    sandbox: DesktopSandbox,
    display: string,
    timeoutSeconds = 1,
  ): Promise<boolean> {
    return sandbox.waitAndVerify(
      `xdpyinfo -display ${display}`,
      (result) => result.exitCode === 0,
      timeoutSeconds,
      0.25,
    );
  }

  private async isDesktopSessionRunning(sandbox: DesktopSandbox): Promise<boolean> {
    try {
      const result = await sandbox.commands.run(
        "ps -ef | grep -E \"xfce4-session|xfwm4|xfsettingsd\" | grep -v grep",
      );
      return result.stdout.trim().length > 0;
    } catch (error) {
      if (error instanceof CommandExitError) {
        return false;
      }

      throw error;
    }
  }

  private async sleep(durationMs: number): Promise<void> {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, durationMs);
    });
  }
}
