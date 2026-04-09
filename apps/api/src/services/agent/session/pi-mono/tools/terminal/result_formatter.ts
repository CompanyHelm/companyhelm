import type {
  AgentEnvironmentCommandResult,
  AgentEnvironmentDirectShellCommandResult,
  AgentEnvironmentTerminalOutputPage,
  AgentEnvironmentTerminalSession,
} from "../../../../../environments/providers/environment_interface.ts";

/**
 * Centralizes the text rendering used by the PI Mono tool layer so command, output, and session
 * responses stay consistent across the individual tool classes.
 */
export class AgentTerminalResultFormatter {
  static formatCommandResult(result: AgentEnvironmentCommandResult): string {
    const output = result.output.replace(/(?:\r?\n[ \t]*)+$/u, "");
    return output.length > 0 ? output : "(no output)";
  }

  static formatDirectShellCommandResult(result: AgentEnvironmentDirectShellCommandResult): string {
    const output = result.output.replace(/(?:\r?\n[ \t]*)+$/u, "");
    return output.length > 0 ? output : "(no output)";
  }

  static formatOutputResult(sessionId: string, page: AgentEnvironmentTerminalOutputPage): string {
    const output = page.chunks.map((chunk) => chunk.text).join("");
    return [
      `sessionId: ${sessionId}`,
      `nextOffset: ${page.nextOffset === null ? "null" : page.nextOffset}`,
      "output:",
      output.length > 0 ? output : "(no output)",
    ].join("\n");
  }

  static formatSessionList(sessions: AgentEnvironmentTerminalSession[]): string {
    if (sessions.length === 0) {
      return "No PTY sessions found.";
    }

    return sessions.map((session) => {
      return [
        `sessionId: ${session.id}`,
        `attached: ${session.attached}`,
        `createdAt: ${session.createdAt}`,
        `size: ${session.width}x${session.height}`,
      ].join("\n");
    }).join("\n\n");
  }
}
