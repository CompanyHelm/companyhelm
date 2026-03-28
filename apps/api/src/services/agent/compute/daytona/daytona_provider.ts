import { Daytona } from "@daytonaio/sdk";
import { inject, injectable } from "inversify";
import { Config } from "../../../../config/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import {
  AgentSandboxService,
  type AgentSandboxRecord,
} from "../../sandbox_service.ts";
import { AgentComputeProviderInterface } from "../provider_interface.ts";
import { AgentComputeDaytonaSandbox } from "./daytona_sandbox.ts";

/**
 * Bridges the generic compute-provider contract onto the Daytona runtime. The provider returns a
 * lazy sandbox handle and only provisions or leases the backing Daytona sandbox when a sandbox
 * tool is invoked.
 */
@injectable()
export class AgentComputeDaytonaProvider extends AgentComputeProviderInterface {
  private readonly config: Config;
  private readonly agentSandboxService: AgentSandboxService;
  private daytona?: Daytona;

  constructor(
    @inject(Config) config: Config,
    @inject(AgentSandboxService) agentSandboxService: AgentSandboxService,
  ) {
    super();
    this.config = config;
    this.agentSandboxService = agentSandboxService;
  }

  async getSandboxForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ) {
    return new AgentComputeDaytonaSandbox(() => this.materializeSandbox(transactionProvider, agentId, sessionId));
  }

  private async materializeSandbox(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ): Promise<{
    remoteSandbox: {
      process: {
        executeCommand(
          command: string,
          cwd?: string,
          env?: Record<string, string>,
          timeout?: number,
        ): Promise<{
          artifacts?: {
            stdout?: string;
          };
          exitCode: number;
          result: string;
        }>;
      };
    };
    sandboxRecord: AgentSandboxRecord;
  }> {
    const sandboxRecord = await this.agentSandboxService.materializeSandboxForSession(
      transactionProvider,
      sessionId,
      agentId,
      "daytona",
      async () => {
        const remoteSandbox = await this.getDaytonaClient().create({
          image: "node:20-slim",
          resources: {
            cpu: 2,
            disk: 20,
            memory: 4,
          },
        });

        return {
          cleanup: async () => {
            await remoteSandbox.delete().catch(() => undefined);
          },
          cpuCount: remoteSandbox.cpu || 2,
          diskSpaceGb: remoteSandbox.disk || 20,
          memoryGb: remoteSandbox.memory || 4,
          providerSandboxId: remoteSandbox.id,
          status: "running",
        };
      },
    );

    const remoteSandbox = await this.getDaytonaClient().get(sandboxRecord.providerSandboxId);
    if (sandboxRecord.status !== "running") {
      await remoteSandbox.start();
      await remoteSandbox.refreshData();
      await this.ensureTmuxInstalled(remoteSandbox);

      const updatedSandboxRecord = await this.agentSandboxService.updateSandboxRuntimeState(
        transactionProvider,
        sandboxRecord.id,
        {
          cpuCount: remoteSandbox.cpu || sandboxRecord.cpuCount,
          diskSpaceGb: remoteSandbox.disk || sandboxRecord.diskSpaceGb,
          memoryGb: remoteSandbox.memory || sandboxRecord.memoryGb,
          status: "running",
        },
      );

      return {
        remoteSandbox,
        sandboxRecord: updatedSandboxRecord,
      };
    }

    await this.ensureTmuxInstalled(remoteSandbox);

    return {
      remoteSandbox,
      sandboxRecord,
    };
  }

  private async ensureTmuxInstalled(remoteSandbox: {
    process: {
      executeCommand(
        command: string,
        cwd?: string,
        env?: Record<string, string>,
        timeout?: number,
      ): Promise<{
        artifacts?: {
          stdout?: string;
        };
        exitCode: number;
        result: string;
      }>;
    };
  }): Promise<void> {
    const result = await remoteSandbox.process.executeCommand(
      "sh -lc 'command -v tmux >/dev/null 2>&1 || (apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y tmux)'",
      undefined,
      undefined,
      300,
    );
    if (result.exitCode !== 0) {
      const stdout = result.artifacts?.stdout ?? result.result;
      throw new Error(`Failed to prepare tmux in Daytona sandbox: ${stdout}`);
    }
  }

  private getDaytonaClient(): Daytona {
    if (this.daytona) {
      return this.daytona;
    }

    this.daytona = new Daytona({
      apiKey: this.config.daytona.api_key,
    });

    return this.daytona;
  }
}
