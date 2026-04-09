import type { CommandResult } from "e2b";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentPromptScope } from "../../../../services/environments/prompt_scope.ts";
import { AgentComputeE2bDesktopSandboxService } from "../../../../services/environments/providers/e2b/desktop_sandbox_service.ts";

type WaitAndVerifyInput = {
  command: string;
  expectedExitCode?: number;
  intervalSeconds?: number;
  stderrIncludes?: string[];
  stderrMatchesRegex?: string;
  stdoutIncludes?: string[];
  stdoutMatchesRegex?: string;
  timeoutSeconds?: number;
};

/**
 * Wraps the E2B desktop SDK behind a stable service that tool definitions can share. The service
 * reconnects to the leased sandbox on demand so individual tool implementations stay focused on
 * parameter validation and result formatting.
 */
export class AgentComputeE2bComputerUseToolService {
  private readonly desktopSandboxService: AgentComputeE2bDesktopSandboxService;
  private readonly promptScope: AgentEnvironmentPromptScope;
  private readonly transactionProvider: TransactionProviderInterface;

  constructor(
    transactionProvider: TransactionProviderInterface,
    promptScope: AgentEnvironmentPromptScope,
    desktopSandboxService: AgentComputeE2bDesktopSandboxService,
  ) {
    this.transactionProvider = transactionProvider;
    this.promptScope = promptScope;
    this.desktopSandboxService = desktopSandboxService;
  }

  async doubleClick(x?: number, y?: number): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.doubleClick(x, y);
  }

  async drag(from: [number, number], to: [number, number]): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.drag(from, to);
  }

  async getApplicationWindows(application: string): Promise<string[]> {
    const sandbox = await this.getSandbox();
    return sandbox.getApplicationWindows(application);
  }

  async getCurrentWindowId(): Promise<string> {
    const sandbox = await this.getSandbox();
    return sandbox.getCurrentWindowId();
  }

  async getCursorPosition(): Promise<{ x: number; y: number }> {
    const sandbox = await this.getSandbox();
    return sandbox.getCursorPosition();
  }

  async getScreenSize(): Promise<{ height: number; width: number }> {
    const sandbox = await this.getSandbox();
    return sandbox.getScreenSize();
  }

  async getWindowTitle(windowId: string): Promise<string> {
    const sandbox = await this.getSandbox();
    return sandbox.getWindowTitle(windowId);
  }

  async launch(application: string, uri?: string): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.launch(application, uri);
  }

  async leftClick(x?: number, y?: number): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.leftClick(x, y);
  }

  async middleClick(x?: number, y?: number): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.middleClick(x, y);
  }

  async mousePress(button?: "left" | "middle" | "right"): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.mousePress(button);
  }

  async mouseRelease(button?: "left" | "middle" | "right"): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.mouseRelease(button);
  }

  async moveMouse(x: number, y: number): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.moveMouse(x, y);
  }

  async open(fileOrUrl: string): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.open(fileOrUrl);
  }

  async press(key: string | string[]): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.press(key);
  }

  async rightClick(x?: number, y?: number): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.rightClick(x, y);
  }

  async screenshot(): Promise<{ base64EncodedPng: string; byteLength: number }> {
    const sandbox = await this.getSandbox();
    const bytes = await sandbox.screenshot("bytes");
    return {
      base64EncodedPng: Buffer.from(bytes).toString("base64"),
      byteLength: bytes.byteLength,
    };
  }

  async scroll(direction?: "down" | "up", amount?: number): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.scroll(direction, amount);
  }

  async waitAndVerify(input: WaitAndVerifyInput): Promise<boolean> {
    const sandbox = await this.getSandbox();
    return sandbox.waitAndVerify(
      input.command,
      (result) => this.matchesWaitAndVerifyPredicate(result, input),
      input.timeoutSeconds,
      input.intervalSeconds,
    );
  }

  async write(text: string, options?: { chunkSize?: number; delayInMs?: number }): Promise<void> {
    const sandbox = await this.getSandbox();
    await sandbox.write(text, {
      chunkSize: options?.chunkSize ?? 25,
      delayInMs: options?.delayInMs ?? 75,
    });
  }

  private async getSandbox() {
    const environment = await this.promptScope.getEnvironment();
    return this.desktopSandboxService.connect(
      this.transactionProvider,
      environment.getRecord(),
    );
  }

  private matchesWaitAndVerifyPredicate(result: CommandResult, input: WaitAndVerifyInput): boolean {
    const predicates = [
      typeof input.expectedExitCode === "number",
      (input.stdoutIncludes?.length ?? 0) > 0,
      (input.stderrIncludes?.length ?? 0) > 0,
      typeof input.stdoutMatchesRegex === "string",
      typeof input.stderrMatchesRegex === "string",
    ];

    if (!predicates.some(Boolean)) {
      return result.exitCode === 0;
    }

    if (typeof input.expectedExitCode === "number" && result.exitCode !== input.expectedExitCode) {
      return false;
    }

    if ((input.stdoutIncludes ?? []).some((value) => !result.stdout.includes(value))) {
      return false;
    }

    if ((input.stderrIncludes ?? []).some((value) => !result.stderr.includes(value))) {
      return false;
    }

    if (typeof input.stdoutMatchesRegex === "string" && !new RegExp(input.stdoutMatchesRegex).test(result.stdout)) {
      return false;
    }

    if (typeof input.stderrMatchesRegex === "string" && !new RegExp(input.stderrMatchesRegex).test(result.stderr)) {
      return false;
    }

    return true;
  }
}
