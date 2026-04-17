import { Sandbox } from "e2b";
import { inject, injectable } from "inversify";
import { ComputeProviderDefinitionService } from "../../compute_provider_definitions/service.ts";
import type { TransactionProviderInterface } from "../../../db/transaction_provider_interface.ts";
import type { AgentEnvironmentRecord } from "../providers/provider_interface.ts";
import { EnvironmentE2bTerminalConnection } from "./e2b_terminal_connection.ts";

const E2B_TERMINAL_REQUEST_TIMEOUT_MS = 15_000;
const E2B_TERMINAL_SANDBOX_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * Opens low-latency E2B PTY clients and immediately attaches them to CompanyHelm's named tmux
 * terminal sessions. This keeps the websocket transport separate from durable shell state.
 */
@injectable()
export class EnvironmentE2bTerminalBridge {
  private readonly computeProviderDefinitionService: ComputeProviderDefinitionService;

  constructor(
    @inject(ComputeProviderDefinitionService)
    computeProviderDefinitionService: ComputeProviderDefinitionService,
  ) {
    this.computeProviderDefinitionService = computeProviderDefinitionService;
  }

  async open(input: {
    columns: number;
    environment: AgentEnvironmentRecord;
    onOutput: (output: string) => void;
    rows: number;
    terminalSessionId: string;
    transactionProvider: TransactionProviderInterface;
  }): Promise<EnvironmentE2bTerminalConnection> {
    if (input.environment.provider !== "e2b") {
      throw new Error("Web terminal streaming is only supported for E2B environments.");
    }
    if (!input.environment.providerDefinitionId) {
      throw new Error("Environment provider definition is missing.");
    }

    const definition = await this.computeProviderDefinitionService.loadRuntimeDefinitionById(
      input.transactionProvider,
      input.environment.companyId,
      input.environment.providerDefinitionId,
    );
    if (definition.provider !== "e2b") {
      throw new Error("Compute provider definition does not belong to E2B.");
    }

    const decoder = new TextDecoder();
    const sandbox = await Sandbox.connect(input.environment.providerEnvironmentId, {
      apiKey: definition.apiKey,
      requestTimeoutMs: E2B_TERMINAL_REQUEST_TIMEOUT_MS,
      timeoutMs: E2B_TERMINAL_SANDBOX_TIMEOUT_MS,
    });
    const terminal = await sandbox.pty.create({
      cols: input.columns,
      onData: (data) => {
        const output = decoder.decode(data, { stream: true });
        if (output.length > 0) {
          input.onOutput(output);
        }
      },
      rows: input.rows,
      timeoutMs: 0,
    });
    const connection = new EnvironmentE2bTerminalConnection(sandbox, terminal);
    await connection.attachTmuxSession(input.terminalSessionId);

    return connection;
  }
}
