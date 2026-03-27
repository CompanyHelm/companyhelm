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
        connectPty(
          sessionId_: string,
          options: {
            onData: (data: Uint8Array) => void | Promise<void>;
          },
        ): Promise<{
          disconnect(): Promise<void>;
          kill(): Promise<void>;
          resize(cols: number, rows: number): Promise<unknown>;
          sendInput(data: string | Uint8Array): Promise<void>;
          wait(): Promise<{
            error?: string;
            exitCode?: number;
          }>;
          waitForConnection(): Promise<void>;
        }>;
        createPty(options: {
          cols?: number;
          cwd?: string;
          envs?: Record<string, string>;
          id: string;
          onData: (data: Uint8Array) => void | Promise<void>;
          rows?: number;
        }): Promise<{
          disconnect(): Promise<void>;
          kill(): Promise<void>;
          resize(cols: number, rows: number): Promise<unknown>;
          sendInput(data: string | Uint8Array): Promise<void>;
          wait(): Promise<{
            error?: string;
            exitCode?: number;
          }>;
          waitForConnection(): Promise<void>;
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

    return {
      remoteSandbox,
      sandboxRecord,
    };
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
