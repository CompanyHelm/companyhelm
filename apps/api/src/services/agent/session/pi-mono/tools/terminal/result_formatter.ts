import type {
  AgentEnvironmentCommandResult,
  AgentEnvironmentDirectShellCommandResult,
  AgentEnvironmentPty,
  AgentEnvironmentTerminalOutputPage,
} from "../../../../../environments/providers/environment_interface.ts";

/**
 * Centralizes the text rendering used by the PI Mono tool layer so command, output, and PTY
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

  static formatOutputResult(ptyId: string, page: AgentEnvironmentTerminalOutputPage): string {
    const output = page.chunks.map((chunk) => chunk.text).join("");
    return [
      `pty_id: ${ptyId}`,
      `nextOffset: ${page.nextOffset === null ? "null" : page.nextOffset}`,
      "output:",
      output.length > 0 ? output : "(no output)",
    ].join("\n");
  }

  static formatPtyList(ptys: AgentEnvironmentPty[]): string {
    if (ptys.length === 0) {
      return "No PTYs found.";
    }

    return ptys.map((pty) => {
      return [
        `pty_id: ${pty.ptyId}`,
        `attached: ${pty.attached}`,
        `createdAt: ${pty.createdAt}`,
        `size: ${pty.width}x${pty.height}`,
      ].join("\n");
    }).join("\n\n");
  }
}
