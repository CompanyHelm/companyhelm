import { Daytona } from "@daytonaio/sdk";
import { inject, injectable } from "inversify";
import { Config } from "../../../../config/schema.ts";
import type { TransactionProviderInterface } from "../../../../db/transaction_provider_interface.ts";
import {
  AgentEnvironmentService,
  type AgentEnvironmentRecord,
} from "../../environment_service.ts";
import { AgentComputeProviderInterface } from "../provider_interface.ts";
import { AgentComputeDaytonaSandbox } from "./daytona_sandbox.ts";

/**
 * Bridges the generic compute-provider contract onto the Daytona runtime. The provider returns a
 * lazy sandbox handle and only provisions or leases the backing Daytona environment when a sandbox
 * tool is invoked.
 */
@injectable()
export class AgentComputeDaytonaProvider extends AgentComputeProviderInterface {
  private readonly config: Config;
  private readonly agentEnvironmentService: AgentEnvironmentService;
  private daytona?: Daytona;

  constructor(
    @inject(Config) config: Config,
    @inject(AgentEnvironmentService) agentEnvironmentService: AgentEnvironmentService,
  ) {
    super();
    this.config = config;
    this.agentEnvironmentService = agentEnvironmentService;
  }

  async getSandboxForSession(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ) {
    return new AgentComputeDaytonaSandbox(() => this.materializeEnvironment(transactionProvider, agentId, sessionId));
  }

  private async materializeEnvironment(
    transactionProvider: TransactionProviderInterface,
    agentId: string,
    sessionId: string,
  ): Promise<{
    release: () => Promise<void>;
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
    environmentRecord: AgentEnvironmentRecord;
  }> {
    const environmentRecord = await this.agentEnvironmentService.materializeEnvironmentForSession(
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
          providerEnvironmentId: remoteSandbox.id,
          status: "running",
        };
      },
    );

    const remoteSandbox = await this.getDaytonaClient().get(environmentRecord.providerEnvironmentId);
    if (environmentRecord.status !== "running") {
      await remoteSandbox.start();
      await remoteSandbox.refreshData();
      await this.ensureTmuxInstalled(remoteSandbox);

      const updatedEnvironmentRecord = await this.agentEnvironmentService.updateEnvironmentRuntimeState(
        transactionProvider,
        environmentRecord.id,
        {
          cpuCount: remoteSandbox.cpu || environmentRecord.cpuCount,
          diskSpaceGb: remoteSandbox.disk || environmentRecord.diskSpaceGb,
          memoryGb: remoteSandbox.memory || environmentRecord.memoryGb,
          status: "running",
        },
      );

      return {
        release: async () => {
          await this.agentEnvironmentService.releaseEnvironmentForSession(
            transactionProvider,
            updatedEnvironmentRecord.id,
            sessionId,
          );
        },
        environmentRecord: updatedEnvironmentRecord,
        remoteSandbox,
      };
    }

    await this.ensureTmuxInstalled(remoteSandbox);

    return {
      release: async () => {
        await this.agentEnvironmentService.releaseEnvironmentForSession(
          transactionProvider,
          environmentRecord.id,
          sessionId,
        );
      },
      environmentRecord,
      remoteSandbox,
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
