import { randomUUID } from "node:crypto";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type {
  AgentComputeCommandInput,
  AgentComputeCommandResult,
  AgentComputePtyOutputPage,
} from "../sandbox_interface.ts";
import { AgentComputeSandboxInterface } from "../sandbox_interface.ts";
import { AgentComputeDaytonaPty } from "./daytona_pty.ts";

type MaterializedDaytonaSandbox = {
  remoteSandbox: {
    process: {
      connectPty(
        sessionId: string,
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
  sandboxRecord: {
    id: string;
    status: string;
  };
};

/**
 * Adapts a lazily materialized Daytona sandbox into the PI Mono tool-definition contract. The
 * sandbox keeps PTY lifecycle and reconnection logic private and publishes only PI Mono tools,
 * allowing the rest of the agent stack to stay independent from Daytona-specific runtime types.
 */
export class AgentComputeDaytonaSandbox extends AgentComputeSandboxInterface {
  private static readonly DEFAULT_EXECUTE_COMMAND_YIELD_MS = 1_000;
  private static readonly DEFAULT_READ_OUTPUT_LIMIT = 200;
  private static readonly executeCommandParameters = Type.Object({
    columns: Type.Optional(Type.Number({
      description: "Optional terminal width to use when creating a new session.",
    })),
    command: Type.String({
      description: "Shell command to execute inside the sandbox.",
    }),
    environment: Type.Optional(Type.Record(
      Type.String(),
      Type.String(),
      {
        description: "Optional environment variables for a newly created session.",
      },
    )),
    rows: Type.Optional(Type.Number({
      description: "Optional terminal height to use when creating a new session.",
    })),
    sessionId: Type.Optional(Type.String({
      description: "Existing sandbox session id to reuse for follow-up commands.",
    })),
    workingDirectory: Type.Optional(Type.String({
      description: "Optional working directory for a newly created session.",
    })),
    yield_time_ms: Type.Optional(Type.Number({
      description: "How long to wait for output before returning control, in milliseconds.",
    })),
  });
  private static readonly sendPtyInputParameters = Type.Object({
    input: Type.String({
      description: "Raw terminal input to write into the running sandbox session.",
    }),
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });
  private static readonly readPtyOutputParameters = Type.Object({
    afterOffset: Type.Optional(Type.Number({
      description: "Read output strictly after this offset. Omit for the first page.",
    })),
    limit: Type.Optional(Type.Number({
      description: "Maximum number of chunks to return.",
    })),
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });
  private static readonly resizePtyParameters = Type.Object({
    columns: Type.Number({
      description: "Target terminal width in columns.",
    }),
    rows: Type.Number({
      description: "Target terminal height in rows.",
    }),
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });
  private static readonly killSessionParameters = Type.Object({
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });
  private static readonly closeSessionParameters = Type.Object({
    sessionId: Type.String({
      description: "Sandbox session id returned by execute_command.",
    }),
  });

  private readonly materializeSandbox: () => Promise<MaterializedDaytonaSandbox>;
  private readonly ptys = new Map<string, AgentComputeDaytonaPty>();
  private materializedSandboxPromise: Promise<MaterializedDaytonaSandbox> | null = null;

  constructor(materializeSandbox: () => Promise<MaterializedDaytonaSandbox>) {
    super();
    this.materializeSandbox = materializeSandbox;
  }

  listTools(): ToolDefinition[] {
    return [
      this.getExecuteCommandTool(),
      this.getSendPtyInputTool(),
      this.getReadPtyOutputTool(),
      this.getResizePtyTool(),
      this.getKillSessionTool(),
      this.getCloseSessionTool(),
    ];
  }

  private getExecuteCommandTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.executeCommandParameters> {
    return {
      description: "Execute a shell command inside the sandbox and return combined terminal output.",
      execute: async (_toolCallId, params) => {
        const result = await this.executeCommand(params);
        return {
          content: [{
            type: "text",
            text: this.formatExecuteCommandResult(result),
          }],
        };
      },
      label: "execute_command",
      name: "execute_command",
      parameters: AgentComputeDaytonaSandbox.executeCommandParameters,
      promptGuidelines: [
        "Use execute_command to start or continue sandbox terminal work.",
        "Reuse the returned sessionId when you need follow-up terminal calls.",
      ],
      promptSnippet: "Execute commands in the sandbox",
    };
  }

  private getSendPtyInputTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.sendPtyInputParameters> {
    return {
      description: "Send additional terminal input to an existing sandbox session.",
      execute: async (_toolCallId, params) => {
        await this.sendPtyInput(params.sessionId, params.input);
        return {
          content: [{
            type: "text",
            text: `Sent input to session ${params.sessionId}.`,
          }],
        };
      },
      label: "send_pty_input",
      name: "send_pty_input",
      parameters: AgentComputeDaytonaSandbox.sendPtyInputParameters,
      promptGuidelines: [
        "Use send_pty_input to interact with a running process after execute_command returns.",
      ],
      promptSnippet: "Send input to a sandbox terminal session",
    };
  }

  private getReadPtyOutputTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.readPtyOutputParameters> {
    return {
      description: "Read paginated terminal output from an existing sandbox session.",
      execute: async (_toolCallId, params) => {
        const outputPage = await this.readPtyOutput(
          params.sessionId,
          params.afterOffset ?? null,
          params.limit ?? AgentComputeDaytonaSandbox.DEFAULT_READ_OUTPUT_LIMIT,
        );
        return {
          content: [{
            type: "text",
            text: this.formatReadPtyOutputResult(params.sessionId, outputPage),
          }],
        };
      },
      label: "read_pty_output",
      name: "read_pty_output",
      parameters: AgentComputeDaytonaSandbox.readPtyOutputParameters,
      promptGuidelines: [
        "Use read_pty_output to continue streaming output from a prior sandbox session.",
      ],
      promptSnippet: "Read sandbox terminal output",
    };
  }

  private getResizePtyTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.resizePtyParameters> {
    return {
      description: "Resize the terminal backing an existing sandbox session.",
      execute: async (_toolCallId, params) => {
        await this.resizePty(params.sessionId, params.columns, params.rows);
        return {
          content: [{
            type: "text",
            text: `Resized session ${params.sessionId} to ${params.columns} columns by ${params.rows} rows.`,
          }],
        };
      },
      label: "resize_pty",
      name: "resize_pty",
      parameters: AgentComputeDaytonaSandbox.resizePtyParameters,
      promptGuidelines: [
        "Resize the session when terminal applications depend on viewport dimensions.",
      ],
      promptSnippet: "Resize a sandbox terminal session",
    };
  }

  private getKillSessionTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.killSessionParameters> {
    return {
      description: "Kill a running sandbox session and its backing process.",
      execute: async (_toolCallId, params) => {
        await this.killSession(params.sessionId);
        return {
          content: [{
            type: "text",
            text: `Killed session ${params.sessionId}.`,
          }],
        };
      },
      label: "kill_session",
      name: "kill_session",
      parameters: AgentComputeDaytonaSandbox.killSessionParameters,
      promptGuidelines: [
        "Use kill_session when a sandbox process is hung or must be terminated immediately.",
      ],
      promptSnippet: "Kill a sandbox terminal session",
    };
  }

  private getCloseSessionTool(): ToolDefinition<typeof AgentComputeDaytonaSandbox.closeSessionParameters> {
    return {
      description: "Close the transport for an existing sandbox session without killing it.",
      execute: async (_toolCallId, params) => {
        await this.closeSession(params.sessionId);
        return {
          content: [{
            type: "text",
            text: `Closed session ${params.sessionId}.`,
          }],
        };
      },
      label: "close_session",
      name: "close_session",
      parameters: AgentComputeDaytonaSandbox.closeSessionParameters,
      promptGuidelines: [
        "Use close_session when you are done with a session but do not need to kill its process.",
      ],
      promptSnippet: "Close a sandbox terminal session",
    };
  }

  private async executeCommand(input: AgentComputeCommandInput): Promise<AgentComputeCommandResult> {
    if (input.command.trim().length === 0) {
      throw new Error("command is required.");
    }

    const terminalSession = input.sessionId
      ? await this.getOrConnectPty(input.sessionId)
      : await this.createPtyInternal({
        columns: input.columns,
        environment: input.environment,
        rows: input.rows,
        workingDirectory: input.workingDirectory,
      });
    const commandExecution = await terminalSession.executeCommand(input.command);
    const shouldWaitForMilliseconds = this.resolveYieldTimeMilliseconds(input);
    const waitResult = await terminalSession.waitForYieldOrCommandExit(commandExecution, shouldWaitForMilliseconds);

    return {
      completed: waitResult.completed,
      exitCode: waitResult.exitCode ?? null,
      output: waitResult.output,
      sessionId: terminalSession.getSessionId(),
    };
  }

  private async sendPtyInput(sessionId: string, input: string): Promise<void> {
    const terminalSession = await this.getOrConnectPty(sessionId);
    await terminalSession.sendInput(input);
  }

  private async readPtyOutput(
    sessionId: string,
    afterOffset: number | null,
    limit: number,
  ): Promise<AgentComputePtyOutputPage> {
    const terminalSession = await this.getOrConnectPty(sessionId);
    return terminalSession.readOutput(afterOffset, limit);
  }

  private async resizePty(sessionId: string, columns: number, rows: number): Promise<void> {
    const terminalSession = await this.getOrConnectPty(sessionId);
    await terminalSession.resize(columns, rows);
  }

  private async killSession(sessionId: string): Promise<void> {
    const terminalSession = await this.getOrConnectPty(sessionId);
    await terminalSession.kill();
    this.ptys.delete(sessionId);
  }

  private async closeSession(sessionId: string): Promise<void> {
    const terminalSession = await this.getOrConnectPty(sessionId);
    await terminalSession.close();
    this.ptys.delete(sessionId);
  }

  private async createPtyInternal(options: {
    columns?: number;
    environment?: Record<string, string>;
    rows?: number;
    workingDirectory?: string;
  }): Promise<AgentComputeDaytonaPty> {
    const materializedSandbox = await this.resolveMaterializedSandbox();
    const sessionId = randomUUID();
    const pty = await AgentComputeDaytonaPty.create(sessionId, (handleOutput) => materializedSandbox.remoteSandbox.process.createPty({
      cols: options.columns,
      cwd: options.workingDirectory,
      envs: options.environment,
      id: sessionId,
      onData: handleOutput,
      rows: options.rows,
    }));
    this.ptys.set(sessionId, pty);
    return pty;
  }

  private async getOrConnectPty(sessionId: string): Promise<AgentComputeDaytonaPty> {
    const existingPty = this.ptys.get(sessionId);
    if (existingPty) {
      return existingPty;
    }

    const materializedSandbox = await this.resolveMaterializedSandbox();
    const connectedPty = await AgentComputeDaytonaPty.create(sessionId, (handleOutput) => materializedSandbox.remoteSandbox.process.connectPty(
      sessionId,
      {
        onData: handleOutput,
      },
    ));
    this.ptys.set(sessionId, connectedPty);

    return connectedPty;
  }

  private resolveMaterializedSandbox(): Promise<MaterializedDaytonaSandbox> {
    if (!this.materializedSandboxPromise) {
      this.materializedSandboxPromise = this.materializeSandbox();
    }

    return this.materializedSandboxPromise;
  }

  private resolveYieldTimeMilliseconds(input: AgentComputeCommandInput): number {
    const configuredYieldTime = input.yield_time_ms;
    if (!Number.isFinite(configuredYieldTime)) {
      return AgentComputeDaytonaSandbox.DEFAULT_EXECUTE_COMMAND_YIELD_MS;
    }

    return Math.max(0, Number(configuredYieldTime));
  }

  private formatExecuteCommandResult(result: AgentComputeCommandResult): string {
    const output = result.output.length > 0 ? result.output : "(no output)";
    return [
      `sessionId: ${result.sessionId}`,
      `completed: ${result.completed}`,
      `exitCode: ${result.exitCode === null ? "null" : result.exitCode}`,
      "output:",
      output,
    ].join("\n");
  }

  private formatReadPtyOutputResult(sessionId: string, outputPage: AgentComputePtyOutputPage): string {
    const combinedOutput = outputPage.chunks.map((chunk) => chunk.text).join("");
    return [
      `sessionId: ${sessionId}`,
      `nextOffset: ${outputPage.nextOffset === null ? "null" : outputPage.nextOffset}`,
      "output:",
      combinedOutput.length > 0 ? combinedOutput : "(no output)",
    ].join("\n");
  }
}
