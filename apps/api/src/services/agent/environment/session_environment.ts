import type {
  AgentEnvironmentCommandInput,
  AgentEnvironmentCommandResult,
  AgentEnvironmentInterface,
  AgentEnvironmentTerminalOutputPage,
  AgentEnvironmentTerminalSession,
} from "../compute/environment_interface.ts";
import { AgentEnvironmentInterface as AgentEnvironmentInterfaceClass } from "../compute/environment_interface.ts";
import { AgentEnvironmentRuntimeInterface } from "../compute/runtime_interface.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import { AgentEnvironmentLeaseService } from "./lease_service.ts";

/**
 * Wraps a provider runtime with lease ownership. It keeps the lease alive while a prompt run is
 * active and transitions the lease into warm idle state when the prompt scope is disposed.
 */
export class AgentSessionEnvironment extends AgentEnvironmentInterfaceClass implements AgentEnvironmentInterface {
  private static readonly HEARTBEAT_INTERVAL_MILLISECONDS = 60 * 1000;

  private readonly transactionProvider: TransactionProviderInterface;
  private readonly leaseId: string;
  private readonly leaseOwnerToken: string;
  private readonly leaseService: AgentEnvironmentLeaseService;
  private readonly runtime: AgentEnvironmentRuntimeInterface;
  private readonly heartbeatHandle: ReturnType<typeof setInterval>;
  private disposed = false;

  constructor(
    transactionProvider: TransactionProviderInterface,
    leaseService: AgentEnvironmentLeaseService,
    runtime: AgentEnvironmentRuntimeInterface,
    leaseId: string,
    leaseOwnerToken: string,
  ) {
    super();
    this.transactionProvider = transactionProvider;
    this.leaseId = leaseId;
    this.leaseOwnerToken = leaseOwnerToken;
    this.leaseService = leaseService;
    this.runtime = runtime;
    this.heartbeatHandle = setInterval(() => {
      void this.leaseService.heartbeatLease(this.transactionProvider, this.leaseId, this.leaseOwnerToken)
        .catch(() => undefined);
    }, AgentSessionEnvironment.HEARTBEAT_INTERVAL_MILLISECONDS);
    this.heartbeatHandle.unref?.();
  }

  executeCommand(input: AgentEnvironmentCommandInput): Promise<AgentEnvironmentCommandResult> {
    return this.runtime.executeCommand(input);
  }

  sendInput(sessionId: string, input: string, yieldTimeMilliseconds?: number): Promise<AgentEnvironmentCommandResult> {
    return this.runtime.sendInput(sessionId, input, yieldTimeMilliseconds);
  }

  readOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentEnvironmentTerminalOutputPage> {
    return this.runtime.readOutput(sessionId, afterOffset, limit);
  }

  listSessions(): Promise<AgentEnvironmentTerminalSession[]> {
    return this.runtime.listSessions();
  }

  resizeSession(sessionId: string, columns: number, rows: number): Promise<void> {
    return this.runtime.resizeSession(sessionId, columns, rows);
  }

  killSession(sessionId: string): Promise<void> {
    return this.runtime.killSession(sessionId);
  }

  closeSession(sessionId: string): Promise<void> {
    return this.runtime.closeSession(sessionId);
  }

  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    clearInterval(this.heartbeatHandle);
    try {
      await this.runtime.dispose();
    } finally {
      await this.leaseService.markLeaseIdle(this.transactionProvider, this.leaseId, this.leaseOwnerToken);
    }
  }
}
