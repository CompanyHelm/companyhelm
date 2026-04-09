import type {
  AgentEnvironmentCommandInput,
  AgentEnvironmentCommandResult,
  AgentEnvironmentDirectShellCommandInput,
  AgentEnvironmentDirectShellCommandResult,
  AgentEnvironmentInterface,
  AgentEnvironmentTerminalOutputPage,
  AgentEnvironmentTerminalSession,
} from "./providers/environment_interface.ts";
import { AgentEnvironmentInterface as AgentEnvironmentInterfaceClass } from "./providers/environment_interface.ts";
import { AgentEnvironmentPtyInterface } from "./providers/pty_interface.ts";
import type { AgentEnvironmentRecord } from "./providers/provider_interface.ts";
import { AgentEnvironmentShellInterface } from "./providers/shell_interface.ts";
import type { TransactionProviderInterface } from "../../db/transaction_provider_interface.ts";
import { AgentEnvironmentLeaseService } from "./lease_service.ts";
import { SecretService } from "../secrets/service.ts";

/**
 * Wraps one PTY manager with lease ownership. It keeps the lease alive while a prompt run is
 * active and transitions the lease into warm idle state when the prompt scope is disposed.
 */
export class AgentSessionEnvironment extends AgentEnvironmentInterfaceClass implements AgentEnvironmentInterface {
  private static readonly HEARTBEAT_INTERVAL_MILLISECONDS = 60 * 1000;

  private readonly environment: AgentEnvironmentRecord;
  private readonly transactionProvider: TransactionProviderInterface;
  private readonly companyId: string;
  private readonly leaseId: string;
  private readonly leaseOwnerToken: string;
  private readonly leaseService: AgentEnvironmentLeaseService;
  private readonly pty: AgentEnvironmentPtyInterface;
  private readonly shell: AgentEnvironmentShellInterface;
  private readonly secretService: SecretService;
  private readonly sessionId: string;
  private readonly heartbeatHandle: ReturnType<typeof setInterval>;
  private disposed = false;

  constructor(
    transactionProvider: TransactionProviderInterface,
    companyId: string,
    sessionId: string,
    environment: AgentEnvironmentRecord,
    leaseService: AgentEnvironmentLeaseService,
    secretService: SecretService,
    shell: AgentEnvironmentShellInterface,
    pty: AgentEnvironmentPtyInterface,
    leaseId: string,
    leaseOwnerToken: string,
  ) {
    super();
    this.transactionProvider = transactionProvider;
    this.companyId = companyId;
    this.sessionId = sessionId;
    this.environment = environment;
    this.leaseId = leaseId;
    this.leaseOwnerToken = leaseOwnerToken;
    this.leaseService = leaseService;
    this.secretService = secretService;
    this.shell = shell;
    this.pty = pty;
    this.heartbeatHandle = setInterval(() => {
      void this.leaseService.heartbeatLease(this.transactionProvider, this.leaseId, this.leaseOwnerToken)
        .catch(() => undefined);
    }, AgentSessionEnvironment.HEARTBEAT_INTERVAL_MILLISECONDS);
    this.heartbeatHandle.unref?.();
  }

  getRecord(): AgentEnvironmentRecord {
    return this.environment;
  }

  async executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult> {
    const sessionEnvironmentVariables = await this.secretService.resolveSessionEnvironmentVariables(
      this.transactionProvider,
      this.companyId,
      this.sessionId,
    );

    return this.pty.executeCommand({
      ...input,
      environment: {
        ...sessionEnvironmentVariables,
        ...(input.environment ?? {}),
      },
    });
  }

  async executeBashCommand(
    input: AgentEnvironmentDirectShellCommandInput,
  ): Promise<AgentEnvironmentDirectShellCommandResult> {
    const sessionEnvironmentVariables = await this.secretService.resolveSessionEnvironmentVariables(
      this.transactionProvider,
      this.companyId,
      this.sessionId,
    );
    const result = await this.shell.executeCommand(
      AgentSessionEnvironment.buildBashCommand(input.command),
      input.workingDirectory,
      {
        ...sessionEnvironmentVariables,
        ...(input.environment ?? {}),
      },
      input.timeoutSeconds,
    );

    return {
      exitCode: result.exitCode,
      output: result.stdout,
    };
  }

  sendInput(sessionId: string, input: string, yieldTimeMilliseconds?: number): Promise<AgentEnvironmentCommandResult> {
    return this.pty.sendInput(sessionId, input, yieldTimeMilliseconds);
  }

  readOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentEnvironmentTerminalOutputPage> {
    return this.pty.readOutput(sessionId, afterOffset, limit);
  }

  listSessions(): Promise<AgentEnvironmentTerminalSession[]> {
    return this.pty.listSessions();
  }

  resizeSession(sessionId: string, columns: number, rows: number): Promise<void> {
    return this.pty.resizeSession(sessionId, columns, rows);
  }

  killSession(sessionId: string): Promise<void> {
    return this.pty.killSession(sessionId);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    clearInterval(this.heartbeatHandle);
    try {
      await this.pty.dispose();
    } finally {
      await this.leaseService.markLeaseIdle(this.transactionProvider, this.leaseId, this.leaseOwnerToken);
    }
  }

  private static buildBashCommand(command: string): string {
    return `bash -lc ${AgentSessionEnvironment.shellQuote(command)}`;
  }

  private static shellQuote(value: string): string {
    return `'${value.replaceAll("'", `'"'"'`)}'`;
  }
}
